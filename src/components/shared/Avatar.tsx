import { useState } from "react"
import { cn } from "@/lib/utils"
export default function Avatar({
  name,
  src,
  large = false,
}: {
  name: string
  src?: string | null
  large?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-primary",
        large ? "size-16 text-3xl" : "size-10 text-lg"
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        name.trim().slice(0, 1).toUpperCase() || "나"
      )}
    </span>
  )
}
