import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/server/db/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
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
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "role" in user) {
        token.role = user.role as string
      }
      return token
    },
    async session({ session, token }) {
      if (token.role) {
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: { signIn: "/admin/login" },
})
