import { expect, test, type Page } from "@playwright/test"

const api = "http://127.0.0.1:54321"
test.beforeEach(async ({ request }) => {
  await request.post(`${api}/__reset`)
})
async function login(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Google로 계속하기" }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
}
async function chooseCategory(page: Page, name: string) {
  await page.getByRole("button", { name: /^카테고리 선택:/ }).click()
  await page.getByRole("menuitemradio", { name, exact: true }).click()
  await expect(
    page.getByRole("button", { name: `카테고리 선택: ${name}`, exact: true })
  ).toBeVisible()
}

test("choose a category or uncategorized in the editor and protect category-only drafts", async ({
  page,
  request,
}) => {
  await login(page)
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await chooseCategory(page, "공부")
  page.once("dialog", (dialog) => dialog.dismiss())
  await page.getByRole("button", { name: "에디터 닫기" }).click()
  await expect(
    page.getByRole("dialog", { name: "할 일 추가", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "카테고리 선택: 공부", exact: true })
  ).toBeVisible()
  const body = page.frameLocator("iframe.tox-edit-area__iframe").locator("body")
  await body.fill("카테고리를 선택한 할 일")
  await page
    .getByRole("dialog", { name: "할 일 추가", exact: true })
    .getByRole("button", { name: "할 일 추가", exact: true })
    .click()
  let rows = await (await request.get(`${api}/rest/v1/todo_item`)).json()
  expect(
    rows.find((row: { todo_text: string }) =>
      row.todo_text.includes("카테고리를 선택한 할 일")
    ).category_id
  ).toBe(2)
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await chooseCategory(page, "업무")
  await chooseCategory(page, "미분류")
  await body.fill("분류하지 않은 할 일")
  await page
    .getByRole("dialog", { name: "할 일 추가", exact: true })
    .getByRole("button", { name: "할 일 추가", exact: true })
    .click()
  await expect(
    page.getByText("분류하지 않은 할 일", { exact: true })
  ).toBeVisible()
  rows = await (await request.get(`${api}/rest/v1/todo_item`)).json()
  expect(
    rows.find((row: { todo_text: string }) =>
      row.todo_text.includes("분류하지 않은 할 일")
    ).category_id
  ).toBeNull()
})

test("create a category inside the editor, retry failures and keep the todo draft", async ({
  page,
  request,
}) => {
  await login(page)
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  const body = page.frameLocator("iframe.tox-edit-area__iframe").locator("body")
  await body.fill("새 카테고리와 함께 저장할 메모")
  await page.getByRole("button", { name: "새 카테고리", exact: true }).click()
  const dialog = page.getByRole("dialog", {
    name: "카테고리 추가",
    exact: true,
  })
  await dialog.getByRole("button", { name: "추가", exact: true }).click()
  await expect(page.getByText("카테고리 이름을 입력해 주세요.")).toBeVisible()
  await dialog
    .getByRole("textbox", { name: "카테고리 이름", exact: true })
    .fill("  운동  ")
  await request.post(`${api}/__fail`)
  await dialog.getByRole("button", { name: "추가", exact: true }).click()
  await expect(
    dialog.getByText("저장하지 못했어요. 다시 시도해 주세요.")
  ).toBeVisible()
  await expect(
    dialog.getByRole("textbox", { name: "카테고리 이름", exact: true })
  ).toHaveValue("  운동  ")
  await dialog.getByRole("button", { name: "추가", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "카테고리 선택: 운동", exact: true })
  ).toBeVisible()
  await expect(body).toHaveText("새 카테고리와 함께 저장할 메모")
  await expect(
    page.getByRole("button", { name: "새 카테고리", exact: true })
  ).toBeFocused()
  await page.screenshot({ path: "test-results/editor-category-desktop.png" })
  await page
    .getByRole("dialog", { name: "할 일 추가", exact: true })
    .getByRole("button", { name: "할 일 추가", exact: true })
    .click()
  await expect(
    page.getByText("새 카테고리와 함께 저장할 메모", { exact: true })
  ).toBeVisible()
  const categories = await (
    await request.get(`${api}/rest/v1/todo_category`)
  ).json()
  const created = categories.filter(
    (category: { name: string }) => category.name === "운동"
  )
  expect(created).toHaveLength(1)
  const rows = await (await request.get(`${api}/rest/v1/todo_item`)).json()
  expect(
    rows.find((row: { todo_text: string }) =>
      row.todo_text.includes("새 카테고리와 함께 저장할 메모")
    ).category_id
  ).toBe(created[0].id)
})

test("category pages preselect their category and children inherit their parent category", async ({
  page,
  request,
}) => {
  await login(page)
  await page.goto("/todo-page?category_id=1&editor=new")
  await expect(
    page.getByRole("button", { name: "카테고리 선택: 업무", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "에디터 닫기" }).click()
  await page.goto("/todo-page?category_id=1&editor=child:1")
  const popup = page.getByRole("dialog", {
    name: "하위 할 일 추가",
    exact: true,
  })
  await expect(popup.getByText("업무", { exact: true })).toBeVisible()
  await expect(
    popup.getByText("하위 할 일은 상위 할 일의 카테고리를 따라요.")
  ).toBeVisible()
  await expect(
    popup.getByRole("button", { name: /^카테고리 선택:/ })
  ).toHaveCount(0)
  await page
    .frameLocator("iframe.tox-edit-area__iframe")
    .locator("body")
    .fill("카테고리를 상속한 하위 할 일")
  await popup.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await expect(
    page.getByText("카테고리를 상속한 하위 할 일", { exact: true })
  ).toBeVisible()
  const rows = await (await request.get(`${api}/rest/v1/todo_item`)).json()
  expect(
    rows.find((row: { todo_text: string }) =>
      row.todo_text.includes("카테고리를 상속한 하위 할 일")
    )
  ).toMatchObject({ category_id: 1, sub_id: 1 })
})

test("mobile users can create and select a first category without leaving the editor", async ({
  page,
  request,
}) => {
  for (const id of [1, 2, 3])
    await request.delete(`${api}/rest/v1/todo_category?id=eq.${id}`)
  await page.setViewportSize({ width: 320, height: 844 })
  await login(page)
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await expect(
    page.getByText(
      "카테고리가 없어요. 새 카테고리를 추가하거나 미분류로 저장할 수 있어요."
    )
  ).toBeVisible()
  await page.getByRole("button", { name: "새 카테고리", exact: true }).click()
  const dialog = page.getByRole("dialog", {
    name: "카테고리 추가",
    exact: true,
  })
  await dialog
    .getByRole("textbox", { name: "카테고리 이름", exact: true })
    .fill("모바일 카테고리")
  await page.screenshot({
    path: "test-results/editor-category-create-mobile.png",
  })
  await dialog.getByRole("button", { name: "추가", exact: true }).click()
  await expect(
    page.getByRole("button", {
      name: "카테고리 선택: 모바일 카테고리",
      exact: true,
    })
  ).toBeVisible()
  await chooseCategory(page, "미분류")
  await chooseCategory(page, "모바일 카테고리")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await page.screenshot({ path: "test-results/editor-category-mobile.png" })
  await page
    .frameLocator("iframe.tox-edit-area__iframe")
    .locator("body")
    .fill("모바일 카테고리 메모")
  await page
    .getByRole("dialog", { name: "할 일 추가", exact: true })
    .getByRole("button", { name: "할 일 추가", exact: true })
    .click()
  await expect(
    page.getByText("모바일 카테고리 메모", { exact: true })
  ).toBeVisible()
})
