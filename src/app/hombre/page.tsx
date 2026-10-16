import { permanentRedirect } from "next/navigation"

/**
 * Ruta heredada: la grilla del inicio y enlaces antiguos apuntan a /hombre,
 * pero la categoría canónica vive en /c/hombre. Se redirige de forma permanente
 * para no dejar 404 ni duplicar la vitrina de `src/app/c/[slug]/page.tsx`.
 */
export default function HombreLegacyPage(): never {
  permanentRedirect("/c/hombre")
}
