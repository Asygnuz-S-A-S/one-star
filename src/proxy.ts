import { auth } from "@/lib/auth"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const { nextUrl } = request

  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isAdminLoginPage = nextUrl.pathname === "/admin/login"
  const isCuentaRoute = nextUrl.pathname.startsWith("/cuenta")

  if (!isAdminRoute && !isCuentaRoute) {
    return NextResponse.next()
  }

  // Skip session check on the login pages themselves to avoid redirect loops
  if (isAdminLoginPage || nextUrl.pathname === "/login") {
    return NextResponse.next()
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null
  try {
    session = await auth.api.getSession({ headers: request.headers })
  } catch {
    // If session check fails (e.g. misconfigured auth), treat as unauthenticated
  }
  const userType = session?.user?.userType as string | undefined

  if (isAdminRoute && !isAdminLoginPage) {
    if (!session || userType !== "admin") {
      const loginUrl = new URL("/admin/login", nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

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
