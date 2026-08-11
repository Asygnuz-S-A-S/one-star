import "server-only"

import * as repository from "@/server/repositories/navigation.repository"
import {
  NavigationItemInputSchema,
  NavigationPositionsSchema,
  type NavigationItemInput,
} from "@/server/validators/navigation.validator"

export async function getAllNavigationItems() {
  return repository.getAllNavigationItems()
}

export async function createNavigationItem(input: NavigationItemInput) {
  const data = NavigationItemInputSchema.parse(input)
  const position = (await repository.getMaximumNavigationPosition()) + 1
  return repository.createNavigationItem({ ...data, position })
}

export async function updateNavigationItem(id: string, input: NavigationItemInput) {
  const data = NavigationItemInputSchema.parse(input)
  return repository.updateNavigationItem(id, data)
}

export async function deleteNavigationItem(id: string) {
  return repository.deleteNavigationItem(id)
}

export async function updateNavigationPositions(updates: { id: string; position: number }[]) {
  return repository.updateNavigationPositions(NavigationPositionsSchema.parse(updates))
}

export async function setNavigationItemActive(id: string, isActive: boolean) {
  return repository.updateNavigationItem(id, { isActive })
}
