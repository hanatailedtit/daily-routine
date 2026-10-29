import { expect, test, type Page } from "@playwright/test"

const api = "http://127.0.0.1:54321"
const userId = "11111111-1111-4111-8111-111111111111"
const image =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1kAAAAASUVORK5CYII="

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

test("Tiptap preserves formatting, links, images, tables and HTML storage", async ({
  page,
  request,
}) => {
  await login(page)
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  const popup = page.getByRole("dialog", { name: "할 일 추가", exact: true })
  const body = popup.getByRole("textbox", { name: "할 일 내용", exact: true })
  await body.fill("Tiptap으로 작성한 메모")
  await body.selectText()
  await popup.getByRole("button", { name: "굵게", exact: true }).click()
  await expect(body.locator("strong")).toHaveText("Tiptap으로 작성한 메모")
  await popup.getByRole("button", { name: "링크 편집", exact: true }).click()
  const link = page.getByRole("dialog", { name: "링크 편집", exact: true })
  await link
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("javascript:alert(1)")
  await link.getByRole("button", { name: "적용", exact: true }).click()
  await expect(link.getByRole("alert")).toBeVisible()
  await link
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("https://example.com")
  await link.getByRole("button", { name: "적용", exact: true }).click()
  await expect(body.locator("a")).toHaveAttribute("href", "https://example.com")
  await body.press("ArrowRight")
  await body.press("Enter")
  await expect(body).toContainText("Tiptap으로 작성한 메모")
  await page
    .getByLabel("본문 이미지 선택", { exact: true })
    .setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    })
  await expect(body.getByRole("img", { name: "test.png" })).toHaveAttribute(
    "src",
    /^data:image\/png;base64,/
  )
  await expect(body).toContainText("Tiptap으로 작성한 메모")
  await body.press("ArrowRight")
  await body.press("Enter")
  await popup.getByRole("button", { name: "표 편집", exact: true }).click()
  await page.getByRole("menuitem", { name: "표 추가", exact: true }).click()
  await expect(body.locator("table")).toHaveCount(1)
  await expect(body.locator("th, td")).toHaveCount(9)
  await body.locator("th").first().click()
  await popup.getByRole("button", { name: "표 편집", exact: true }).click()
  await page.getByRole("menuitem", { name: "열 추가", exact: true }).click()
  await expect(body.locator("th, td")).toHaveCount(12)
  await popup.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await expect(popup).toHaveCount(0)
  const rows = await (await request.get(`${api}/rest/v1/todo_item`)).json()
  const saved = rows.find((row: { todo_text: string }) =>
    row.todo_text.includes("Tiptap으로 작성한 메모")
  )
  expect(saved.todo_text).toContain("<strong>")
  expect(saved.todo_text).toContain('href="https://example.com"')
  expect(saved.todo_text).toContain("data:image/png;base64,")
  expect(saved.todo_text).toContain("<table")
  await page.goto(`/todo-page?editor=edit:${saved.id}`)
  const edit = page.getByRole("dialog", { name: "할 일 수정", exact: true })
  await expect(
    edit
      .getByRole("textbox", { name: "할 일 내용", exact: true })
      .locator("table")
  ).toHaveCount(1)
  await expect(edit.locator("img[src^='data:image/png']")).toHaveCount(1)
  await edit.getByRole("button", { name: "에디터 닫기" }).click()
  await expect(edit).toHaveCount(0)
})

test("HTML source edits strip unsafe content before preview and save", async ({
  page,
  request,
}) => {
  await login(page)
  await page.getByRole("button", { name: "할 일 추가", exact: true }).click()
  const popup = page.getByRole("dialog", { name: "할 일 추가", exact: true })
  await popup
    .getByRole("button", { name: "HTML 소스 편집", exact: true })
    .click()
  await popup
    .getByRole("textbox", { name: "HTML 소스", exact: true })
    .fill(
      '<h2>안전한 제목</h2><p><em>기존 HTML 호환</em></p><img src="x" onerror="alert(1)" data-mce-src="javascript:alert(2)"><script>alert(3)</script><iframe src="https://example.com"></iframe><svg onload="alert(4)"></svg>'
    )
  await popup
    .getByRole("button", { name: "HTML 소스 편집", exact: true })
    .click()
  const body = popup.getByRole("textbox", { name: "할 일 내용", exact: true })
  await expect(body.locator("h2")).toHaveText("안전한 제목")
  await expect(body.locator("em")).toHaveText("기존 HTML 호환")
  await expect(
    body.locator("script, iframe, svg, [onerror], [data-mce-src]")
  ).toHaveCount(0)
  await popup.getByRole("button", { name: "할 일 추가", exact: true }).click()
  await expect(popup).toHaveCount(0)
  const rows = await (await request.get(`${api}/rest/v1/todo_item`)).json()
  const saved = rows.find((row: { todo_text: string }) =>
    row.todo_text.includes("안전한 제목")
  )
  expect(saved.todo_text).not.toMatch(/onerror|data-mce|<script|<iframe|<svg/)
})

test("workspace reads every page instead of silently dropping todos above the API limit", async ({
  page,
}) => {
  const rows = Array.from({ length: 1005 }, (_, index) => ({
    id: index + 1,
    user_id: userId,
    todo_text: `<p>대량 할 일 ${index + 1}</p>`,
    sub_id: null,
    category_id: null,
    checked: false,
    order: index,
    created_at: "2026-10-28T00:00:00Z",
  }))
  const offsets: number[] = []
  await page.route("**/rest/v1/todo_item*", async (route) => {
    const url = new URL(route.request().url())
    const offset = Number(url.searchParams.get("offset") || 0)
    offsets.push(offset)
    await route.fulfill({ json: rows.slice(offset, offset + 1000) })
  })
  await login(page)
  await expect(
    page.getByText("상위 할 일 1005개 · 하위 할 일 0개")
  ).toBeVisible()
  await expect(page.locator("[data-todo-id]")).toHaveCount(1005)
  expect(offsets).toContain(1000)
  expect(offsets).toContain(1005)
})
