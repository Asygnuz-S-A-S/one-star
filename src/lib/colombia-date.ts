const COLOMBIA_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function toColombiaDateInput(value: string | null | undefined): string {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const parts = Object.fromEntries(
    COLOMBIA_DATE_FORMATTER
      .formatToParts(date)
      .filter((part) => part.type === "year" || part.type === "month" || part.type === "day")
      .map((part) => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}
