const http = require("node:http")
const user = { id: "11111111-1111-4111-8111-111111111111", email: "demo@example.com", aud: "authenticated", role: "authenticated", user_metadata: { avatar_url: "" } }
let todos, categories, profile, failure, nextId, profileReadFailure
function reset() {
  nextId = 100
  failure = false
  profileReadFailure = false
  profile = { id: user.id, user_name: "지영", user_image: null }
  categories = [{ id: 1, name: "업무" }, { id: 2, name: "공부" }, { id: 3, name: "일상" }].map(item => ({ ...item, user_id: user.id, created_at: "2026-10-22T00:00:00Z" }))
  const labels = ["서비스 화면 구조 정리", "책 20쪽 읽고 메모하기", "주간 회의 내용 정리", "디자인 레퍼런스 수집", "저녁 산책 30분", "React 학습 노트 정리", "공통 컴포넌트 검수", "책상 정리하기"]
  todos = labels.map((label, i) => ({ id: i + 1, user_id: user.id, todo_text: `<p>${label}</p>`, category_id: [1,2,1,1,3,2,1,3][i], checked: [2,5,6].includes(i), order: i, sub_id: null, created_at: `2026-10-${22 + Math.min(i,6)}T00:00:00Z` }))
  todos.push({ ...todos[0], id: 20, sub_id: 1, todo_text: "<p>현재 페이지와 기능 목록 확인</p>", checked: true }, { ...todos[0], id: 21, sub_id: 1, todo_text: "<p>데스크톱 와이어프레임 작성</p>", checked: false })
}
reset()
function token() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now()/1000) + 3600 })}.test-signature`
}
http.createServer(async (req,res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "apikey,authorization,content-type,prefer,x-client-info,accept,range,x-supabase-api-version,accept-profile,content-profile")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
  res.setHeader("Content-Type", "application/json")
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, "http://127.0.0.1:54321")
  const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)) }
  if (url.pathname === "/__reset") { reset(); if (url.searchParams.has("new")) profile = null; send({ ok: true }); return }
  if (url.pathname === "/__profile-read-failure") { profileReadFailure = url.searchParams.get("enabled") !== "0"; send({ ok: true }); return }
  if (url.pathname === "/__fail") { failure = true; send({ ok: true }); return }
  if (url.pathname.endsWith("/authorize")) {
    const redirect = new URL(url.searchParams.get("redirect_to"))
    if (url.searchParams.has("code_challenge")) redirect.searchParams.set("code", "local-test-code")
    else redirect.hash = `access_token=${token()}&refresh_token=test-refresh&expires_in=3600&token_type=bearer`
    res.writeHead(302, { Location: redirect.href }); res.end(); return
  }
  if (url.pathname.endsWith("/user")) { send(user); return }
  if (url.pathname.endsWith("/token")) { send({ access_token: token(), refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer", user }); return }
  if (url.pathname.endsWith("/logout")) { send({}); return }
  if (url.pathname === "/health") { send({ ok:true }); return }
  let raw = ""
  for await (const chunk of req) raw += chunk
  const body = raw ? JSON.parse(raw) : {}
  if (failure && req.method !== "GET") { failure = false; send({ message: "Test network failure", code: "TEST" },500); return }
  const table = url.pathname.split("/").pop()
  if (table === "profiles" && req.method === "GET" && profileReadFailure) { send({ message: "Test profile lookup failure", code: "TEST" },500); return }
  const rows = table === "profiles" ? (profile ? [profile] : []) : table === "todo_category" ? categories : todos
  const selected = rows.filter(row => [...url.searchParams].every(([key,value]) => value.startsWith("in.(") ? value.slice(4,-1).split(",").includes(String(row[key])) : !value.startsWith("eq.") || String(row[key]) === value.slice(3)))
  if (req.method === "GET") {
    if (table === "todo_item") selected.sort((a,b) => a.order-b.order || a.id-b.id)
    send(req.headers.accept?.includes("object") ? selected[0] || null : selected); return
  }
  if (req.method === "POST") {
    if (table === "profiles" && profile) { send({ message: "Profile already exists", code: "23505" },409); return }
    // Keep added items inside the fixture's seven-day chart window.
    const item = { id: nextId++, checked: false, order: nextId, created_at: "2026-10-28T12:00:00Z", ...body }
    if (table === "profiles") profile = item
    else rows.push(item)
    if (req.headers.prefer?.includes("return=representation")) { send(req.headers.accept?.includes("object") ? item : [item]); return }
  }
  if (req.method === "PATCH") selected.forEach(row => Object.assign(row,body))
  if (req.method === "DELETE") { if (table === "todo_item") todos=todos.filter(row=>!selected.includes(row)); if (table === "todo_category") categories=categories.filter(row=>!selected.includes(row)) }
  send({})
}).listen(54321,"127.0.0.1",()=>console.log("Local test Supabase ready"))
