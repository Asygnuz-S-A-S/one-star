import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "@/server/db/prisma"
import { compareSync } from "bcryptjs"

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
      // Hashing is done externally (registration path); BA never re-hashes here
      hash: (password) => Promise.resolve(password),
    },
  },
  // Expose userType in the session object returned to clients
  advanced: {
    crossSubDomainCookies: { enabled: false },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
})

export type Session = typeof auth.$Infer.Session
export type AuthUser = typeof auth.$Infer.Session.user
