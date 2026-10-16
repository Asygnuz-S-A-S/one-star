import { permanentRedirect } from "next/navigation"

/**
 * Ruta heredada: la grilla del inicio y enlaces antiguos apuntan a /ninos,
 * pero la categoría canónica vive en /c/ninos. Se redirige de forma permanente
 * para no dejar 404 ni duplicar la vitrina de `src/app/c/[slug]/page.tsx`.
 */
export default function NinosLegacyPage(): never {
  permanentRedirect("/c/ninos")
}
