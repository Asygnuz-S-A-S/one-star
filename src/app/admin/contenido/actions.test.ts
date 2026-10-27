import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/auth/require-admin", () => ({ requireSuperAdmin: vi.fn() }))
vi.mock("@/server/services/site-content.service", () => ({ updateSiteContent: vi.fn() }))

import { updateSiteContentAction } from "./actions"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import { updateSiteContent } from "@/server/services/site-content.service"

const mockRequireSuperAdmin = vi.mocked(requireSuperAdmin)
const mockUpdateSiteContent = vi.mocked(updateSiteContent)

function validFormData(): FormData {
  const formData = new FormData()
  formData.set("highlights", "Envío gratis")
  formData.set("faqs", "¿Hay cambios?\nSí")
  formData.set("returnWindowDays", "30")
  formData.set("returnsTitle", "Cambios")
  formData.set("returnsText", "30 días para cambios")
  formData.set("paymentTitle", "Pago seguro")
  formData.set("paymentText", "Tus pagos están protegidos")
  formData.set("supportTitle", "Soporte")
  formData.set("supportText", "Te ayudamos por WhatsApp")
  return formData
}

describe("updateSiteContentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireSuperAdmin.mockResolvedValue({} as never)
  })

  it("rechaza a un inventory operator sin modificar contenido global", async () => {
    mockRequireSuperAdmin.mockRejectedValue(new Error("Esta acción requiere el rol Super Admin."))

    const result = await updateSiteContentAction(validFormData())

    expect(result).toEqual({ success: false, error: "Esta acción requiere el rol Super Admin." })
    expect(mockUpdateSiteContent).not.toHaveBeenCalled()
  })

  it("actualiza el contenido cuando el super admin envía datos válidos", async () => {
    const result = await updateSiteContentAction(validFormData())

    expect(result).toEqual({ success: true })
    expect(mockUpdateSiteContent).toHaveBeenCalledOnce()
  })
})
