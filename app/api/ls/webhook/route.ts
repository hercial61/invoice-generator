import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { userPlans } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyLsWebhook } from "@/lib/ls"

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-signature") ?? ""

  if (!verifyLsWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 })
  }

  const payload = JSON.parse(rawBody)
  const eventName: string = payload.meta?.event_name ?? ""
  const userId: string | undefined = payload.meta?.custom_data?.user_id
  const subscriptionId: string | undefined = String(payload.data?.id ?? "")
  const customerId: string | undefined = String(payload.data?.attributes?.customer_id ?? "")
  const status: string = payload.data?.attributes?.status ?? ""

  if (eventName === "subscription_created" && userId) {
    await db
      .update(userPlans)
      .set({ tier: "pro", lsCustomerId: customerId, lsSubscriptionId: subscriptionId, updatedAt: new Date() })
      .where(eq(userPlans.userId, userId))
  }

  if (
    eventName === "subscription_expired" ||
    (eventName === "subscription_updated" && status === "expired")
  ) {
    if (subscriptionId) {
      await db
        .update(userPlans)
        .set({ tier: "free", lsSubscriptionId: null, updatedAt: new Date() })
        .where(eq(userPlans.lsSubscriptionId, subscriptionId))
    }
  }

  return NextResponse.json({ received: true })
}
