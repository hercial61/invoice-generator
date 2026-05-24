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
      .values({ id: nanoid(), userId, tier: "free", usageThisMonth: 0, periodStart: now, updatedAt: now })
      .returning()
  }

  if (isNewPeriod(plan.periodStart)) {
    const now = new Date()
    ;[plan] = await db
      .update(userPlans)
      .set({ usageThisMonth: 0, periodStart: now, updatedAt: now })
      .where(eq(userPlans.userId, userId))
      .returning()
  }

  return plan
}

export async function checkCanCreateInvoice(userId: string) {
  const plan = await getUserPlan(userId)
  const atLimit = plan.tier === "free" && plan.usageThisMonth >= FREE_LIMIT
  return {
    allowed: !atLimit,
    count: plan.usageThisMonth,
    limit: plan.tier === "pro" ? null : FREE_LIMIT,
    tier: plan.tier,
  }
}

export async function incrementInvoiceCount(userId: string) {
  const plan = await getUserPlan(userId)
  await db
    .update(userPlans)
    .set({ usageThisMonth: plan.usageThisMonth + 1, updatedAt: new Date() })
    .where(eq(userPlans.userId, userId))
}
