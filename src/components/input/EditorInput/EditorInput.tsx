import { useEffect, useRef, useState, type FormEvent } from "react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ImagePlus,
  Link2,
  Undo2,
  Redo2,
  Code2,
  Table2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { readProfileImage } from "@/lib/profile-image"
import { sanitizeTodo } from "@/lib/todo"

export default function EditorInput({
  value,
  setValue,
  disabled = false,
  onBusyChange,
}: {
  value: string
  setValue: (value: string) => void
  disabled?: boolean
  onBusyChange: (busy: boolean) => void
}) {
  const [source, setSource] = useState(false)
  const [error, setError] = useState("")
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ inline: true, allowBase64: true }),
      TableKit,
    ],
    content: sanitizeTodo(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "할 일 내용",
        "aria-multiline": "true",
        class: "todo-content min-h-[260px] p-4 outline-none",
      },
      transformPastedHTML: sanitizeTodo,
    },
    onUpdate: ({ editor }) => setValue(editor.getHTML()),
  })
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      underline: editor?.isActive("underline"),
      bulletList: editor?.isActive("bulletList"),
      orderedList: editor?.isActive("orderedList"),
      undo: editor?.can().undo(),
      redo: editor?.can().redo(),
      table: editor?.isActive("table"),
    }),
  })
  useEffect(() => {
    editor?.setEditable(!disabled, false)
  }, [editor, disabled])
  if (!editor) return null

  const applyLink = (event: FormEvent) => {
    event.preventDefault()
    const href = link.trim()
    if (href) {
      try {
        const url = new URL(href, window.location.origin)
        if (!["http:", "https:", "mailto:", "tel:"].includes(url.protocol))
          throw new Error("Invalid protocol")
      } catch {
        setError("http, https, mailto, tel 주소를 입력해 주세요.")
        return
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    } else editor.chain().focus().extendMarkRange("link").unsetLink().run()
    setError("")
    setLinkOpen(false)
  }
  const upload = async (file?: File) => {
    if (!file || disabled) return
    setError("")
    onBusyChange(true)
    try {
      const src = await readProfileImage(file)
      if (!editor.isDestroyed)
        editor.chain().focus().setImage({ src, alt: file.name }).run()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "이미지를 읽지 못했어요."
      )
    } finally {
      onBusyChange(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }
  const tools = [
    {
      label: "굵게",
      icon: Bold,
      active: active?.bold,
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "기울임",
      icon: Italic,
      active: active?.italic,
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "밑줄",
      icon: Underline,
      active: active?.underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "글머리 목록",
      icon: List,
      active: active?.bulletList,
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "번호 목록",
      icon: ListOrdered,
      active: active?.orderedList,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "실행 취소",
      icon: Undo2,
      disabled: !active?.undo,
      run: () => editor.chain().focus().undo().run(),
    },
    {
      label: "다시 실행",
      icon: Redo2,
      disabled: !active?.redo,
      run: () => editor.chain().focus().redo().run(),
    },
  ]
  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <div
        role="group"
        aria-label="서식 도구"
        className="flex flex-wrap items-center gap-1 border-b bg-muted p-2"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || source}
            >
              본문 서식
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().setParagraph().run()}
            >
              본문
            </DropdownMenuItem>
            {([1, 2, 3, 4, 5, 6] as const).map((level) => (
              <DropdownMenuItem
                key={level}
                onSelect={() =>
                  editor.chain().focus().toggleHeading({ level }).run()
                }
              >
                제목 {level}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBlockquote().run()}
            >
              인용문
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleCodeBlock().run()}
            >
              코드 블록
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {tools.map((tool) => (
          <Button
            key={tool.label}
            type="button"
            variant={tool.active ? "secondary" : "ghost"}
            size="icon"
            aria-label={tool.label}
            title={tool.label}
            aria-pressed={tool.active}
            disabled={disabled || source || tool.disabled}
            onClick={tool.run}
          >
            <tool.icon aria-hidden="true" />
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="링크 편집"
          title="링크 편집"
          disabled={disabled || source}
          onClick={() => {
            setLink(String(editor.getAttributes("link").href || ""))
            setError("")
            setLinkOpen(true)
          }}
        >
          <Link2 aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="이미지 추가"
          title="이미지 추가"
          disabled={disabled || source}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
        </Button>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          aria-label="본문 이미지 선택"
          disabled={disabled || source}
          onChange={(event) => {
            void upload(event.target.files?.[0])
          }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="표 편집"
              title="표 편집"
              disabled={disabled || source}
            >
              <Table2 aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              표 추가
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!active?.table}
              onSelect={() => editor.chain().focus().addRowAfter().run()}
            >
              행 추가
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!active?.table}
              onSelect={() => editor.chain().focus().addColumnAfter().run()}
            >
              열 추가
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!active?.table}
              onSelect={() => editor.chain().focus().deleteRow().run()}
            >
              행 삭제
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!active?.table}
              onSelect={() => editor.chain().focus().deleteColumn().run()}
            >
              열 삭제
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!active?.table}
              onSelect={() => editor.chain().focus().mergeOrSplit().run()}
            >
              셀 병합·분할
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!active?.table}
              onSelect={() => editor.chain().focus().deleteTable().run()}
            >
              표 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant={source ? "secondary" : "ghost"}
          size="icon"
          aria-label="HTML 소스 편집"
          title="HTML 소스 편집"
          aria-pressed={source}
          disabled={disabled}
          onClick={() => {
            if (source) {
              editor.commands.setContent(sanitizeTodo(value), {
                emitUpdate: false,
              })
              setValue(editor.getHTML())
            }
            setSource(!source)
          }}
        >
          <Code2 aria-hidden="true" />
        </Button>
      </div>
      {source ? (
        <textarea
          aria-label="HTML 소스"
          className="min-h-[260px] w-full resize-y bg-white p-4 font-mono text-sm outline-none"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      {error && !linkOpen && (
        <p role="alert" className="px-4 pb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            editor.commands.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>링크 편집</DialogTitle>
            <DialogDescription>
              선택한 글에 연결할 주소를 입력해요. 비우면 링크를 제거해요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={applyLink} className="space-y-4">
            <label
              className="block text-sm font-semibold"
              htmlFor="editor-link-url"
            >
              URL
            </label>
            <Input
              id="editor-link-url"
              value={link}
              onChange={(event) => {
                setLink(event.target.value)
                setError("")
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "editor-link-error" : undefined}
            />
            {error && (
              <p
                id="editor-link-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLinkOpen(false)}
              >
                취소
              </Button>
              <Button type="submit">적용</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
