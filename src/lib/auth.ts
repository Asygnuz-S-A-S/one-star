import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/server/db/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    // ── Admin provider ──────────────────────────────────────────────────
    Credentials({
      id: "admin",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        })

        if (!admin) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          admin.passwordHash
        )

        if (!passwordMatch) return null

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          userType: "admin",
        }
      },
    }),

    // ── Customer provider ───────────────────────────────────────────────
    Credentials({
      id: "customer",
      name: "Customer Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!passwordMatch) return null

        // TODO: remove cast once prisma generate runs with new fields
        const u = user as typeof user & { name?: string | null }

        return {
          id: user.id,
          email: user.email,
          name: u.name ?? null,
          role: "CUSTOMER",
          userType: "customer",
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if ("role" in user) {
          token.role = user.role as string
        }
        if ("userType" in user) {
          token.userType = user.userType as "admin" | "customer"
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as string
      }
      if (token.userType) {
        session.user.userType = token.userType as "admin" | "customer"
      }
      return session
    },
  },
  pages: { signIn: "/admin/login" },
})
