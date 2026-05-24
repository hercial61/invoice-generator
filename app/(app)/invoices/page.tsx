import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { invoices, invoiceItems } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import Link from "next/link"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    sent: "bg-blue-50 text-blue-600",
    paid: "bg-green-50 text-green-600",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-600"
}

export default async function InvoicesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, session.user.id))
    .orderBy(desc(invoices.createdAt))

  // Get totals for each invoice
  const totals = await db
    .select({
      invoiceId: invoiceItems.invoiceId,
      subtotal: sql<number>`sum(${invoiceItems.quantity} * ${invoiceItems.unitPrice})`,
    })
    .from(invoiceItems)
    .groupBy(invoiceItems.invoiceId)

  const totalsMap = Object.fromEntries(totals.map((t) => [t.invoiceId, t.subtotal ?? 0]))

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-900">Invoices</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          New invoice
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-sm text-zinc-400">No invoices yet.</p>
          <Link
            href="/invoices/new"
            className="mt-3 inline-block text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Invoice</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Client</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((inv) => {
                const subtotal = totalsMap[inv.id] ?? 0
                const total = subtotal * (1 + inv.taxRate / 100)
                return (
                  <tr key={inv.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-zinc-900 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{inv.clientName || <span className="text-zinc-400">—</span>}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCurrency(total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
