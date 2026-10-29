const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")
function loadSource(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file)
  const module = { exports: {} }
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  })
  const localRequire = name => {
    if (name in mocks) return mocks[name]
    if (name.startsWith("@/")) {
      const target = `src/${name.slice(2)}`
      return loadSource(target.endsWith(".ts") ? target : `${target}.ts`, mocks)
    }
    return require(name)
  }
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports)
  return module.exports
}

test("statistics exclude children, handle empty data and never mutate categories", () => {
  const { getStats, getBreakdown } = loadSource("src/lib/todo.ts")
  assert.deepEqual(getStats([]), { total: 0, complete: 0, pending: 0, percent: 0 })
  const categories = Object.freeze([{ id: 1, name: "업무" }, { id: 2, name: "일상" }])
  const todos = [
    { category_id: 1, checked: true, created_at: "2026-10-28T00:00:00Z", sub_item: [{ checked: true }] },
    { category_id: 1, checked: false, created_at: "2026-10-27T00:00:00Z" },
    { category_id: null, checked: false, created_at: "2026-10-28T00:00:00Z" },
  ]
  assert.deepEqual(getStats(todos), { total: 3, complete: 1, pending: 2, percent: 33.3 })
  const result = getBreakdown(todos, categories)
  assert.deepEqual(result.categories.map(x => [x.label, x.complete, x.pending]), [["업무", 1, 1], ["일상", 0, 0], ["미분류", 0, 1]])
  assert.deepEqual(result.dates.map(x => [x.label, x.total]), [["2026-10-27", 1], ["2026-10-28", 2]])
})

test("profile lookup leaves new members unregistered and propagates lookup errors", async () => {
  let inserts = 0
  let failure = false
  const { userProfileSelector } = loadSource("src/recoil/user/user-selectors.ts", {
    recoil: { selector: options => options },
    "@/supabase/init.ts": { default: { auth: { getSession: async () => ({ data: { session: { user: { id: "user-1", email: "test@example.com", user_metadata: { avatar_url: "avatar.png" } } } } }) } } },
    "@/repository/user/profile.repository": {
      getUserProfile: async () => { if (failure) throw new Error("lookup failed"); return null },
      insertUserProfile: async () => { inserts++ },
    },
  })
  assert.equal(await userProfileSelector.get(), null)
  assert.equal(inserts, 0)
  failure = true
  await assert.rejects(() => userProfileSelector.get(), /lookup failed/)
  assert.equal(inserts, 0)
})

test("registration validates and trims names and waits for the write", async () => {
  let finishInsert
  const insertion = new Promise(resolve => { finishInsert = resolve })
  const writes = []
  const { createUserProfileService } = loadSource("src/service/user/profile.service.ts", {
    "@/repository/user/profile.repository": {
      getUserProfile: async () => null,
      insertUserProfile: (...args) => { writes.push(args); return insertion },
    },
  })
  await assert.rejects(() => createUserProfileService("user-1", "   ", null), /1~60/)
  await assert.rejects(() => createUserProfileService("user-1", "가".repeat(61), null), /1~60/)
  assert.deepEqual(writes, [])
  let resolved = false
  const profile = createUserProfileService("user-1", "  지영  ", "avatar.png").then(value => { resolved = true; return value })
  await new Promise(setImmediate)
  assert.equal(resolved, false)
  finishInsert()
  assert.deepEqual(await profile, { id: "user-1", user_name: "지영", user_image: "avatar.png" })
  assert.deepEqual(writes, [["user-1", "지영", "avatar.png"]])
})

test("registration preserves existing profiles and recovers lost write responses", async () => {
  const saved = { id: "user-1", user_name: "기존 이름", user_image: "existing.png" }
  let existing = saved
  let writes = 0
  let committed = false
  const { createUserProfileService } = loadSource("src/service/user/profile.service.ts", {
    "@/repository/user/profile.repository": {
      getUserProfile: async () => existing,
      insertUserProfile: async () => { writes++; if (committed) existing = saved; throw new Error("response lost") },
    },
  })
  assert.deepEqual(await createUserProfileService("user-1", "새 이름", null), saved)
  assert.equal(writes, 0)
  existing = null
  await assert.rejects(() => createUserProfileService("user-1", "새 이름", null), /response lost/)
  committed = true
  assert.deepEqual(await createUserProfileService("user-1", "새 이름", null), saved)
  assert.equal(writes, 2)
})

test("profile images reject unsupported types and files above 5MB", async () => {
  const { readProfileImage } = loadSource("src/lib/profile-image.ts")
  await assert.rejects(() => readProfileImage({ type: "image/svg+xml", size: 10 }), /5MB/)
  await assert.rejects(() => readProfileImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 }), /5MB/)
})

function loadTodoService(overrides = {}) {
  return loadSource("src/service/todo/todo-item.service.ts", { "@/repository/todo/todo-item.repository": overrides })
}

test("category creation validates its name and returns the saved row for selection", async () => {
  const writes = []
  let fail = false
  const { selectTodoCategoryService } = loadSource("src/service/todo/todo-category.service.ts", {
    "@/repository/todo/todo-category.repository": {
      insertTodoCategory: async category => {
        if (fail) throw new Error("save failed")
        writes.push(category)
        return { id: 73, ...category }
      },
    },
  })
  await assert.rejects(() => selectTodoCategoryService({ name: "  ", user_id: "user-1" }), /1~60/)
  await assert.rejects(() => selectTodoCategoryService({ name: "가".repeat(61), user_id: "user-1" }), /1~60/)
  assert.deepEqual(writes, [])
  assert.deepEqual(await selectTodoCategoryService({ name: "  운동  ", user_id: "user-1" }), { id: 73, name: "운동", user_id: "user-1" })
  assert.deepEqual(writes, [{ name: "운동", user_id: "user-1" }])
  fail = true
  await assert.rejects(() => selectTodoCategoryService({ name: "공부", user_id: "user-1" }), /save failed/)
})

test("checking a parent updates children before the parent; checking the last child completes its parent", async () => {
  const updates = []
  const service = loadTodoService({ updateTodoItem: async (id, value) => updates.push([id, value.checked]), getTodoSubList: async () => [{ id: 2, checked: true, todo_text: "a" }, { id: 3, checked: true, todo_text: "b" }] })
  await service.setTodoCheckedService({ id: 1, sub_item: [{ id: 2 }, { id: 3 }] }, true)
  assert.deepEqual(updates, [[2, true], [3, true], [1, true]])
  updates.length = 0
  await service.setTodoCheckedService({ id: 3, sub_id: 1 }, true)
  assert.deepEqual(updates, [[3, true], [1, true]])
})

test("reordering assigns stable unique ranks without mutating items, and rejects invalid targets", async () => {
  const updates = []
  const service = loadTodoService({ updateTodoItem: async (id, value) => updates.push([id, value.order]) })
  const items = Object.freeze([Object.freeze({ id: 1, order: 0 }), Object.freeze({ id: 2, order: 0 }), Object.freeze({ id: 3, order: 0 })])
  await service.reorderTodoService(items, 1, 3)
  assert.deepEqual(updates, [[2, 0], [3, 1], [1, 2]])
  updates.length = 0
  await service.reorderTodoService(items, 1, 99)
  await service.reorderTodoService(items, 1, 1)
  assert.deepEqual(updates, [])
})

test("failed writes propagate, and deleting a last child does not mark its empty parent complete", async () => {
  const failed = loadTodoService({ updateTodoItem: async () => { throw new Error("network failure") } })
  await assert.rejects(() => failed.setTodoCheckedService({ id: 1 }, true), /network failure/)
  const updates = []
  const service = loadTodoService({ deleteTodoItem: async () => {}, getTodoSubList: async () => [], updateTodoItem: async (id, value) => updates.push([id, value.checked]) })
  await service.removeTodoService({ id: 2, sub_id: 1 })
  assert.deepEqual(updates, [[1, false]])
})

function loadWorkspace(overrides = {}) {
  const slots = []
  let cursor = 0
  const { useWorkspaceData } = loadSource("src/hooks/useWorkspace.ts", {
    react: {
      useState(initial) {
        const index = cursor++
        if (!(index in slots)) slots[index] = initial
        return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value }]
      },
      useRef(initial) {
        const index = cursor++
        if (!(index in slots)) slots[index] = { current: initial }
        return slots[index]
      },
      useCallback: callback => callback,
      useEffect: () => {},
    },
    recoil: { useRecoilValue: () => ({ id: "user-1" }), useRecoilRefresher_UNSTABLE: () => () => {} },
    "react-router-dom": {},
    "@/recoil/user/user-selectors": {},
    "@/service/todo/todo-item.service": { getTodoListService: async () => [], ...overrides },
    "@/service/todo/todo-category.service": { getTodoCategoryListService: async () => [] },
  })
  return () => { cursor = 0; return useWorkspaceData() }
}

test("workspace rejects a duplicate mutation before React rerenders", async () => {
  const render = loadWorkspace()
  const workspace = render()
  let writes = 0
  let finish
  const gate = new Promise(resolve => { finish = resolve })
  const action = async () => { writes++; await gate }
  const first = workspace.mutate(action)
  const duplicate = workspace.mutate(action)
  finish()
  const result = await Promise.all([first, duplicate])
  assert.equal(writes, 1)
  assert.deepEqual(result, [true, false])
  assert.equal(render().busy, false)
})

test("an older workspace read cannot replace a newer snapshot", async () => {
  const responses = []
  const render = loadWorkspace({ getTodoListService: () => new Promise(resolve => responses.push(resolve)) })
  const workspace = render()
  const older = workspace.reload()
  const newer = workspace.reload()
  responses[1]([{ id: 2 }])
  await newer
  responses[0]([{ id: 1 }])
  await older
  assert.deepEqual(render().todos, [{ id: 2 }])
})

test("failed compound mutations reload persisted changes before unlocking the workspace", async () => {
  let saved = []
  const render = loadWorkspace({ getTodoListService: async () => saved })
  const result = await render().mutate(async () => {
    saved = [{ id: 1, checked: true }]
    throw new Error("second write failed")
  })
  assert.equal(result, false)
  assert.deepEqual(render().todos, saved)
  assert.equal(render().busy, false)
  assert.notEqual(render().error, "")
})

test("a failed batch waits for remaining writes and does not update its parent", async () => {
  let finish
  let settled = false
  const writes = []
  const service = loadTodoService({ updateTodoItem: async id => {
    writes.push(id)
    if (id === 2) throw new Error("child write failed")
    await new Promise(resolve => { finish = resolve })
  } })
  const result = service.setTodoCheckedService({ id: 1, sub_item: [{ id: 2 }, { id: 3 }] }, true)
    .then(() => { settled = true }, error => { settled = true; return error })
  await new Promise(setImmediate)
  const settledEarly = settled
  finish()
  assert.match((await result).message, /child write failed/)
  assert.equal(settledEarly, false)
  assert.deepEqual(writes, [2, 3])
})

test("paged reads include every row even when the server caps pages below the request size", async () => {
  const { fetchAllRows } = loadSource("src/repository/query.ts")
  const rows = Array.from({ length: 1205 }, (_, id) => ({ id }))
  const ranges = []
  const result = await fetchAllRows(async (from, to) => {
    ranges.push([from, to])
    return { data: rows.slice(from, Math.min(from + 400, to + 1)) }
  })
  assert.deepEqual(result, rows)
  assert.deepEqual(ranges.map(range => range[0]), [0, 400, 800, 1200, 1205])
  await assert.rejects(() => fetchAllRows(async () => { throw new Error("page failed") }), /page failed/)
  assert.deepEqual(await fetchAllRows(async () => ({ data: [] })), [])
})

test("todo grouping preserves root and child order, ignores orphans and does not mutate rows", async () => {
  const rows = Object.freeze([
    Object.freeze({ id: 3, sub_id: 1, todo_text: "first child" }),
    Object.freeze({ id: 2, sub_id: null, todo_text: "first root" }),
    Object.freeze({ id: 1, sub_id: null, todo_text: "second root" }),
    Object.freeze({ id: 4, sub_id: 1, todo_text: "second child" }),
    Object.freeze({ id: 5, sub_id: 99, todo_text: "orphan" }),
  ])
  const service = loadTodoService({ getTodoList: async () => rows })
  const grouped = await service.getTodoListService("user-1", null)
  assert.deepEqual(grouped.map(item => item.id), [2, 1])
  assert.equal(grouped[0].sub_item, null)
  assert.deepEqual(grouped[1].sub_item.map(item => item.id), [3, 4])
  assert.deepEqual(await loadTodoService({ getTodoList: async () => [] }).getTodoListService("user-1", null), [])
})

test("renaming categories and profiles shares creation validation and preserves image-only updates", async () => {
  const categories = []
  const profiles = []
  const category = loadSource("src/service/todo/todo-category.service.ts", {
    "@/repository/todo/todo-category.repository": { updateTodoCategory: async (...args) => categories.push(args) },
  })
  const profile = loadSource("src/service/user/profile.service.ts", {
    "@/repository/user/profile.repository": { updateUserProfile: async (...args) => profiles.push(args) },
  })
  for (const name of ["   ", "가".repeat(61)]) {
    await assert.rejects(() => category.updateTodoCategoryService(1, { name }), /1~60/)
    await assert.rejects(() => profile.updateUserProfileService("user-1", { user_name: name }), /1~60/)
  }
  await category.updateTodoCategoryService(1, { name: "  운동  " })
  await profile.updateUserProfileService("user-1", { user_name: "  지영  " })
  await profile.updateUserProfileService("user-1", { user_image: "avatar.png" })
  assert.deepEqual(categories, [[1, { name: "운동" }]])
  assert.deepEqual(profiles, [["user-1", { user_name: "지영" }], ["user-1", { user_image: "avatar.png" }]])
})

test("late session reads cannot navigate after logout or landing unmount", async () => {
  for (const scenario of ["signed-out", "unmounted", "valid"]) {
    let effect, finish, changed
    let unsubscribed = 0
    const navigation = []
    const { default: Landing } = loadSource("src/pages/landing/Landing.tsx", {
      react: { useEffect: callback => { effect = callback }, useState: initial => [typeof initial === "function" ? "" : initial, () => {}] },
      "react-router-dom": { useNavigate: () => (...args) => navigation.push(args) },
      "@/assets/images/logo/google-logo.png": { default: "logo.png" },
      "@/components/shared/Brand": { default: "span" },
      "@/components/ui/button": { Button: "button" },
      "@/supabase/auth": {},
      "@/supabase/init": { isSupabaseConfigured: true, default: { auth: {
        getSession: () => new Promise(resolve => { finish = resolve }),
        onAuthStateChange: callback => { changed = callback; return { data: { subscription: { unsubscribe: () => { unsubscribed++ } } } } },
      } } },
    })
    Landing()
    const cleanup = effect()
    if (scenario === "signed-out") changed("SIGNED_OUT", null)
    if (scenario === "unmounted") cleanup()
    finish({ data: { session: { user: { id: "user-1" } } } })
    await new Promise(setImmediate)
    assert.deepEqual(navigation, scenario === "valid" ? [["/todo-page", { replace: true }]] : [])
    if (scenario !== "unmounted") cleanup()
    assert.equal(unsubscribed, 1)
  }
})
