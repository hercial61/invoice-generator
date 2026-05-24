import { db } from "@/lib/db"
import { userPlans } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export const FREE_LIMIT = 3

function isNewPeriod(periodStart: Date): boolean {
  const now = new Date()
  return now.getMonth() !== periodStart.getMonth() || now.getFullYear() !== periodStart.getFullYear()
}

export async function getUserPlan(userId: string) {
  let [plan] = await db.select().from(userPlans).where(eq(userPlans.userId, userId))

  if (!plan) {
    const now = new Date()
    ;[plan] = await db
      .insert(userPlans)
      .values({ id: nanoid(), userId, tier: "free", invoicesThisMonth: 0, periodStart: now, updatedAt: now })
      .returning()
  }

  if (isNewPeriod(plan.periodStart)) {
    const now = new Date()
    ;[plan] = await db
      .update(userPlans)
      .set({ invoicesThisMonth: 0, periodStart: now, updatedAt: now })
      .where(eq(userPlans.userId, userId))
      .returning()
  }

  return plan
}

export async function checkCanCreateInvoice(userId: string) {
  const plan = await getUserPlan(userId)
  const atLimit = plan.tier === "free" && plan.invoicesThisMonth >= FREE_LIMIT
  return {
    allowed: !atLimit,
    count: plan.invoicesThisMonth,
    limit: plan.tier === "pro" ? null : FREE_LIMIT,
    tier: plan.tier,
  }
}

export async function incrementInvoiceCount(userId: string) {
  const plan = await getUserPlan(userId)
  await db
    .update(userPlans)
    .set({ invoicesThisMonth: plan.invoicesThisMonth + 1, updatedAt: new Date() })
    .where(eq(userPlans.userId, userId))
}
