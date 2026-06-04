import { auth } from "@/lib/auth"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { nextUrl } = request

  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isAdminLoginPage = nextUrl.pathname === "/admin/login"
  const isCuentaRoute = nextUrl.pathname.startsWith("/cuenta")

  if (!isAdminRoute && !isCuentaRoute) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({ headers: request.headers })
  const userType = session?.user?.userType as string | undefined

  // Protect /admin/* — requires an admin session (userType must be "admin")
  if (isAdminRoute && !isAdminLoginPage) {
    if (!session || userType !== "admin") {
      const loginUrl = new URL("/admin/login", nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect /cuenta/* — requires a customer session
  if (isCuentaRoute) {
    if (!session || userType !== "customer") {
      const loginUrl = new URL("/login", nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*"],
}
