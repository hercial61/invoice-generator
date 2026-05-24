export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return NextResponse.redirect(new URL("/sign-in", appUrl))
  return NextResponse.redirect(new URL("/invoices", appUrl))
}
