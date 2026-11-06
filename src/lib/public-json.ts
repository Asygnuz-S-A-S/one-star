/** Campos internos que una API pública no debe devolver (identificadores del ERP). */
const INTERNAL_KEYS = new Set(["erpId"])

/** Copia serializable sin los campos internos, a cualquier profundidad. */
export function stripInternalFields<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (key, v) => (INTERNAL_KEYS.has(key) ? undefined : v)))
}
