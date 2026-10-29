import { cn } from "@/lib/utils"

export default function Stats({
  items,
}: {
  items: { label: string; value: string | number; unit?: string }[]
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-y-6 rounded-lg bg-white py-6 md:flex",
        items.length === 3 && "grid-cols-3"
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 flex-1 border-border px-6 md:border-l md:first:border-0",
            items.length === 3 && "px-4 md:px-6"
          )}
        >
          <dt className="text-[13px] text-muted-foreground">{item.label}</dt>
          <dd className="mt-3 flex items-baseline gap-3">
            <span className="text-[28px] font-bold leading-none tabular-nums">
              {item.value}
            </span>
            {item.unit && (
              <span className="text-muted-foreground">{item.unit}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
