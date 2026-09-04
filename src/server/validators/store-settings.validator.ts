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
