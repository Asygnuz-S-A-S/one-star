import "server-only"

import * as repository from "@/server/repositories/site-logo.repository"
import {
  StoreLogoInputSchema,
  StoreLogoThemeSchema,
  StoreLogoTypeSchema,
} from "@/server/validators/site-logo.validator"

export async function getAllStoreLogos() {
  return repository.getAllStoreLogos()
}

export async function getPrimaryStoreLogos() {
  return repository.getPrimaryLogos()
}

export async function addStoreLogo(input: unknown) {
  return repository.addStoreLogo(StoreLogoInputSchema.parse(input))
}

export async function setPrimaryStoreLogo(id: string, type: string) {
  return repository.setPrimaryStoreLogo(id, StoreLogoTypeSchema.parse(type))
}

export async function updateStoreLogoTheme(id: string, theme: string) {
  return repository.updateStoreLogoTheme(id, StoreLogoThemeSchema.parse(theme))
}

export async function deleteStoreLogo(id: string) {
  return repository.deleteStoreLogo(id)
}
