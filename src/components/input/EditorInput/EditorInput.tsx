import { Editor } from "@tinymce/tinymce-react"
import "tinymce/tinymce"
import "tinymce/models/dom/model"
import "tinymce/themes/silver"
import "tinymce/icons/default"
import "tinymce/plugins/lists"
import "tinymce/plugins/link"
import "tinymce/plugins/image"
import "tinymce/plugins/table"
import "tinymce/plugins/code"
import "tinymce/skins/ui/oxide/skin.min.css"
import contentCss from "tinymce/skins/content/default/content.min.css?inline"
import contentUiCss from "tinymce/skins/ui/oxide/content.min.css?inline"

export default function EditorInput({
  value,
  setValue,
  disabled = false,
  onEscape,
}: {
  value: string
  setValue: (value: string) => void
  disabled?: boolean
  onEscape: () => void
}) {
  return (
    <Editor
      value={value}
      disabled={disabled}
      onEditorChange={setValue}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          onEscape()
        }
      }}
      onInit={(_event, editor) => {
        // TinyMCE 6 mounts its menus under body, outside the modal's focus scope.
        const modal = editor.getContainer().closest("[role=dialog]")
        const sink = document.body.querySelector(":scope > .tox-tinymce-aux")
        if (modal && sink) {
          modal.appendChild(sink)
          sink.removeAttribute("aria-hidden")
        }
      }}
      init={{
        height: 340,
        menubar: false,
        branding: false,
        promotion: false,
        skin: false,
        content_css: false,
        content_style: `${contentCss}\n${contentUiCss}\nbody { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #191f28; font-size: 15px; line-height: 1.7; padding: 8px 12px; } img { max-width:100%; height:auto; }`,
        plugins: ["lists", "link", "image", "table", "code"],
        toolbar:
          "blocks | bold italic | bullist numlist | image link table | undo redo | code",
        toolbar_mode: "wrap",
        statusbar: false,
        file_picker_types: "image",
        file_picker_callback: (callback, _value, meta) => {
          if (meta.filetype !== "image") return
          const input = document.createElement("input")
          input.type = "file"
          input.accept = "image/png,image/jpeg,image/webp,image/gif"
          input.onchange = () => {
            const file = input.files?.[0]
            if (!file) return
            if (
              !/^image\/(png|jpeg|webp|gif)$/.test(file.type) ||
              file.size > 5 * 1024 * 1024
            ) {
              window.alert(
                "5MB 이하의 PNG, JPG, WebP, GIF 이미지를 선택해 주세요."
              )
              return
            }
            const reader = new FileReader()
            reader.onload = () =>
              callback(String(reader.result), { alt: file.name })
            reader.onerror = () =>
              window.alert("이미지를 읽지 못했어요. 다시 선택해 주세요.")
            reader.readAsDataURL(file)
          }
          input.click()
        },
      }}
    />
  )
}
