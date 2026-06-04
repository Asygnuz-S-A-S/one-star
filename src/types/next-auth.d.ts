import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role?: string
      userType?: "admin" | "customer"
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    userType?: "admin" | "customer"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    userType?: "admin" | "customer"
  }
}
