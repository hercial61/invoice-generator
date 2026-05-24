import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { invoices, invoiceItems } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { InvoiceEditor } from "./invoice-editor"

type Props = { params: Promise<{ id: string }> }

export default async function InvoicePage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))

  if (!invoice) notFound()

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)

  return <InvoiceEditor invoice={invoice} items={items} />
}
