import { NextRequest, NextResponse } from "next/server"

const SESSION_COOKIE = "better-auth.session_token"
const PUBLIC_PATHS = new Set(["/sign-in"])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/auth")) return NextResponse.next()
  if (pathname.startsWith("/api/auth-callback")) return NextResponse.next()
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (!hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
}
