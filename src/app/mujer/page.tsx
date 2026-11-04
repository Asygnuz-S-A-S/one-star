import { permanentRedirect } from "next/navigation"

/**
 * Ruta heredada: la grilla del inicio y enlaces antiguos apuntan a /mujer,
 * y el catálogo ya filtra por género. /c/* depende de que exista la categoría, y en
 * producción no existe: redirigir allá terminaba en 404.
 */
export default function MujerLegacyPage(): never {
  permanentRedirect("/productos?genero=mujer")
}
