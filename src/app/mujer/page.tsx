import { permanentRedirect } from "next/navigation"

/**
 * Ruta heredada: la grilla del inicio y enlaces antiguos apuntan a /mujer,
 * pero la categoría canónica vive en /c/mujer. Se redirige de forma permanente
 * para no dejar 404 ni duplicar la vitrina de `src/app/c/[slug]/page.tsx`.
 */
export default function MujerLegacyPage(): never {
  permanentRedirect("/c/mujer")
}
