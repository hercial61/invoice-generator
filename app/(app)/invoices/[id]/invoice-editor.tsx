"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { nanoid } from "nanoid"

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  fromName: string
  fromEmail: string | null
  fromAddress: string | null
  clientName: string
  clientEmail: string | null
  clientAddress: string | null
  issueDate: Date
  dueDate: Date | null
  taxRate: number
  notes: string | null
}

type Item = { id: string; description: string; quantity: number; unitPrice: number; sortOrder: number }
type LineItem = { id: string; description: string; quantity: string; unitPrice: string; improving: boolean }

function toDateStr(d: Date | null) {
  if (!d) return ""
  return new Date(d).toISOString().slice(0, 10)
}

function calcTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
  }, 0)
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
const textareaCls = `${inputCls} resize-none`

const STATUS_OPTIONS = ["draft", "sent", "paid"]

export function InvoiceEditor({ invoice, items: initialItems }: { invoice: Invoice; items: Item[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber)
  const [status, setStatus] = useState(invoice.status)
  const [issueDate, setIssueDate] = useState(toDateStr(invoice.issueDate))
  const [dueDate, setDueDate] = useState(toDateStr(invoice.dueDate))
  const [fromName, setFromName] = useState(invoice.fromName)
  const [fromEmail, setFromEmail] = useState(invoice.fromEmail ?? "")
  const [fromAddress, setFromAddress] = useState(invoice.fromAddress ?? "")
  const [clientName, setClientName] = useState(invoice.clientName)
  const [clientEmail, setClientEmail] = useState(invoice.clientEmail ?? "")
  const [clientAddress, setClientAddress] = useState(invoice.clientAddress ?? "")
  const [taxRate, setTaxRate] = useState(String(invoice.taxRate))
  const [notes, setNotes] = useState(invoice.notes ?? "")

  const [items, setItems] = useState<LineItem[]>(
    initialItems.length > 0
      ? initialItems.map((i) => ({ id: i.id, description: i.description, quantity: String(i.quantity), unitPrice: String(i.unitPrice), improving: false }))
      : [{ id: nanoid(), description: "", quantity: "1", unitPrice: "", improving: false }],
  )

  function addItem() {
    setItems((prev) => [...prev, { id: nanoid(), description: "", quantity: "1", unitPrice: "", improving: false }])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: string, field: keyof Omit<LineItem, "id" | "improving">, value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  async function improveItem(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item?.description.trim()) return
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, improving: true } : i)))
    try {
      const res = await fetch("/api/ai/improve-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: item.description }),
      })
      if (res.ok) {
        const data = await res.json()
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, description: data.description } : i)))
      }
    } finally {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, improving: false } : i)))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          status,
          issueDate,
          dueDate: dueDate || null,
          fromName,
          fromEmail: fromEmail || null,
          fromAddress: fromAddress || null,
          clientName,
          clientEmail: clientEmail || null,
          clientAddress: clientAddress || null,
          taxRate: parseFloat(taxRate) || 0,
          notes: notes || null,
          items: items.map((i) => ({
            id: i.id,
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unitPrice: parseFloat(i.unitPrice) || 0,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return
    setDeleting(true)
    try {
      await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" })
      router.push("/invoices")
    } catch {
      setDeleting(false)
      setError("Failed to delete")
    }
  }

  const { subtotal, tax, total } = calcTotals(items, parseFloat(taxRate) || 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
        <Link href="/invoices" className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-zinc-400">Saved</span>}
          {error && <span className="text-xs text-red-500">{error}</span>}
          <a
            href={`/api/print/${invoice.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Preview / Print
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-zinc-400 hover:text-red-500 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6 max-w-3xl mx-auto w-full">
        {/* Invoice number + status + dates */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Field label="Invoice #">
            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Issue date">
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Due date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">From</h2>
            <Field label="Name">
              <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your name or business" className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
            </Field>
            <Field label="Address">
              <textarea value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="123 Main St" rows={3} className={textareaCls} />
            </Field>
          </div>
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Bill To</h2>
            <Field label="Name">
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" className={inputCls} />
            </Field>
            <Field label="Address">
              <textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="456 Client Ave" rows={3} className={textareaCls} />
            </Field>
          </div>
        </div>

        {/* Line items */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Line items</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="pb-2 text-left text-xs font-medium text-zinc-500">Description</th>
                <th className="pb-2 w-20 text-right text-xs font-medium text-zinc-500">Qty</th>
                <th className="pb-2 w-28 text-right text-xs font-medium text-zinc-500">Rate</th>
                <th className="pb-2 w-28 text-right text-xs font-medium text-zinc-500">Amount</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                return (
                  <tr key={item.id}>
                    <td className="py-2 pr-3">
                      <div className="flex items-start gap-1.5">
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="Item description"
                          rows={1}
                          className="flex-1 resize-none rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <button
                          onClick={() => improveItem(item.id)}
                          disabled={item.improving || !item.description.trim()}
                          title="Improve with AI"
                          className="mt-0.5 whitespace-nowrap text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {item.improving ? "…" : "✦"}
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-right text-sm focus:border-zinc-400 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-right text-sm focus:border-zinc-400 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pl-2 text-right font-medium text-zinc-700">{fmt(amount)}</td>
                    <td className="py-2 pl-2">
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-zinc-300 hover:text-red-400 transition-colors text-base leading-none"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button onClick={addItem} className="mt-3 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            + Add line item
          </button>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <div className="flex items-center gap-2">
                <span>Tax</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-14 rounded border border-zinc-200 px-2 py-0.5 text-right text-sm focus:border-zinc-400 focus:outline-none"
                />
                <span className="text-zinc-400">%</span>
              </div>
              <span>{fmt(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold text-zinc-900">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </div>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, bank details, thank you note…"
            rows={3}
            className={textareaCls}
          />
        </Field>
      </div>
    </div>
  )
}
