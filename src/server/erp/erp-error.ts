import "server-only"

const MAX_ERROR_LENGTH = 600
const FALLBACK_ERROR = "El ERP reportó un error sin detalle."

const RAW_BODY_START = /^\s*(?:\{|<)/
const SAFE_SERVER_PREFIX = /^\s*\[(?:LoggroClient|LoggroERP|ERP Sync Service)\]/

/**
 * Límite de seguridad común para errores ERP persistidos o enviados al cliente.
 * El mensaje conserva contexto operativo, pero elimina material de autenticación,
 * URLs y trazas que podrían revelar detalles internos.
 */
export function sanitizeErpError(value: unknown): string {
  const raw = typeof value === "string" ? value : value instanceof Error ? value.message : ""
  if (!raw.trim()) return FALLBACK_ERROR
  if (RAW_BODY_START.test(raw) || (/^\s*\[/.test(raw) && !SAFE_SERVER_PREFIX.test(raw))) {
    return FALLBACK_ERROR
  }

  const safe = raw
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\bAuthorization\s*[:=]\s*(?:Basic|Bearer)\s+[^\s|,;]+/gi, "Authorization=[REDACTADO]")
    .replace(/\bX-API-Key\s*:\s*[^\s|,;]+/gi, "X-API-Key=[REDACTADO]")
    .replace(/\bBasic\s+[A-Za-z0-9+/=]{8,}/gi, "Basic [REDACTADO]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTADO]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTADO]")
    .replace(/\b(?:Set-Cookie|Cookie)\s*[:=]\s*[^|\r\n]+/gi, "Cookie=[REDACTADO] ")
    .replace(
      /\b(?:DATABASE_URL|DIRECT_URL|PRIVATE_KEY|[A-Z][A-Z0-9_]*_(?:KEY_ID|KEY|TOKEN|SECRET|PASSWORD))\s*=\s*(?:"[^"]*"|'[^']*'|[^\s|,;]+)/gi,
      "[SECRETO REDACTADO]"
    )
    .replace(
      /["']?\b(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|clientSecret|token|password|secret|session|csrf(?:token)?)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;}|]+)/gi,
      "$1=[REDACTADO]"
    )
    .replace(/(?:https?|postgres(?:ql)?|mysql|redis):\/\/[^\s"'<>]+/gi, "[URL REDACTADA]")
    .replace(
      /((?:→|HTTP)\s*\d{3})\s*:\s*[\s\S]+$/gi,
      "$1: [DETALLE REDACTADO]"
    )
    .replace(/\{[^{}]*\}/g, "[DETALLE REDACTADO]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL REDACTADO]")
    .replace(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, "[ID REDACTADO]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP REDACTADA]")
    .replace(
      /\b(c[eé]dula|documento|identificaci[oó]n|idNumber)\b\s*(?:[:=#-]\s*)?(?:\d[\s.-]*){5,9}\d/gi,
      "$1 [DATO REDACTADO]"
    )
    .replace(/(?:\+?\d[\s().-]*){9,}/g, "[DATO REDACTADO]")
    .replace(/\b[A-Za-z0-9+/]{32,}={0,2}\b/g, "[REDACTADO]")
    .replace(/\n\s*at\s+.*(?:\n\s*at\s+.*)*/g, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!safe) return FALLBACK_ERROR
  return safe.length <= MAX_ERROR_LENGTH ? safe : `${safe.slice(0, MAX_ERROR_LENGTH - 1)}…`
}
