const DEFAULT_CALLBACK_URL = "/cuenta"

function isSafeInternalPath(value: string | null | undefined): value is string {
  return typeof value === "string" &&
    value === value.trim() &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u001F\u007F]/.test(value)
}

export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = DEFAULT_CALLBACK_URL,
): string {
  const safeFallback = isSafeInternalPath(fallback) ? fallback : DEFAULT_CALLBACK_URL
  return isSafeInternalPath(callbackUrl) ? callbackUrl : safeFallback
}
