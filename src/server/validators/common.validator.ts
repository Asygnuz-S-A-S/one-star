import "server-only"

import { z } from "zod"

export const EntityIdSchema = z.string().trim().min(1, "El identificador es obligatorio")
export const ActiveStateSchema = z.boolean()
