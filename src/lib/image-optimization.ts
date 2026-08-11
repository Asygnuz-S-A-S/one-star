export const NEXT_IMAGE_REMOTE_PATTERNS: Array<{
  protocol: "https"
  hostname: string
}> = [
  { protocol: "https", hostname: "images.unsplash.com" },
  { protocol: "https", hostname: "res.cloudinary.com" },
  { protocol: "https", hostname: "nb.scene7.com" },
  { protocol: "https", hostname: "static.nike.com" },
]

const OPTIMIZED_REMOTE_HOSTS = new Set(
  NEXT_IMAGE_REMOTE_PATTERNS.map(({ protocol, hostname }) => `${protocol}://${hostname}`),
)

export function canUseNextImageOptimization(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true

  try {
    const url = new URL(value)
    if (url.port || url.username || url.password) return false
    return OPTIMIZED_REMOTE_HOSTS.has(`${url.protocol}//${url.hostname}`)
  } catch {
    return false
  }
}
