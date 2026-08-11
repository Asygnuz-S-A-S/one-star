const INTERNAL_ORIGIN = "https://onestar.internal"

export function isSafePublicUrl(value: string): boolean {
  const url = value.trim()
  if (!url || /[\\\u0000-\u001F\u007F]/.test(url)) return false

  if (url.startsWith("/")) {
    if (url.startsWith("//")) return false
    try {
      return new URL(url, INTERNAL_ORIGIN).origin === INTERNAL_ORIGIN
    } catch {
      return false
    }
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function safePublicUrl(value: string | null | undefined, fallback: string): string {
  return value && isSafePublicUrl(value) ? value.trim() : fallback
}
