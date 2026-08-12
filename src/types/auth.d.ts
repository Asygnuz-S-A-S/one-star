import type { auth } from "@/lib/auth"

// Re-export inferred session types from better-auth for use across the app
export type Session = typeof auth.$Infer.Session
export type SessionUser = typeof auth.$Infer.Session.user & {
  userType?: "admin" | "customer"
}
