import { expect, test } from "@playwright/test"
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:54321/__reset")
})
async function login(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Google로 계속하기" }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
  await expect(page.getByText("상위 할 일 8개 · 하위 할 일 2개")).toBeVisible()
}

test("Google-only login and desktop design", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" })
  ).toBeVisible()
  await expect(page.getByRole("textbox")).toHaveCount(0)
  await expect(page.getByText("회원가입")).toHaveCount(0)
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  })
  await login(page)
  await page.screenshot({
    path: "test-results/todos-desktop.png",
    fullPage: true,
  })
})

test("editor popup keeps the list width, traps focus and protects drafts on Escape and outside click", async ({
  page,
}) => {
  await login(page)
  const trigger = page.getByRole("button", { name: "할 일 추가", exact: true })
  const listWidth = (await page.locator(".todo-list").boundingBox())!.width
  await trigger.click()
  const popup = page.getByRole("dialog", { name: "할 일 추가", exact: true })
  await expect(popup).toBeVisible()
  expect((await page.locator(".todo-list").boundingBox())!.width).toBe(
    listWidth
  )
  await expect(
    popup.getByRole("heading", { name: "할 일 추가", exact: true })
  ).toBeFocused()
  await popup.getByRole("button", { name: "할 일 추가", exact: true }).focus()
  await page.keyboard.press("Tab")
  await expect(popup.getByRole("button", { name: "에디터 닫기" })).toBeFocused()
  await page.screenshot({
    path: "test-results/editor-popup-desktop.png",
    fullPage: false,
  })
  const body = page.frameLocator("iframe.tox-edit-area__iframe").locator("body")
  await body.fill("팝업에서 작성한 할 일")
  let confirmations = 0
  page.on("dialog", async (dialog) => {
    confirmations++
    await dialog.dismiss()
  })
  await page.keyboard.press("Escape")
  await expect.poll(() => confirmations).toBe(1)
  await expect(popup).toBeVisible()
  await expect(body).toHaveText("팝업에서 작성한 할 일")
  await page.mouse.click(12, 12)
  await expect.poll(() => confirmations).toBe(2)
  await expect(popup).toBeVisible()
  await page
    .getByRole("button", { name: "Insert/edit link", exact: true })
    .click()
  const link = page.getByRole("dialog", { name: "Insert/Edit Link" })
  await expect(link).toBeVisible()
  await expect(link).toBeInViewport()
  await page.screenshot({ path: "test-results/editor-popup-link.png" })
  await link
    .getByRole("combobox", { name: "URL", exact: true })
    .fill("https://example.com")
  await page.keyboard.press("Escape")
  await expect(link).toHaveCount(0)
  await expect(popup).toBeVisible()
  await popup.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await expect(popup).toHaveCount(0)
  await expect(
    page.getByText("팝업에서 작성한 할 일", { exact: true })
  ).toBeVisible()
  await expect(trigger).toBeFocused()
})

test("category, rich editor, retry, nested completion, reorder and deletion", async ({
  page,
  request,
}) => {
  await login(page)
  await page
    .getByRole("navigation", { name: "카테고리", exact: true })
    .getByRole("link", { name: /업무/ })
    .click()
  await expect(
    page.getByRole("heading", { name: "업무", exact: true })
  ).toBeVisible()
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  const editor = page
    .frameLocator("iframe.tox-edit-area__iframe")
    .locator("body")
  await editor.fill("새로운 할 일")
  await request.post("http://127.0.0.1:54321/__fail")
  await page
    .getByRole("button", { name: "할 일 추가", exact: true })
    .last()
    .click()
  await expect(
    page.getByText("저장하지 못했어요. 작성한 내용은 유지되어 있어요.")
  ).toBeVisible()
  await expect(editor).toHaveText("새로운 할 일")
  await page
    .getByRole("button", { name: "할 일 추가", exact: true })
    .last()
    .click()
  await expect(page.getByText("새로운 할 일", { exact: true })).toBeVisible()
  const parent = page
    .getByRole("listitem")
    .filter({ has: page.getByText("새로운 할 일", { exact: true }) })
    .last()
  await parent.getByRole("button", { name: "할 일 더보기" }).click()
  await page.getByRole("menuitem", { name: "하위 할 일 추가" }).click()
  await editor.fill("세부 작업")
  await page
    .getByRole("button", { name: "할 일 추가", exact: true })
    .last()
    .click()
  await expect(page.getByText("세부 작업", { exact: true })).toBeVisible()
  await parent.getByRole("checkbox").last().click()
  await expect(parent.getByRole("checkbox").last()).toBeChecked()
  await expect(parent.getByRole("checkbox").first()).toBeChecked()
  await parent.getByRole("button", { name: "할 일 더보기" }).first().click()
  await page.getByRole("menuitem", { name: "위로 이동" }).click()
  await expect(page.getByText("새로운 할 일", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "수정", exact: true }).first().click()
  await expect(page.getByRole("heading", { name: "할 일 수정" })).toBeVisible()
  await page.screenshot({
    path: "test-results/editor-desktop.png",
    fullPage: true,
  })
  await page.getByRole("button", { name: "에디터 닫기" }).click()
  await parent.getByRole("button", { name: "할 일 더보기" }).first().click()
  await page.getByRole("menuitem", { name: "삭제", exact: true }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click()
  await expect(page.getByText("새로운 할 일", { exact: true })).toHaveCount(0)
  await expect(page.getByText("세부 작업", { exact: true })).toHaveCount(0)
})

test("category validation, profile and statistics", async ({ page }) => {
  await login(page)
  await page.getByRole("button", { name: "카테고리 추가", exact: true }).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "추가", exact: true })
    .click()
  await expect(page.getByText("카테고리 이름을 입력해 주세요.")).toBeVisible()
  await page.getByLabel("카테고리 이름", { exact: true }).fill("새 카테고리")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "추가", exact: true })
    .click()
  await expect(page.getByRole("link", { name: /새 카테고리/ })).toBeVisible()
  await page.getByRole("link", { name: /새 카테고리/ }).click()
  await page.getByRole("button", { name: "카테고리 삭제", exact: true }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click()
  await expect(page.getByRole("link", { name: /새 카테고리/ })).toHaveCount(0)
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "마이페이지", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "나의 기록" })).toBeVisible()
  await expect(page.getByText("37.5%", { exact: true })).toBeVisible()
  await page.screenshot({
    path: "test-results/profile-desktop.png",
    fullPage: true,
  })
  await page.getByRole("button", { name: "이름 수정", exact: true }).click()
  await page.getByLabel("이름", { exact: true }).fill("새 이름")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "변경 저장" })
    .click()
  await expect(
    page.getByRole("heading", { name: "새 이름", exact: true })
  ).toBeVisible()
  const fileInput = page.getByLabel("프로필 이미지 선택", { exact: true })
  await fileInput.setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  })
  await expect(
    page.getByText("5MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.")
  ).toBeVisible()
  await fileInput.setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1kAAAAASUVORK5CYII=",
      "base64"
    ),
  })
  await expect(
    page.getByRole("region", { name: "프로필" }).locator("img")
  ).toHaveAttribute("src", /^data:image\/png/)
})

test("mobile navigation, keyboard controls and protected routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/my-page")
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" })
  ).toBeVisible()
  await login(page)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.getByRole("button", { name: "메뉴 열기" }).click()
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "마이페이지", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "나의 기록" })).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true)
  await page.screenshot({
    path: "test-results/mobile-profile.png",
    fullPage: true,
  })
})

test("drag and keyboard ordering persist, unsafe HTML is stripped, and logout protects data", async ({
  page,
  request,
}) => {
  await login(page)
  const list = page.getByRole("list", { name: "할 일 목록", exact: true })
  const items = list.locator(":scope > li")
  await items.first().getByTitle("끌어서 순서 변경").dragTo(items.nth(1))
  await expect(items.first()).toContainText("책 20쪽 읽고 메모하기")
  await page.reload()
  await expect(items.first()).toContainText("책 20쪽 읽고 메모하기")
  await items.first().getByRole("button", { name: "할 일 더보기" }).focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("menuitem", { name: "아래로 이동" })
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await request.post("http://127.0.0.1:54321/rest/v1/todo_item", {
    data: {
      user_id: "11111111-1111-4111-8111-111111111111",
      todo_text:
        '<p>안전한 내용</p><img src="x" onerror="alert(1)"><script>alert(2)</script>',
    },
  })
  await page.reload()
  const unsafe = items.filter({
    has: page.getByText("안전한 내용", { exact: true }),
  })
  await expect(unsafe).toBeVisible()
  await expect(unsafe.locator("script, [onerror]")).toHaveCount(0)
  await page.getByRole("button", { name: "로그아웃", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" })
  ).toBeVisible()
  await page.goto("/todo-page")
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" })
  ).toBeVisible()
})

test("category deletion also removes older children without a category", async ({
  page,
  request,
}) => {
  await login(page)
  await request.post("http://127.0.0.1:54321/rest/v1/todo_item", {
    data: {
      todo_text: "이전 하위 항목",
      sub_id: 1,
      category_id: null,
      user_id: "11111111-1111-4111-8111-111111111111",
    },
  })
  await page.reload()
  await page
    .getByRole("navigation", { name: "카테고리", exact: true })
    .getByRole("link", { name: /업무/ })
    .click()
  await expect(page.getByText("이전 하위 항목", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "카테고리 삭제", exact: true }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "삭제", exact: true })
    .click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
  const remaining = await request.get(
    "http://127.0.0.1:54321/rest/v1/todo_item?sub_id=eq.1"
  )
  expect(await remaining.json()).toEqual([])
})
