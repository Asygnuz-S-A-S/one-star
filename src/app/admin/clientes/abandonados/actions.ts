"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: AbandonedCart model exists in schema.prisma but not yet in the generated Prisma client.
// Will resolve after `prisma generate`.
import { prisma } from "@/server/db/prisma"
import { revalidatePath } from "next/cache"

const db = prisma as any

export async function markCartRecovered(
  cartId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.abandonedCart.update({
      where: { id: cartId },
      data: { recoveredAt: new Date() },
    })
    revalidatePath("/admin/clientes/abandonados")
    return { success: true }
  } catch (error) {
    console.error("[markCartRecovered]", error)
    return { success: false, error: "No se pudo marcar como recuperado." }
  }
}
