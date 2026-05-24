export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getUserPlan, FREE_LIMIT } from "@/lib/usage"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const plan = await getUserPlan(session.user.id)

  return NextResponse.json({
    tier: plan.tier,
    invoicesThisMonth: plan.invoicesThisMonth,
    limit: plan.tier === "pro" ? null : FREE_LIMIT,
  })
}
