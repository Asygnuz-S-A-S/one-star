import "server-only"
import * as repo from "../repositories/home-grid.repository"
import { HomeGridBlockSchema, type HomeGridBlockInput } from "../validators/home-grid.validator"

export async function getVisibleGridBlocks() {
  return repo.getVisibleGridBlocks()
}

export async function getAllGridBlocks() {
  return repo.getAllGridBlocks()
}

export async function getGridBlockById(id: string) {
  return repo.getGridBlockById(id)
}

export async function createGridBlock(data: HomeGridBlockInput) {
  const validData = HomeGridBlockSchema.parse(data)
  
  // Calculate position: put it at the end if not specified
  const allBlocks = await repo.getAllGridBlocks()
  const position = validData.position || (allBlocks.length > 0 ? Math.max(...allBlocks.map(b => b.position)) + 1 : 0)

  return repo.createGridBlock({
    ...validData,
    position,
  })
}

export async function updateGridBlock(id: string, data: Partial<HomeGridBlockInput>) {
  const validData = HomeGridBlockSchema.partial().parse(data)

  // `.partial()` no desactiva los `.default()` del esquema: Zod rellena
  // darkText, position e isActive aunque el llamador no los envíe. Escribirlos
  // tal cual reiniciaría la posición del bloque y lo reactivaría al cambiar
  // solo la etiqueta, o al alternar su visibilidad desde el Landing Builder.
  // Por eso solo se persisten las claves que sí venían en la entrada.
  const changes = Object.fromEntries(
    Object.keys(data)
      .filter((key): key is keyof typeof validData => key in validData)
      .map((key) => [key, validData[key]])
  )

  return repo.updateGridBlock(id, changes)
}

export async function deleteGridBlock(id: string) {
  return repo.deleteGridBlock(id)
}

export async function updateGridBlocksPositions(updates: { id: string; position: number }[]) {
  return repo.updateGridBlocksPositions(updates)
}
