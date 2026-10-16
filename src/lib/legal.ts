/**
 * Datos de identificación del responsable, usados por las páginas legales.
 *
 * PENDIENTE DE CONFIRMACIÓN DEL CLIENTE: la razón social, el NIT, el domicilio
 * y los canales de contacto no están en REQUERIMIENTOS.md ni en el código. Los
 * valores marcados como `PENDING` se muestran como aviso visible en la página
 * hasta que el cliente los entregue; reemplazarlos aquí actualiza ambas páginas.
 */

const PENDING = null

export interface LegalCompanyInfo {
  /** Nombre comercial. Este sí está confirmado por el manual de marca. */
  tradeName: string
  /** Razón social inscrita en cámara de comercio. */
  legalName: string | null
  /** NIT con dígito de verificación. */
  taxId: string | null
  /** Domicilio principal de notificaciones. */
  address: string | null
  /** Correo de atención al consumidor y de habeas data. */
  contactEmail: string | null
  /** Teléfono de atención al consumidor. */
  contactPhone: string | null
}

export const LEGAL_COMPANY: LegalCompanyInfo = {
  tradeName: "One Star",
  legalName: PENDING,
  taxId: PENDING,
  address: PENDING,
  contactEmail: PENDING,
  contactPhone: PENDING,
}

/** Fecha de última actualización de los documentos legales (ISO 8601). */
export const LEGAL_LAST_UPDATED = "2026-09-03"

export function formatLegalDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** true cuando falta algún dato de identificación obligatorio por ley. */
export function hasPendingCompanyData(company: LegalCompanyInfo = LEGAL_COMPANY): boolean {
  return [
    company.legalName,
    company.taxId,
    company.address,
    company.contactEmail,
  ].some((value) => value === null)
}
