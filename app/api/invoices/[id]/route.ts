export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { invoices, invoiceItems } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))

  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 })

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)

  return NextResponse.json({ invoice, items })
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))

  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 })

  const values: Partial<typeof invoices.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() }
  if ("invoiceNumber" in body) values.invoiceNumber = String(body.invoiceNumber)
  if ("status" in body) values.status = String(body.status)
  if ("fromName" in body) values.fromName = String(body.fromName ?? "")
  if ("fromEmail" in body) values.fromEmail = (body.fromEmail as string | null) || null
  if ("fromAddress" in body) values.fromAddress = (body.fromAddress as string | null) || null
  if ("clientName" in body) values.clientName = String(body.clientName ?? "")
  if ("clientEmail" in body) values.clientEmail = (body.clientEmail as string | null) || null
  if ("clientAddress" in body) values.clientAddress = (body.clientAddress as string | null) || null
  if ("issueDate" in body) values.issueDate = new Date(body.issueDate as string)
  if ("dueDate" in body) values.dueDate = body.dueDate ? new Date(body.dueDate as string) : null
  if ("taxRate" in body) values.taxRate = Number(body.taxRate ?? 0)
  if ("notes" in body) values.notes = (body.notes as string | null) || null

  const [updated] = await db
    .update(invoices)
    .set(values)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))
    .returning()

  // Replace items if provided
  if ("items" in body) {
    const items = (body.items as Array<{ id?: string; description: string; quantity: number; unitPrice: number }>) ?? []
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id))
    if (items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map((item, i) => ({
          id: item.id ?? nanoid(),
          invoiceId: id,
          description: item.description ?? "",
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(item.unitPrice ?? 0),
          sortOrder: i,
        })),
      )
    }
  }

  const newItems = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)

  return NextResponse.json({ invoice: updated, items: newItems })
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params
  const [deleted] = await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))
    .returning()

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
