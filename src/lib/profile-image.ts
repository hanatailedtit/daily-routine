export async function readProfileImage(file: File): Promise<string> {
  if (
    !/^image\/(png|jpeg|webp|gif)$/.test(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new Error("5MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요.")
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(new Error("이미지를 읽지 못했어요. 다시 선택해 주세요."))
    reader.readAsDataURL(file)
  })
}
