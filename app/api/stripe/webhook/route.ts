import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/db"
import { userPlans } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session
    const userId = cs.metadata?.userId
    if (userId) {
      await db
        .update(userPlans)
        .set({
          tier: "pro",
          stripeCustomerId: cs.customer as string,
          stripeSubscriptionId: cs.subscription as string,
          updatedAt: new Date(),
        })
        .where(eq(userPlans.userId, userId))
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    await db
      .update(userPlans)
      .set({ tier: "free", stripeSubscriptionId: null, updatedAt: new Date() })
      .where(eq(userPlans.stripeSubscriptionId, sub.id))
  }

  return NextResponse.json({ received: true })
}
