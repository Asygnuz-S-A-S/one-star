import "server-only"

import { isRealColor } from "@/lib/colors"
import { normalizeColor } from "@/lib/product-image"

export interface ErpColorFamilyCandidate {
  id: string
  erpColorFamilyKey: string | null
  colorFamilyId: string | null
  colorFamilyErpKey: string | null
  colors: readonly string[]
  /** Solo productos nuevos o cuya clave cambió pueden ser reinsertados automáticamente. */
  eligible: boolean
}

export interface ErpColorFamilyAction {
  mode: "create" | "add"
  key: string
  familyId: string | null
  memberIds: string[]
}

export type ErpColorFamilyOmissionReason =
  | "INSUFFICIENT_COLORS"
  | "INVALID_COLOR"
  | "DUPLICATE_COLOR"
  | "MANUAL_FAMILY"
  | "FAMILY_CONFLICT"

export interface ErpColorFamilyPlan {
  actions: ErpColorFamilyAction[]
  omissions: Array<{
    key: string
    reason: ErpColorFamilyOmissionReason
    productIds: string[]
  }>
  unchangedKeys: string[]
}

export interface ErpColorFamilyKeyUpdate {
  productId: string
  key: string | null
}

export interface ErpColorFamilyReconciliation {
  changedUpdates: ErpColorFamilyKeyUpdate[]
  automaticFamilyIdsToDetach: string[]
  plan: ErpColorFamilyPlan
}

function firstRealColor(candidate: ErpColorFamilyCandidate): string | undefined {
  const colors = [
    ...new Set(candidate.colors.filter(isRealColor).map((color) => normalizeColor(color))),
  ]
  return colors.length === 1 ? colors[0] : undefined
}

export function planErpColorFamilies(
  candidates: readonly ErpColorFamilyCandidate[]
): ErpColorFamilyPlan {
  const groups = new Map<string, ErpColorFamilyCandidate[]>()
  for (const candidate of candidates) {
    if (!candidate.erpColorFamilyKey) continue
    const group = groups.get(candidate.erpColorFamilyKey) ?? []
    group.push(candidate)
    groups.set(candidate.erpColorFamilyKey, group)
  }

  const actions: ErpColorFamilyAction[] = []
  const omissions: ErpColorFamilyPlan["omissions"] = []
  const unchangedKeys: string[] = []

  for (const [key, group] of groups) {
    const productIds = group.map((candidate) => candidate.id)
    if (
      group.some(
        (candidate) => candidate.colorFamilyId && !candidate.colorFamilyErpKey
      )
    ) {
      omissions.push({ key, reason: "MANUAL_FAMILY", productIds })
      continue
    }

    const foreignAutomaticFamily = group.some(
      (candidate) =>
        candidate.colorFamilyId &&
        candidate.colorFamilyErpKey &&
        candidate.colorFamilyErpKey !== key
    )
    const automaticFamilyIds = [
      ...new Set(
        group
          .filter((candidate) => candidate.colorFamilyErpKey === key)
          .map((candidate) => candidate.colorFamilyId)
          .filter((familyId): familyId is string => Boolean(familyId))
      ),
    ]
    if (foreignAutomaticFamily || automaticFamilyIds.length > 1) {
      omissions.push({ key, reason: "FAMILY_CONFLICT", productIds })
      continue
    }

    const automaticFamilyId = automaticFamilyIds[0] ?? null
    const eligibleFree = group.filter(
      (candidate) => candidate.eligible && !candidate.colorFamilyId
    )
    const existingAutomaticMembers = automaticFamilyId
      ? group.filter((candidate) => candidate.colorFamilyId === automaticFamilyId)
      : []
    const participants = automaticFamilyId
      ? [...existingAutomaticMembers, ...eligibleFree]
      : eligibleFree
    const colors = participants.map(firstRealColor)
    const invalidIds = participants
      .filter((candidate) => !firstRealColor(candidate))
      .map((candidate) => candidate.id)
    if (invalidIds.length > 0) {
      omissions.push({ key, reason: "INVALID_COLOR", productIds: invalidIds })
      continue
    }
    if (new Set(colors).size !== colors.length) {
      omissions.push({ key, reason: "DUPLICATE_COLOR", productIds })
      continue
    }

    if (automaticFamilyId) {
      if (eligibleFree.length > 0) {
        actions.push({
          mode: "add",
          key,
          familyId: automaticFamilyId,
          memberIds: eligibleFree.map((candidate) => candidate.id),
        })
      } else {
        unchangedKeys.push(key)
      }
      continue
    }

    if (participants.length >= 2) {
      actions.push({
        mode: "create",
        key,
        familyId: null,
        memberIds: participants.map((candidate) => candidate.id),
      })
    } else {
      omissions.push({ key, reason: "INSUFFICIENT_COLORS", productIds })
    }
  }

  return { actions, omissions, unchangedKeys }
}

export function prepareErpColorFamilyReconciliation(
  candidates: readonly ErpColorFamilyCandidate[],
  updates: readonly ErpColorFamilyKeyUpdate[]
): ErpColorFamilyReconciliation {
  const updatesById = new Map(updates.map((update) => [update.productId, update.key]))
  const changedUpdates: ErpColorFamilyKeyUpdate[] = []
  const automaticFamilyIdsToDetach = new Set<string>()

  const projected = candidates.map((candidate) => {
    const requestedKey = updatesById.get(candidate.id)
    const hasUpdate = updatesById.has(candidate.id)
    const changed = hasUpdate && requestedKey !== candidate.erpColorFamilyKey
    if (changed) {
      changedUpdates.push({ productId: candidate.id, key: requestedKey ?? null })
      if (candidate.colorFamilyId && candidate.colorFamilyErpKey) {
        automaticFamilyIdsToDetach.add(candidate.colorFamilyId)
      }
    }

    return {
      ...candidate,
      erpColorFamilyKey: hasUpdate ? requestedKey ?? null : candidate.erpColorFamilyKey,
      colorFamilyId:
        changed && candidate.colorFamilyErpKey ? null : candidate.colorFamilyId,
      colorFamilyErpKey:
        changed && candidate.colorFamilyErpKey ? null : candidate.colorFamilyErpKey,
      eligible: changed,
    }
  })

  return {
    changedUpdates,
    automaticFamilyIdsToDetach: [...automaticFamilyIdsToDetach],
    plan: planErpColorFamilies(projected),
  }
}
