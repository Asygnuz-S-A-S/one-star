export const CHECKOUT_DRAFT_STORAGE_KEY = "onestar_checkout_draft"
export const CHECKOUT_DRAFT_TTL_MS = 30 * 60 * 1000

const CHECKOUT_DRAFT_VERSION = 1
const MAX_SERIALIZED_DRAFT_LENGTH = 8_192

export type CheckoutShippingMethod = "standard" | "express"

export interface CheckoutFormDraft {
  email: string
  newsletter: boolean
  name: string
  lastName: string
  phone: string
  address: string
  apartment: string
  city: string
  department: string
  postalCode: string
  saveAddress: boolean
  shippingMethod: CheckoutShippingMethod
}

export interface CheckoutDraft {
  form: CheckoutFormDraft
  couponCode: string | null
}

interface CheckoutDraftEnvelope {
  version: number
  savedAt: number
  ownerEmail: string
  data: CheckoutDraft
}

const STRING_LIMITS = {
  email: 254,
  name: 100,
  lastName: 100,
  phone: 30,
  address: 300,
  apartment: 150,
  city: 100,
  department: 100,
  postalCode: 20,
} as const satisfies Record<keyof Omit<CheckoutFormDraft, "newsletter" | "saveAddress" | "shippingMethod">, number>

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isCheckoutFormDraft(value: unknown): value is CheckoutFormDraft {
  if (!value || typeof value !== "object") return false

  const form = value as Record<string, unknown>
  const hasValidStrings = Object.entries(STRING_LIMITS).every(
    ([field, maxLength]) =>
      typeof form[field] === "string" && (form[field] as string).length <= maxLength,
  )
  const hasValidBooleans =
    typeof form.newsletter === "boolean" && typeof form.saveAddress === "boolean"
  const hasValidShipping =
    form.shippingMethod === "standard" || form.shippingMethod === "express"

  return hasValidStrings && hasValidBooleans && hasValidShipping
}

function isCheckoutDraft(value: unknown): value is CheckoutDraft {
  if (!value || typeof value !== "object") return false

  const draft = value as Record<string, unknown>
  const hasValidCoupon =
    draft.couponCode === null ||
    (typeof draft.couponCode === "string" && draft.couponCode.length <= 64)

  return isCheckoutFormDraft(draft.form) && hasValidCoupon
}

function isCheckoutDraftEnvelope(value: unknown): value is CheckoutDraftEnvelope {
  if (!value || typeof value !== "object") return false

  const envelope = value as Record<string, unknown>
  return (
    envelope.version === CHECKOUT_DRAFT_VERSION &&
    typeof envelope.savedAt === "number" &&
    Number.isFinite(envelope.savedAt) &&
    typeof envelope.ownerEmail === "string" &&
    isCheckoutDraft(envelope.data)
  )
}

export function getCheckoutSessionStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function saveCheckoutDraft(
  storage: Pick<Storage, "setItem"> | null,
  draft: CheckoutDraft,
  savedAt = Date.now(),
): boolean {
  if (!storage || !isCheckoutDraft(draft)) return false

  const ownerEmail = normalizeEmail(draft.form.email)
  if (!ownerEmail) return false

  const envelope: CheckoutDraftEnvelope = {
    version: CHECKOUT_DRAFT_VERSION,
    savedAt,
    ownerEmail,
    data: draft,
  }
  const serialized = JSON.stringify(envelope)
  if (serialized.length > MAX_SERIALIZED_DRAFT_LENGTH) return false

  try {
    storage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, serialized)
    return true
  } catch {
    return false
  }
}

export function loadCheckoutDraft(
  storage: Pick<Storage, "getItem" | "removeItem"> | null,
  ownerEmail: string,
  now = Date.now(),
): CheckoutDraft | null {
  if (!storage) return null

  try {
    const serialized = storage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)
    if (!serialized) return null
    if (serialized.length > MAX_SERIALIZED_DRAFT_LENGTH) {
      storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
      return null
    }

    const parsed: unknown = JSON.parse(serialized)
    const normalizedOwner = normalizeEmail(ownerEmail)
    const isCurrent =
      isCheckoutDraftEnvelope(parsed) &&
      parsed.savedAt <= now &&
      now - parsed.savedAt <= CHECKOUT_DRAFT_TTL_MS &&
      parsed.ownerEmail === normalizedOwner &&
      normalizeEmail(parsed.data.form.email) === normalizedOwner

    if (!isCurrent) {
      storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
      return null
    }

    return parsed.data
  } catch {
    try {
      storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
    } catch {
      // El almacenamiento puede estar completamente bloqueado.
    }
    return null
  }
}

export function clearCheckoutDraft(
  storage: Pick<Storage, "removeItem"> | null,
): boolean {
  if (!storage) return false

  try {
    storage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
