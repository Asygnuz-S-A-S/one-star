import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session

  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isAdminLoginPage = nextUrl.pathname === "/admin/login"
  const isCuentaRoute = nextUrl.pathname.startsWith("/cuenta")

  // Protect /admin/* — requires an admin session (userType must be "admin")
  if (isAdminRoute && !isAdminLoginPage) {
    const userType = session?.user?.userType
    if (!isLoggedIn || userType !== "admin") {
      const loginUrl = new URL("/admin/login", nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect /cuenta/* — requires a customer session
  if (isCuentaRoute) {
    const userType = session?.user?.userType
    if (!isLoggedIn || userType !== "customer") {
      const loginUrl = new URL("/login", nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*"],
}
