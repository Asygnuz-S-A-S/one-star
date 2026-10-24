import "server-only"

import { z } from "zod"

/** ID de píxel de Meta: numérico, normalmente 15–16 dígitos. */
const META_PIXEL_ID_PATTERN = /^\d{5,20}$/
/** Código de prueba del Events Manager (ej. TEST12345). */
const META_TEST_EVENT_CODE_PATTERN = /^[A-Za-z0-9]{1,30}$/
/** Teléfono en formato internacional: dígitos con "+" opcional. */
const WHATSAPP_PATTERN = /^\+?\d{7,15}$/

/** "" → null para campos opcionales que llegan vacíos desde un formulario. */
const emptyToNull = (value: string) => (value.length === 0 ? null : value)

const copAmount = z
  .string()
  .trim()
  .regex(/^\d{1,8}$/, "Escribe el valor en pesos, sin puntos ni decimales")
  .transform((value) => Number(value))
  .pipe(z.number().int().min(0).max(50_000_000, "El valor no puede superar $50.000.000"))

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No puede superar ${max} caracteres`)
    .transform(emptyToNull)

export const StoreInfoInputSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, "El nombre de la tienda es obligatorio")
    .max(80, "El nombre no puede superar 80 caracteres"),
  contactEmail: z
    .union([z.literal(""), z.email("El email de contacto no es válido").max(120)])
    .transform(emptyToNull),
  whatsapp: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(
      z.union([
        z.literal(""),
        z.string().regex(WHATSAPP_PATTERN, "Usa el formato internacional, ej. +573001234567"),
      ]),
    )
    .transform(emptyToNull),
  freeShippingThreshold: copAmount,
  standardShippingCost: copAmount,
  expressShippingCost: copAmount,
  legalName: optionalText(160),
  taxId: optionalText(40),
  legalAddress: optionalText(200),
  contactPhone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(
      z.union([
        z.literal(""),
        z.string().regex(WHATSAPP_PATTERN, "Usa el formato internacional, ej. +576066666666"),
      ]),
    )
    .transform(emptyToNull),
  hideImagelessProducts: z.boolean(),
  newArrivalDays: z.coerce.number().int().min(1, "Usa al menos 1 día").max(365, "No puede superar 365 días"),
  chatEnabled: z.boolean(),
  chatWelcome: optionalText(400),
  giftCardMinAmount: copAmount,
  giftCardMaxAmount: copAmount,
  giftCardValidityMonths: z.coerce.number().int().min(1, "La vigencia mínima es 1 mes").max(36, "La vigencia no puede superar 36 meses"),
  clubHeadline: optionalText(80),
  clubIntro: optionalText(400),
  clubBenefits: optionalText(2000),
  clubWelcomeSubject: optionalText(120),
  clubWelcomeBody: optionalText(800),
  footerLinks: optionalText(2000),
}).refine((input) => input.giftCardMinAmount <= input.giftCardMaxAmount, {
  message: "El monto mínimo no puede ser mayor que el máximo",
  path: ["giftCardMinAmount"],
})

export type StoreInfoInput = z.infer<typeof StoreInfoInputSchema>

export const MetaPixelInputSchema = z
  .object({
    enabled: z.boolean(),
    pixelId: z
      .union([
        z.literal(""),
        z.string().regex(META_PIXEL_ID_PATTERN, "El ID del píxel solo contiene números"),
      ])
      .transform(emptyToNull),
    /** Vacío = conservar el token guardado. Se guarda tal cual, sin recortes. */
    accessToken: z.string().max(1000, "El token es demasiado largo").transform(emptyToNull),
    clearAccessToken: z.boolean().default(false),
    testEventCode: z
      .union([
        z.literal(""),
        z.string().regex(META_TEST_EVENT_CODE_PATTERN, "El código de prueba solo usa letras y números"),
      ])
      .transform(emptyToNull),
  })
  .refine((input) => !input.enabled || input.pixelId !== null, {
    message: "Para activar el píxel necesitas su ID",
    path: ["pixelId"],
  })

export type MetaPixelInput = z.infer<typeof MetaPixelInputSchema>

export const CatalogSourceInputSchema = z.object({
  catalogSource: z.enum(["ERP", "ARCHIVO"], {
    message: "La fuente debe ser ERP o ARCHIVO",
  }),
})

export type CatalogSourceInput = z.infer<typeof CatalogSourceInputSchema>
