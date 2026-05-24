"use client"

import { useState } from "react"

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/ls/checkout", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Free plan limit reached</h2>
        <p className="text-sm text-zinc-500 mb-6">
          You've used all 3 invoices on the free plan this month. Upgrade to Pro for unlimited invoices.
        </p>

        <div className="rounded-lg border border-zinc-200 p-4 mb-6">
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl font-bold text-zinc-900">$9</span>
            <span className="text-sm text-zinc-400">/month</span>
          </div>
          <ul className="space-y-1.5 text-sm text-zinc-600">
            <li>✓ Unlimited invoices</li>
            <li>✓ AI line item improvements</li>
            <li>✓ PDF print view</li>
            <li>✓ Cancel anytime</li>
          </ul>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
        >
          {loading ? "Redirecting…" : "Upgrade to Pro — $9/mo"}
        </button>
        <button
          onClick={onClose}
          className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
