"use server"

import {
  getAddiWidgetEvaluation,
  type AddiWidgetEvaluation,
} from "@/server/services/addi-config.service"

export async function getAddiWidgetEvaluationAction(
  amount: number
): Promise<AddiWidgetEvaluation | null> {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return null
  }
  return getAddiWidgetEvaluation(amount)
}
