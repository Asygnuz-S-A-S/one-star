import { createAuthClient } from "better-auth/react"
import type { auth } from "./auth"

export const authClient = createAuthClient<typeof auth>({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
})

export const { signIn, signOut, useSession } = authClient
