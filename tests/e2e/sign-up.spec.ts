import { expect, test, type Page } from "@playwright/test"

const api = "http://127.0.0.1:54321"
const userId = "11111111-1111-4111-8111-111111111111"
const avatar = {
  name: "avatar.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1kAAAAASUVORK5CYII=",
    "base64"
  ),
}

test.beforeEach(async ({ request }) => {
  await request.post(`${api}/__reset?new=1`)
})

async function login(page: Page) {
  await page.goto("/")
  await page.getByRole("button", { name: "Google로 계속하기" }).click()
}

async function signup(page: Page) {
  await login(page)
  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(
    page.getByRole("heading", { name: "회원가입", exact: true })
  ).toBeVisible()
}

test("new Google member completes desktop signup with validation, photo and one pending write", async ({
  page,
  request,
}) => {
  let writes = 0
  let todoReads = 0
  let release!: () => void
  const paused = new Promise<void>((resolve) => {
    release = resolve
  })
  page.on("request", (req) => {
    if (req.url().includes("/rest/v1/todo_")) todoReads++
  })
  await page.route("**/rest/v1/profiles*", async (route) => {
    if (route.request().method() === "POST") {
      writes++
      await paused
    }
    await route.continue()
  })
  await signup(page)
  await expect(page).not.toHaveURL(/[?&]code=/)
  await expect(
    page.getByText("demo@example.com", { exact: true })
  ).toBeVisible()
  await expect(page.getByRole("navigation", { name: "주 메뉴" })).toHaveCount(0)
  expect(writes).toBe(0)
  expect(todoReads).toBe(0)
  await page.screenshot({
    path: "test-results/signup-desktop.png",
    fullPage: true,
  })
  const name = page.getByRole("textbox", { name: "닉네임" })
  await page.getByRole("button", { name: "가입 완료하고 시작하기" }).click()
  await expect(
    page.getByText("닉네임을 입력해 주세요.", { exact: true })
  ).toBeVisible()
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute("aria-invalid", "true")
  expect(writes).toBe(0)
  await page
    .getByLabel("프로필 사진 선택", { exact: true })
    .setInputFiles({
      name: "bad.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    })
  await expect(
    page.getByText("5MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.")
  ).toBeVisible()
  await page
    .getByLabel("프로필 사진 선택", { exact: true })
    .setInputFiles(avatar)
  await expect(
    page.getByRole("img", { name: "프로필 사진 미리보기" }).locator("img")
  ).toHaveAttribute("src", /^data:image\/png/)
  await name.fill("  새 회원  ")
  await page.getByRole("button", { name: "가입 완료하고 시작하기" }).click()
  await expect(
    page.getByRole("button", { name: "가입하는 중…" })
  ).toBeDisabled()
  await expect(name).toBeDisabled()
  await page.keyboard.press("Enter")
  await expect.poll(() => writes).toBe(1)
  release()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
  const saved = await (
    await request.get(`${api}/rest/v1/profiles?id=eq.${userId}`)
  ).json()
  expect(saved).toHaveLength(1)
  expect(saved[0].user_name).toBe("새 회원")
  expect(saved[0].user_image).toMatch(/^data:image\/png/)
  expect(writes).toBe(1)
  await page.goto("/my-page")
  await expect(
    page.getByRole("heading", { name: "새 회원", exact: true })
  ).toBeVisible()
})

test("mobile signup fits 320/375/390px and remains usable with a reduced viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signup(page)
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    const bounds = await page
      .getByRole("button", { name: "가입 완료하고 시작하기" })
      .boundingBox()
    expect(bounds!.height).toBe(56)
    expect(bounds!.y + bounds!.height).toBeLessThan(844)
  }
  await page.screenshot({
    path: "test-results/signup-mobile.png",
    fullPage: true,
  })
  await page.getByRole("textbox", { name: "닉네임" }).fill("모바일 회원")
  await page.setViewportSize({ width: 390, height: 500 })
  await page.getByRole("button", { name: "가입 완료하고 시작하기" }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
})

test("signup route protects unauthenticated users and skips existing members", async ({
  page,
  request,
}) => {
  await page.goto("/sign-up")
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" })
  ).toBeVisible()
  await request.post(`${api}/__reset`)
  await login(page)
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
  await page.goto("/sign-up")
  await expect(page).toHaveURL(/\/todo-page$/)
  await expect(
    page.getByRole("heading", { name: "회원가입", exact: true })
  ).toHaveCount(0)
})

test("profile lookup failure shows retry and never creates a replacement profile", async ({
  page,
  request,
}) => {
  await request.post(`${api}/__reset`)
  await request.post(`${api}/__profile-read-failure`)
  let writes = 0
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/rest/v1/profiles"))
      writes++
  })
  await login(page)
  await expect(
    page.getByRole("heading", { name: "프로필을 불러오지 못했어요" })
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "회원가입", exact: true })
  ).toHaveCount(0)
  expect(writes).toBe(0)
  await request.post(`${api}/__profile-read-failure?enabled=0`)
  await page.getByRole("button", { name: "다시 시도", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
  expect(writes).toBe(0)
})

test("failed registration retains name and photo for retry", async ({
  page,
  request,
}) => {
  await signup(page)
  const name = page.getByRole("textbox", { name: "닉네임" })
  await name.fill("재시도 회원")
  await page
    .getByLabel("프로필 사진 선택", { exact: true })
    .setInputFiles(avatar)
  await request.post(`${api}/__fail`)
  await page.getByRole("button", { name: "가입 완료하고 시작하기" }).click()
  await expect(
    page.getByText(
      "가입 정보를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요."
    )
  ).toBeVisible()
  await expect(name).toHaveValue("재시도 회원")
  await expect(
    page.getByRole("img", { name: "프로필 사진 미리보기" }).locator("img")
  ).toHaveAttribute("src", /^data:image\/png/)
  await page.screenshot({
    path: "test-results/signup-retry.png",
    fullPage: true,
  })
  await page.getByRole("button", { name: "다시 시도", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
})

test("a committed profile survives a lost response and signup logout leaves no profile", async ({
  page,
  request,
}) => {
  await signup(page)
  await page.getByRole("button", { name: "로그아웃", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" })
  ).toBeVisible()
  expect(await (await request.get(`${api}/rest/v1/profiles`)).json()).toEqual(
    []
  )
  await signup(page)
  let writes = 0
  await page.route("**/rest/v1/profiles*", async (route) => {
    if (route.request().method() === "POST") {
      writes++
      await route.fetch()
      await route.abort("failed")
    } else await route.continue()
  })
  await page.getByRole("textbox", { name: "닉네임" }).fill("응답 복구 회원")
  await page.getByRole("button", { name: "가입 완료하고 시작하기" }).click()
  await expect(
    page.getByRole("heading", { name: "전체 할 일", exact: true })
  ).toBeVisible()
  expect(writes).toBe(1)
  const saved = await (await request.get(`${api}/rest/v1/profiles`)).json()
  expect(saved).toHaveLength(1)
  expect(saved[0].user_name).toBe("응답 복구 회원")
})
