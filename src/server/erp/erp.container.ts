import "server-only"
import type { IERPAdapter } from "./ports/erp.port"
import { NullERPAdapter } from "./adapters/null.adapter"

/**
 * Contenedor de dependencias ERP.
 *
 * ESTE ES EL ÚNICO LUGAR EN TODA LA APLICACIÓN que decide qué adaptador
 * ERP se instancia. Se controla exclusivamente por la variable de entorno
 * ERP_PROVIDER.
 *
 * Para cambiar de Alegra a otro ERP:
 *   1. Crear el nuevo adaptador en `adapters/<nombre>.adapter.ts`
 *   2. Agregar el case correspondiente aquí
 *   3. Cambiar ERP_PROVIDER en .env
 *
 * Cero cambios en services, actions, páginas o API routes.
 *
 * Variables de entorno:
 *   ERP_PROVIDER     = "alegra" | "siigo" | "null"  (default: "null")
 *   ALEGRA_EMAIL     = tu@email.com
 *   ALEGRA_API_KEY   = xxxxxxxxxxxxxxxx
 */

let _adapter: IERPAdapter | null = null
let _cachedProvider: string | null = null

export function getERPAdapter(): IERPAdapter {
  const provider = (process.env.ERP_PROVIDER ?? "null").toLowerCase().trim()

  // Singleton: si ya existe para el mismo provider, reutilizar
  if (_adapter && _cachedProvider === provider) return _adapter

  _cachedProvider = provider

  switch (provider) {
    case "alegra": {
      const email = process.env.ALEGRA_EMAIL
      const apiKey = process.env.ALEGRA_API_KEY

      if (!email || !apiKey) {
        console.error(
          "[ERP Container] ERP_PROVIDER=alegra pero faltan ALEGRA_EMAIL y/o ALEGRA_API_KEY. " +
          "Usando NullERPAdapter como fallback."
        )
        _adapter = new NullERPAdapter()
        break
      }

      // Importación dinámica para que Next.js no incluya el cliente de
      // Alegra en el bundle del cliente (solo corre en el servidor).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AlegraERPAdapter } = require("./adapters/alegra.adapter") as {
        AlegraERPAdapter: new (email: string, apiKey: string) => IERPAdapter
      }
      _adapter = new AlegraERPAdapter(email, apiKey)
      console.info("[ERP Container] Adaptador activo: Alegra ✓")
      break
    }

    case "loggro": {
      const token = process.env.LOGGRO_API_TOKEN

      if (!token) {
        console.error(
          "[ERP Container] ERP_PROVIDER=loggro pero falta LOGGRO_API_TOKEN. " +
          "Usando NullERPAdapter como fallback."
        )
        _adapter = new NullERPAdapter()
        break
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LoggroERPAdapter } = require("./adapters/loggro.adapter") as {
        LoggroERPAdapter: new (token: string) => IERPAdapter
      }
      _adapter = new LoggroERPAdapter(token)
      console.info("[ERP Container] Adaptador activo: Loggro ✓")
      break
    }

    // ── Plantilla para futuros ERPs ───────────────────────────────────────────
    // case "siigo": {
    //   const { SiigoERPAdapter } = require("./adapters/siigo.adapter")
    //   _adapter = new SiigoERPAdapter(
    //     process.env.SIIGO_CLIENT_ID!,
    //     process.env.SIIGO_CLIENT_SECRET!,
    //   )
    //   console.info("[ERP Container] Adaptador activo: Siigo ✓")
    //   break
    // }
    //
    // case "world_office": {
    //   const { WorldOfficeERPAdapter } = require("./adapters/world-office.adapter")
    //   _adapter = new WorldOfficeERPAdapter(process.env.WORLD_OFFICE_URL!)
    //   console.info("[ERP Container] Adaptador activo: World Office ✓")
    //   break
    // }

    case "null":
    default:
      _adapter = new NullERPAdapter()
      console.info(`[ERP Container] Adaptador activo: Null (ERP_PROVIDER="${provider}")`)
  }

  return _adapter
}

/**
 * Reinicia el singleton del adaptador.
 * SOLO usar en tests — en producción el adaptador es inmutable en runtime.
 */
export function resetERPAdapter(): void {
  _adapter = null
}
