import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__reset")
})
async function login(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Google로 계속하기" }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
}
async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
}

for (const width of [320, 375, 390]) {
  test(`login is above the fold at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto("/")
    const button = page.getByRole("button", { name: "Google로 계속하기" })
    const example = page.getByRole("heading", {
      name: "나의 할 일",
      exact: true,
    })
    const bounds = await button.boundingBox()
    const exampleBounds = await example.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.y + bounds!.height).toBeLessThan(844)
    expect(bounds!.y).toBeLessThan(exampleBounds!.y)
    await noOverflow(page)
    if (width === 390)
      await page.screenshot({
        path: "test-results/mobile-login.png",
        fullPage: true,
      })
  })
}

test("mobile category, fullscreen editor popup, save and all chart dates", async ({
  page,
}) => {
  await login(page)
  await page.screenshot({
    path: "test-results/mobile-todos.png",
    fullPage: true,
  })
  await page.getByRole("button", { name: "메뉴 열기" }).click()
  await page.screenshot({
    path: "test-results/mobile-menu.png",
    fullPage: true,
  })
  await page
    .getByRole("dialog")
    .getByRole("navigation", { name: "카테고리", exact: true })
    .getByRole("link", { name: /업무/ })
    .click()
  await expect(
    page.getByRole("heading", { name: "업무", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "랜덤 할 일 추가", exact: true })
  ).toBeVisible()
  await page.screenshot({
    path: "test-results/mobile-category.png",
    fullPage: true,
  })
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await expect(page).toHaveURL(/editor=new/)
  await expect(page).not.toHaveURL(/[?&]code=/)
  await expect(
    page.getByRole("dialog", { name: "할 일 추가", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "할 일 목록", exact: true })
  ).not.toBeVisible()
  await expect(
    page.getByRole("button", { name: "메뉴 열기" })
  ).not.toBeVisible()
  await expect(
    page.getByRole("heading", { level: 1, name: "할 일 추가", exact: true })
  ).toBeVisible()
  const body = page.frameLocator("iframe.tox-edit-area__iframe").locator("body")
  await body.fill("모바일에서 작성한 할 일")
  await page.screenshot({
    path: "test-results/mobile-editor.png",
    fullPage: false,
  })
  await page.setViewportSize({ width: 390, height: 500 })
  await expect
    .poll(
      async () => (await page.locator(".todo-editor").boundingBox())?.height
    )
    .toBe(500)
  const save = page.getByRole("button", { name: "할 일 추가", exact: true })
  const bounds = await save.boundingBox()
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(500)
  await save.click()
  await expect(page).not.toHaveURL(/editor=/)
  await expect(
    page.getByText("모바일에서 작성한 할 일", { exact: true })
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: "메뉴 열기" }).click()
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "마이페이지", exact: true })
    .click()
  const chart = page.getByRole("region", {
    name: "생성일별 차트, 좌우로 이동할 수 있어요",
  })
  expect(
    await chart.evaluate((node) => node.scrollWidth <= node.clientWidth)
  ).toBe(true)
  await noOverflow(page)
  await page.screenshot({
    path: "test-results/mobile-profile.png",
    fullPage: true,
  })
})

test("browser back and close protect drafts and restore the list", async ({
  page,
}) => {
  await login(page)
  const item = page
    .getByRole("list", { name: "할 일 목록", exact: true })
    .locator(":scope > li")
    .nth(3)
  await item.getByRole("button", { name: "할 일 더보기", exact: true }).click()
  const scroll = await page.evaluate(() => window.scrollY)
  await page.getByRole("menuitem", { name: "내용 수정", exact: true }).click()
  const body = page.frameLocator("iframe.tox-edit-area__iframe").locator("body")
  await body.fill("저장하지 않은 모바일 메모")
  page.once("dialog", (dialog) => dialog.dismiss())
  await page.goBack()
  await expect(page).toHaveURL(/editor=/)
  await expect(body).toHaveText("저장하지 않은 모바일 메모")
  page.once("dialog", (dialog) => dialog.dismiss())
  await page.getByRole("button", { name: "에디터 닫기" }).click()
  await expect(body).toHaveText("저장하지 않은 모바일 메모")
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "목록으로 돌아가기" }).click()
  await expect(page).not.toHaveURL(/editor=/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll)
  await expect(item).toContainText("디자인 레퍼런스 수집")
  await item.getByRole("button", { name: "할 일 더보기", exact: true }).click()
  await page.getByRole("menuitem", { name: "내용 수정", exact: true }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: "할 일 수정" })
  ).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/editor=/)
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
})

test("editor deep links and rich text dialogs work on a small screen", async ({
  page,
}) => {
  await login(page)
  await page.goto("/todo-page?category_id=1&editor=edit:1")
  await expect(
    page.getByRole("heading", { level: 1, name: "할 일 수정" })
  ).toBeVisible()
  await page
    .frameLocator("iframe.tox-edit-area__iframe")
    .locator("body")
    .click()
  await page
    .getByRole("button", { name: "Insert/edit link", exact: true })
    .click()
  const dialog = page.getByRole("dialog", { name: "Insert/Edit Link" })
  await expect(dialog).toBeVisible()
  await dialog
    .getByRole("combobox", { name: "URL", exact: true })
    .fill("https://example.com")
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
  await page.getByRole("button", { name: "에디터 닫기" }).click()
  await expect(page).not.toHaveURL(/editor=/)
  await noOverflow(page)
  await page.goto("/todo-page?category_id=1&editor=child:20")
  await expect(
    page.getByRole("heading", { name: "업무", exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "하위 할 일 추가", exact: true })
  ).not.toBeVisible()
})
