const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const path = require("node:path")
const test = require("node:test")
const ts = require("typescript")

// Load the existing TypeScript with small boundary mocks, without another test dependency.
function loadSource(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file)
  const module = { exports: {} }
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const localRequire = (name) => {
    if (name in mocks) return mocks[name]
    if (name.endsWith(".scss")) return {}
    if (name.startsWith("@/")) {
      const target = `src/${name.slice(2)}`
      return loadSource(target.endsWith(".ts") ? target : `${target}.ts`, mocks)
    }
    return require(name)
  }
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports)
  return module.exports
}

test("category statistics count each category without changing the category list", async () => {
  const { categoryTodoListOptionsService } = loadSource("src/service/chart/chart.service.ts")
  const categories = Object.freeze([{ id: 1, name: "업무" }, { id: 2, name: "생활" }])
  const result = await categoryTodoListOptionsService([
    { category_id: 1, checked: true },
    { category_id: 1, checked: false },
    { category_id: 2, checked: false },
  ], categories)
  assert.deepEqual(result.xAxis.categories, ["업무", "생활"])
  assert.deepEqual(result.series.map((series) => series.data), [[1, 0], [1, 1]])
})

test("a new user's profile waits for insertion and is immediately available", async () => {
  let finishInsert
  let resolved = false
  const insertion = new Promise((resolve) => { finishInsert = resolve })
  const { userProfileSelector } = loadSource("src/recoil/user/user-selectors.ts", {
    recoil: { selector: (options) => options },
    "@/supabase/init.ts": { default: { auth: { getSession: async () => ({
      data: { session: { user: { id: "user-1", email: "test@example.com", user_metadata: { avatar_url: "avatar.png" } } } },
    }) } } },
    "@/repository/user/profile.repository": {
      getUserProfile: async () => null,
      insertUserProfile: () => insertion,
    },
  })
  const profile = userProfileSelector.get().then((value) => { resolved = true; return value })
  await new Promise(setImmediate)
  assert.equal(resolved, false)
  finishInsert()
  assert.deepEqual(await profile, { id: "user-1", user_name: "test@example.com", user_image: "avatar.png" })
})

test("category input rejects blank values, clears after button/Enter, and preserves Korean composition", () => {
  const states = []
  let cursor = 0
  const submissions = []
  const { default: TodoInput } = loadSource("src/components/input/TodoInput/TodoInput.tsx", {
    react: { useState: (initial) => {
      const index = cursor++
      if (!(index in states)) states[index] = initial
      return [states[index], (value) => { states[index] = value }]
    } },
    "@/components/input/DefaultInput/DefaultInput.tsx": { default: "input" },
    "@/components/button/DefaultButton/DefaultButton.tsx": { default: "button" },
  })
  function render() {
    cursor = 0
    const tree = TodoInput({ buttonText: "추가", setTodoItemValue: (value) => submissions.push(value) })
    return { input: tree.props.children[0].props.children.props, button: tree.props.children[1].props }
  }
  render().input.changeInput({ target: { value: "   " } })
  render().button.onClickButton()
  assert.equal(render().input.isWrong, true)
  assert.deepEqual(submissions, [])
  render().input.changeInput({ target: { value: "업무" } })
  render().button.onClickButton()
  assert.equal(render().input.inputValue, "")
  assert.equal(render().input.isWrong, false)
  render().input.changeInput({ target: { value: "생활" } })
  render().input.enterInput({ code: "Enter", nativeEvent: { isComposing: true } })
  assert.deepEqual(submissions, ["업무"])
  render().input.enterInput({ code: "Enter", nativeEvent: { isComposing: false } })
  assert.deepEqual(submissions, ["업무", "생활"])
  assert.equal(render().input.inputValue, "")
})

test("dragging from the handle swaps orders when released on a nested target", async () => {
  const todos = [{ id: 1, order: 10 }, { id: 2, order: 20 }]
  const updates = []
  const listeners = new Map()
  const classes = new Set()
  const element = {
    offsetTop: 0, style: {},
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
  }
  const previousDocument = global.document
  global.document = {
    getElementById: () => element,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  }
  try {
    const { useTodoList } = loadSource("src/hooks/todo/useTodoList.ts", {
      react: { useState: (initial) => [Array.isArray(initial) ? todos : initial, () => {}], useCallback: (fn) => fn, useEffect: () => {} },
      "react-router-dom": { useSearchParams: () => [new URLSearchParams()] },
      recoil: { useRecoilValue: () => ({ id: "user-1" }) },
      "@/recoil/user/user-selectors.ts": { userProfileSelector: {} },
      "@/service/todo/todo-item.service": {
        updateTodoItemService: async (id, item) => updates.push([id, item.order]),
        getTodoListService: async () => todos,
      },
    })
    const hook = useTodoList()
    hook.dragStartTodoItem({ preventDefault() {}, clientY: 100 }, todos[0])
    listeners.get("mousemove")({ clientY: 120 })
    assert.equal(element.style.top, "20px")
    assert.equal(classes.has("dragging"), true)
    await listeners.get("mouseup")({ target: { closest: () => ({ dataset: { id: "2" } }) } })
    assert.deepEqual(updates, [[2, 10], [1, 20]])
    assert.equal(listeners.size, 0)
    assert.equal(classes.has("dragging"), false)
    assert.equal(element.style.top, "0px")
  } finally {
    global.document = previousDocument
  }
})
