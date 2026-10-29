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
