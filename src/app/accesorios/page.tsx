import { permanentRedirect } from "next/navigation"

/**
 * Ruta heredada: la grilla del inicio y enlaces antiguos apuntan a /accesorios,
 * pero la categoría canónica vive en /c/accesorios. Se redirige de forma permanente
 * para no dejar 404 ni duplicar la vitrina de `src/app/c/[slug]/page.tsx`.
 */
export default function AccesoriosLegacyPage(): never {
  permanentRedirect("/c/accesorios")
}
