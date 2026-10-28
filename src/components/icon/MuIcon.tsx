import { parseDomSizeValue } from "@/utils/string.utils.ts"

type MuIcon = {
  icon: string
  cursor?: string
  size?: string | number
  className?: string
  clickIcon?: () => void
}

export default function MuIcon({
  size = "16",
  icon,
  cursor = "default",
  className = "",
  clickIcon,
}: MuIcon) {
  const iconStyle = {
    fontSize: parseDomSizeValue(size),
    cursor,
  }
  return (
    <span
      className={`material-icons ${className}`}
      style={iconStyle}
      onClick={clickIcon}
    >
      {icon}
    </span>
  )
}
