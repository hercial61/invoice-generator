export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { invoices, invoiceItems } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

type RouteCtx = { params: Promise<{ id: string }> }

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function fmtDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export async function GET(request: NextRequest, { params }: RouteCtx) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))

  if (!invoice) return new NextResponse("Not found", { status: 404 })

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const tax = subtotal * (invoice.taxRate / 100)
  const total = subtotal + tax

  const itemsHtml = items
    .map(
      (item) =>
        `<tr>
          <td>${escHtml(item.description)}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">${fmt(item.unitPrice)}</td>
          <td class="right">${fmt(item.quantity * item.unitPrice)}</td>
        </tr>`,
    )
    .join("")

  const taxRow = invoice.taxRate > 0
    ? `<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span>${fmt(tax)}</span></div>`
    : ""

  const notesHtml = invoice.notes
    ? `<div class="notes-section">
        <div class="notes-label">Notes</div>
        <div class="notes-text">${escHtml(invoice.notes)}</div>
      </div>`
    : ""

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escHtml(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
    .no-print { margin-bottom: 24px; display: flex; gap: 12px; }
    @media print { .no-print { display: none !important; } .page { padding: 32px 24px; } }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { font-size: 22px; font-weight: 700; color: #111; }
    .from-detail { margin-top: 4px; font-size: 13px; color: #555; white-space: pre-line; }
    .invoice-meta { text-align: right; }
    .inv-number { font-size: 20px; font-weight: 600; }
    .dates { margin-top: 6px; font-size: 13px; color: #555; line-height: 1.6; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; text-transform: capitalize; margin-left: 10px; }
    .status-draft { background: #f4f4f5; color: #52525b; }
    .status-sent { background: #eff6ff; color: #2563eb; }
    .status-paid { background: #f0fdf4; color: #16a34a; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }
    .party-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 6px; }
    .party-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
    .party-detail { font-size: 13px; color: #555; line-height: 1.5; white-space: pre-line; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 2px solid #e4e4e7; }
    thead th.right { text-align: right; }
    tbody td { padding: 12px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; font-size: 13px; }
    tbody td.right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-inner { width: 240px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #444; }
    .totals-total { display: flex; justify-content: space-between; padding: 10px 0 5px; font-size: 15px; font-weight: 700; border-top: 2px solid #111; margin-top: 4px; }
    .notes-section { margin-top: 36px; padding-top: 24px; border-top: 1px solid #e4e4e7; }
    .notes-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; }
    .notes-text { font-size: 13px; color: #444; line-height: 1.6; white-space: pre-line; }
    button { cursor: pointer; border: 1px solid #d4d4d8; background: white; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; }
    button:hover { background: #f4f4f5; }
    button.primary { background: #111; color: white; border-color: #111; }
    button.primary:hover { background: #333; }
  </style>
</head>
<body>
  <div class="page">
    <div class="no-print">
      <button class="primary" onclick="window.print()">Print / Save as PDF</button>
      <button onclick="window.history.back()">← Back</button>
    </div>

    <div class="header">
      <div>
        <div class="brand">${escHtml(invoice.fromName || "Invoice")}</div>
        ${invoice.fromEmail ? `<div class="from-detail">${escHtml(invoice.fromEmail)}</div>` : ""}
        ${invoice.fromAddress ? `<div class="from-detail">${escHtml(invoice.fromAddress)}</div>` : ""}
      </div>
      <div class="invoice-meta">
        <div class="inv-number">
          ${escHtml(invoice.invoiceNumber)}
          <span class="status-badge status-${invoice.status}">${invoice.status}</span>
        </div>
        <div class="dates">
          <div>Issued: ${fmtDate(invoice.issueDate)}</div>
          ${invoice.dueDate ? `<div>Due: ${fmtDate(invoice.dueDate)}</div>` : ""}
        </div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="party-label">From</div>
        <div class="party-name">${escHtml(invoice.fromName || "—")}</div>
        ${invoice.fromEmail ? `<div class="party-detail">${escHtml(invoice.fromEmail)}</div>` : ""}
        ${invoice.fromAddress ? `<div class="party-detail">${escHtml(invoice.fromAddress)}</div>` : ""}
      </div>
      <div>
        <div class="party-label">Bill To</div>
        <div class="party-name">${escHtml(invoice.clientName || "—")}</div>
        ${invoice.clientEmail ? `<div class="party-detail">${escHtml(invoice.clientEmail)}</div>` : ""}
        ${invoice.clientAddress ? `<div class="party-detail">${escHtml(invoice.clientAddress)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="right" style="width:80px">Qty</th>
          <th class="right" style="width:110px">Rate</th>
          <th class="right" style="width:110px">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div class="totals">
      <div class="totals-inner">
        <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
        ${taxRow}
        <div class="totals-total"><span>Total</span><span>${fmt(total)}</span></div>
      </div>
    </div>

    ${notesHtml}
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
