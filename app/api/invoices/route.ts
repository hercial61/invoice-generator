export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { invoices, invoiceItems } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, session.user.id))
    .orderBy(desc(invoices.createdAt))

  return NextResponse.json({ invoices: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  const invoiceId = nanoid()
  const now = new Date()

  // Auto-number: count user's invoices + 1
  const existing = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.userId, session.user.id))
  const num = String(existing.length + 1).padStart(4, "0")
  const invoiceNumber = (body.invoiceNumber as string | undefined)?.trim() || `INV-${num}`

  const [invoice] = await db
    .insert(invoices)
    .values({
      id: invoiceId,
      userId: session.user.id,
      invoiceNumber,
      status: "draft",
      fromName: String(body.fromName ?? ""),
      fromEmail: (body.fromEmail as string | null) || null,
      fromAddress: (body.fromAddress as string | null) || null,
      clientName: String(body.clientName ?? ""),
      clientEmail: (body.clientEmail as string | null) || null,
      clientAddress: (body.clientAddress as string | null) || null,
      issueDate: body.issueDate ? new Date(body.issueDate as string) : now,
      dueDate: body.dueDate ? new Date(body.dueDate as string) : null,
      taxRate: Number(body.taxRate ?? 0),
      notes: (body.notes as string | null) || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const items = (body.items as Array<{ description: string; quantity: number; unitPrice: number }> | undefined) ?? []
  if (items.length > 0) {
    await db.insert(invoiceItems).values(
      items.map((item, i) => ({
        id: nanoid(),
        invoiceId,
        description: item.description ?? "",
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unitPrice ?? 0),
        sortOrder: i,
      })),
    )
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
