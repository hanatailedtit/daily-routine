import { Check } from "lucide-react"
import { Link } from "react-router-dom"
export default function Brand() {
  return (
    <Link
      to="/"
      className="inline-flex shrink-0 items-center gap-3 font-bold tracking-tight"
      aria-label="Daily Routine 홈"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-white">
        <Check size={23} aria-hidden="true" />
      </span>
      <span className="text-lg">Daily Routine</span>
    </Link>
  )
}
