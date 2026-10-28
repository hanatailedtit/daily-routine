import { DateTime } from "luxon"

export const DATE_FORMAT = {
  default: "YYYY-MM-DD",
} as const

export const parseDateToFormat = (date: string) => {
  return DateTime.fromISO(date).toLocaleString()
}
