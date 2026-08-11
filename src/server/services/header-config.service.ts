import "server-only"

import * as repository from "@/server/repositories/header-config.repository"
import { HeaderConfigInputSchema } from "@/server/validators/header-config.validator"

export async function getHeaderConfig() {
  return repository.getHeaderConfig()
}

export async function updateHeaderConfig(input: unknown) {
  return repository.updateHeaderConfig(HeaderConfigInputSchema.parse(input))
}
