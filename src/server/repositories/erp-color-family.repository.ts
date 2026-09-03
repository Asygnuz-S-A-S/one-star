import "server-only"

import { createHash } from "node:crypto"
import { prisma } from "@/server/db/prisma"
import {
  prepareErpColorFamilyReconciliation,
  type ErpColorFamilyCandidate,
  type ErpColorFamilyKeyUpdate,
  type ErpColorFamilyReconciliation,
} from "@/server/domain/erp-color-family.plan"

const candidateSelect = {
  id: true,
  slug: true,
  erpId: true,
  erpColorFamilyKey: true,
  brand: { select: { erpId: true } },
  colorFamilyId: true,
  colorFamily: { select: { erpColorFamilyKey: true } },
  variants: { select: { color: true } },
} as const

type CandidateRow = Awaited<ReturnType<typeof findCandidateRows>>[number]

async function findCandidateRows() {
  return prisma.product.findMany({
    where: {
      OR: [
        { erpId: { not: null } },
        { erpColorFamilyKey: { not: null } },
        { colorFamilyId: { not: null } },
      ],
    },
    orderBy: { id: "asc" },
    select: candidateSelect,
  })
}

function toCandidate(row: CandidateRow): ErpColorFamilyCandidate {
  return {
    id: row.id,
    erpColorFamilyKey: row.erpColorFamilyKey,
    colorFamilyId: row.colorFamilyId,
    colorFamilyErpKey: row.colorFamily?.erpColorFamilyKey ?? null,
    colors: row.variants.map((variant) => variant.color),
    eligible: false,
  }
}

export interface ErpColorFamilyBackfillProduct extends ErpColorFamilyCandidate {
  slug: string
  erpId: string | null
  brandErpId: string | null
}

export async function findErpColorFamilyBackfillProducts(): Promise<
  ErpColorFamilyBackfillProduct[]
> {
  const rows = await findCandidateRows()
  return rows.map((row) => ({
    ...toCandidate(row),
    slug: row.slug,
    erpId: row.erpId,
    brandErpId: row.brand?.erpId ?? null,
  }))
}

export function fingerprintErpColorFamilyReconciliation(
  reconciliation: ErpColorFamilyReconciliation
): string {
  return createHash("sha256")
    .update(JSON.stringify(reconciliation))
    .digest("hex")
}

export async function applyErpColorFamilyKeyUpdates(
  updates: readonly ErpColorFamilyKeyUpdate[],
  expectedFingerprint?: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('onestar-product-color-family'))`

    const rows = await tx.product.findMany({
      where: {
        OR: [
          { erpId: { not: null } },
          { erpColorFamilyKey: { not: null } },
          { colorFamilyId: { not: null } },
        ],
      },
      orderBy: { id: "asc" },
      select: candidateSelect,
    })
    const candidates = rows.map((row) => toCandidate(row as CandidateRow))
    const reconciliation = prepareErpColorFamilyReconciliation(
      candidates,
      [...updates].sort((a, b) => a.productId.localeCompare(b.productId))
    )
    const fingerprint = fingerprintErpColorFamilyReconciliation(reconciliation)

    if (expectedFingerprint && fingerprint !== expectedFingerprint) {
      throw new Error(
        "El catálogo cambió después del preview. Genera una previsualización nueva antes de aplicar."
      )
    }

    const rowsById = new Map(rows.map((row) => [row.id, row]))
    for (const update of reconciliation.changedUpdates) {
      const current = rowsById.get(update.productId)
      await tx.product.update({
        where: { id: update.productId },
        data: {
          erpColorFamilyKey: update.key,
          ...(current?.colorFamily?.erpColorFamilyKey
            ? { colorFamilyId: null }
            : {}),
        },
      })
    }

    // Si todos los miembros abandonaron una clave, liberar esa clave antes de
    // crear su familia de reemplazo. Las familias con un miembro se conservan
    // hasta después de las adhesiones porque el mismo plan puede completarlas.
    for (const familyId of reconciliation.automaticFamilyIdsToDetach) {
      const remaining = await tx.product.count({ where: { colorFamilyId: familyId } })
      if (remaining === 0) {
        await tx.productColorFamily.delete({ where: { id: familyId } })
      }
    }

    for (const action of reconciliation.plan.actions) {
      if (action.mode === "create") {
        const family = await tx.productColorFamily.create({
          data: { erpColorFamilyKey: action.key },
        })
        await tx.product.updateMany({
          where: { id: { in: action.memberIds }, colorFamilyId: null },
          data: { colorFamilyId: family.id },
        })
      } else if (action.familyId) {
        await tx.product.updateMany({
          where: { id: { in: action.memberIds }, colorFamilyId: null },
          data: { colorFamilyId: action.familyId },
        })
      }
    }

    // Limpiar después de las adhesiones: una familia que pierde un miembro
    // puede recibir otro en el mismo plan y debe conservar su identidad.
    for (const familyId of reconciliation.automaticFamilyIdsToDetach) {
      const familyExists = await tx.productColorFamily.count({ where: { id: familyId } })
      if (familyExists === 0) continue
      const remaining = await tx.product.count({ where: { colorFamilyId: familyId } })
      if (remaining < 2) {
        await tx.product.updateMany({
          where: { colorFamilyId: familyId },
          data: { colorFamilyId: null },
        })
        await tx.productColorFamily.delete({ where: { id: familyId } })
      }
    }

    return { fingerprint, reconciliation }
  })
}
