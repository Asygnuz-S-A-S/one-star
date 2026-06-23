import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/server/db/prisma"
import { compareSync, hashSync } from "bcryptjs"

const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? undefined

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    modelName: "AuthUser",
    additionalFields: {
      userType: {
        type: "string",
        required: false,
        defaultValue: "customer",
        // Not settable via the standard update-user endpoint
        fieldName: "userType",
        input: false,
      },
    },
  },
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5-minute client-side cache
    },
  },
  account: {
    modelName: "AuthAccount",
  },
  verification: {
    modelName: "AuthVerification",
  },
  emailAndPassword: {
    enabled: true,
    // Use bcryptjs to verify the hashes stored in our AdminUser/User tables
    password: {
      verify: ({ hash, password }) => Promise.resolve(compareSync(password, hash)),
      // El registro normal hashea por fuera y escribe el hash directamente en
      // AuthAccount, sin pasar por aquí. Pero si better-auth crea/cambia una
      // credencial por su cuenta (signUp/changePassword), DEBE hashear con
      // bcrypt para que `verify` (compareSync) funcione y no quede texto plano.
      hash: (password) => Promise.resolve(hashSync(password, 10)),
    },
  },
  // Expose userType in the session object returned to clients
  advanced: {
    crossSubDomainCookies: { enabled: false },
    // Solo exigir cookies "Secure" cuando se sirve por HTTPS. Sobre
    // http://localhost (Docker en local) las cookies Secure no se guardan,
    // lo que rompería el login. Se activa automáticamente en HTTPS.
    useSecureCookies: (baseURL ?? "").startsWith("https"),
  },
})

export type Session = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user
