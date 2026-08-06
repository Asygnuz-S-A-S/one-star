import "server-only"

import { createHash } from "node:crypto"
import { z } from "zod"
import { getERPAdapter } from "@/server/erp"
import {
  applyErpCatalogRepairPlan,
  loadErpCatalogRepairState,
} from "@/server/repositories/erp-catalog-repair.repository"
import { buildErpCatalogRepairPlan } from "./erp-catalog-repair.plan"

export const ErpCatalogRepairInputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("preview") }),
  z.object({
    mode: z.literal("apply"),
    fingerprint: z.string().length(64),
  }),
])

export type ErpCatalogRepairInput = z.infer<typeof ErpCatalogRepairInputSchema>

export interface ErpCatalogRepairData {
  mode: "preview" | "apply"
  fingerprint: string
  products: number
  variants: number
  moveVariants: number
  deleteVariants: number
  deleteProducts: number
}

export type ErpCatalogRepairResult =
  | { success: true; data: ErpCatalogRepairData }
  | {
      success: false
      error: {
        code:
          | "INVALID_INPUT"
          | "UNSUPPORTED_ERP"
          | "UNSAFE_PLAN"
          | "PLAN_CHANGED"
          | "UNKNOWN_ERROR"
        message: string
        recoverable: boolean
      }
    }

function planFingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

/**
 * Previsualiza o aplica una reparación del catálogo. El modo apply exige el
 * fingerprint exacto del dry-run para impedir aplicar un plan que ya cambió.
 */
export async function repairErpCatalog(rawInput: unknown): Promise<ErpCatalogRepairResult> {
  const parsed = ErpCatalogRepairInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "La solicitud de reparación no es válida.",
        recoverable: true,
      },
    }
  }

  try {
    const adapter = getERPAdapter()
    if (!adapter.fetchCatalog) {
      return {
        success: false,
        error: {
          code: "UNSUPPORTED_ERP",
          message: "El ERP activo no permite consultar el catálogo completo.",
          recoverable: false,
        },
      }
    }

    const [snapshot, localProducts] = await Promise.all([
      adapter.fetchCatalog(),
      loadErpCatalogRepairState(),
    ])
    const planned = buildErpCatalogRepairPlan(snapshot.groups, localProducts)
    if (!planned.success) {
      return {
        success: false,
        error: {
          code: "UNSAFE_PLAN",
          message: planned.error.message,
          recoverable: planned.error.recoverable,
        },
      }
    }

    const fingerprint = planFingerprint(planned.plan)
    if (parsed.data.mode === "apply" && parsed.data.fingerprint !== fingerprint) {
      return {
        success: false,
        error: {
          code: "PLAN_CHANGED",
          message: "El catálogo cambió después del dry-run. Genera una vista previa nueva.",
          recoverable: true,
        },
      }
    }

    if (parsed.data.mode === "apply") {
      await applyErpCatalogRepairPlan(planned.plan)
    }

    return {
      success: true,
      data: {
        mode: parsed.data.mode,
        fingerprint,
        products: snapshot.groups.length,
        variants: snapshot.groups.reduce(
          (total, group) => total + group.variants.length,
          0
        ),
        moveVariants: planned.plan.moveVariants.length,
        deleteVariants: planned.plan.deleteVariantIds.length,
        deleteProducts: planned.plan.deleteProductIds.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
      },
    }
  }
}
