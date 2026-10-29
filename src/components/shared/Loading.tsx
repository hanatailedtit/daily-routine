export default function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-32 items-center justify-center gap-2 text-muted-foreground"
    >
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-current"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span>불러오는 중이에요</span>
    </div>
  )
}
