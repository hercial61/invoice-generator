export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { auth } from "@/lib/auth"
import { getUserPlan } from "@/lib/usage"
import { db } from "@/lib/db"
import { userPlans } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const stripe = getStripe()
  const plan = await getUserPlan(session.user.id)

  let customerId = plan.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    })
    customerId = customer.id
    await db
      .update(userPlans)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(userPlans.userId, session.user.id))
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices?upgraded=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/invoices`,
    metadata: { userId: session.user.id },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
