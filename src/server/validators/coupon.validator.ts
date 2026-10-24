import "server-only"

import { z } from "zod"

const finiteNumber = (message: string) =>
  z.string().trim().refine((value) => Number.isFinite(Number(value)), message).transform(Number)

const optionalNumber = (minimum: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    finiteNumber(message).pipe(z.number().min(minimum, message)).nullable()
  )

const optionalPositiveInteger = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  finiteNumber("El máximo de usos debe ser un número válido.")
    .pipe(z.number().int("El máximo de usos debe ser un entero.").positive("El máximo de usos debe ser mayor que cero."))
    .nullable()
)

const optionalCategoryId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().pipe(z.cuid("La categoría no es válida.")).nullable()
)

const validDate = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) return value
    const [, year, month, day] = match
    const date = new Date(`${value}T00:00:00.000Z`)
    return date.getUTCFullYear() === Number(year) && date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)
      ? date
      : value
  },
  z.date({ message: "La fecha no es válida." })
)

export const createCouponSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio.").max(100).transform((value) => value.toUpperCase()),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], { message: "El tipo de descuento no es válido." }),
  discountValue: finiteNumber("El valor del descuento debe ser un número válido.").pipe(
    z.number().positive("El valor del descuento debe ser mayor que cero.")
  ),
  minOrderAmount: optionalNumber(0, "El pedido mínimo debe ser un número mayor o igual a cero."),
  maxUses: optionalPositiveInteger,
  categoryId: optionalCategoryId,
  validFrom: validDate,
  validUntil: validDate,
  isActive: z.boolean(),
  clubOnly: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "El porcentaje no puede superar 100%." })
  }
  if (data.validUntil <= data.validFrom) {
    ctx.addIssue({ code: "custom", path: ["validUntil"], message: "La fecha de fin debe ser posterior a la fecha de inicio." })
  }
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
