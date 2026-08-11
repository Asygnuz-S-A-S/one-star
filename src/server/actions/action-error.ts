import "server-only"

import { ZodError } from "zod"

export function getActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message || fallback
  }
  return fallback
}
