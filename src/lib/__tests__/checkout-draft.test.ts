import { describe, expect, it } from "vitest"
import {
  CHECKOUT_DRAFT_TTL_MS,
  CHECKOUT_DRAFT_STORAGE_KEY,
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from "@/lib/checkout-draft"

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe("checkout draft", () => {
  it("guarda y recupera los campos del checkout en el almacenamiento de sesión", () => {
    const storage = createMemoryStorage()
    const draft: CheckoutDraft = {
      form: {
        email: "cliente@example.com",
        newsletter: true,
        name: "Ana",
        lastName: "Pérez",
        phone: "3001234567",
        address: "Calle 1 # 2-3",
        apartment: "Apto 4",
        city: "Medellín",
        department: "Antioquia",
        postalCode: "050001",
        saveAddress: true,
        shippingMethod: "express",
      },
      couponCode: "VERANO20",
    }
    const savedAt = Date.UTC(2026, 6, 31, 20)

    expect(saveCheckoutDraft(storage, draft, savedAt)).toBe(true)

    expect(storage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)).not.toBeNull()
    expect(loadCheckoutDraft(storage, "cliente@example.com", savedAt + 60_000)).toEqual(draft)
  })

  it("ignora borradores corruptos o con una estructura inesperada", () => {
    const storage = createMemoryStorage()
    storage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify({ email: "cliente@example.com" }))

    expect(loadCheckoutDraft(storage, "cliente@example.com")).toBeNull()

    storage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, "{json-invalido")
    expect(loadCheckoutDraft(storage, "cliente@example.com")).toBeNull()
  })

  it("elimina el borrador si expiró o pertenece a otra cuenta", () => {
    const storage = createMemoryStorage()
    const draft: CheckoutDraft = {
      form: {
        email: "cliente@example.com",
        newsletter: false,
        name: "Ana",
        lastName: "Pérez",
        phone: "3001234567",
        address: "Calle 1",
        apartment: "",
        city: "Medellín",
        department: "Antioquia",
        postalCode: "",
        saveAddress: false,
        shippingMethod: "standard",
      },
      couponCode: null,
    }
    const savedAt = Date.UTC(2026, 6, 31, 20)

    saveCheckoutDraft(storage, draft, savedAt)
    expect(loadCheckoutDraft(storage, "otra@example.com", savedAt + 1)).toBeNull()
    expect(storage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)).toBeNull()

    saveCheckoutDraft(storage, draft, savedAt)
    expect(
      loadCheckoutDraft(storage, "cliente@example.com", savedAt + CHECKOUT_DRAFT_TTL_MS + 1),
    ).toBeNull()
    expect(storage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)).toBeNull()
  })

  it("se degrada de forma segura cuando el almacenamiento está bloqueado", () => {
    const blockedStorage = {
      getItem: () => {
        throw new Error("storage blocked")
      },
      removeItem: () => {
        throw new Error("storage blocked")
      },
      setItem: () => {
        throw new Error("storage blocked")
      },
    }
    const draft: CheckoutDraft = {
      form: {
        email: "cliente@example.com",
        newsletter: false,
        name: "Ana",
        lastName: "Pérez",
        phone: "3001234567",
        address: "Calle 1",
        apartment: "",
        city: "Medellín",
        department: "Antioquia",
        postalCode: "",
        saveAddress: false,
        shippingMethod: "standard",
      },
      couponCode: null,
    }

    expect(saveCheckoutDraft(blockedStorage, draft)).toBe(false)
    expect(loadCheckoutDraft(blockedStorage, "cliente@example.com")).toBeNull()
    expect(clearCheckoutDraft(blockedStorage)).toBe(false)
  })
})
