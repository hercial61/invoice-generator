export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { createLsCheckout } from "@/lib/ls"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const url = await createLsCheckout(
    session.user.email,
    session.user.id,
    process.env.NEXT_PUBLIC_APP_URL!,
  )

  if (!url) return NextResponse.json({ error: "checkout_failed" }, { status: 500 })

  return NextResponse.json({ url })
}
