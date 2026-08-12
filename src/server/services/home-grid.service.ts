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
  // We allow partial updates, so we don't strictly parse with the full schema
  // But we could use `HomeGridBlockSchema.partial().parse(data)`
  const validData = HomeGridBlockSchema.partial().parse(data)
  return repo.updateGridBlock(id, validData)
}

export async function deleteGridBlock(id: string) {
  return repo.deleteGridBlock(id)
}

export async function updateGridBlocksPositions(updates: { id: string; position: number }[]) {
  return repo.updateGridBlocksPositions(updates)
}
