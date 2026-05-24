import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { SignOutButton } from "@/components/sign-out-button"
import { getUserPlan, FREE_LIMIT } from "@/lib/usage"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const plan = await getUserPlan(session.user.id)
  const isPro = plan.tier === "pro"
  const used = plan.invoicesThisMonth
  const pct = isPro ? 100 : Math.min(100, Math.round((used / FREE_LIMIT) * 100))

  return (
    <div className="flex h-screen bg-white">
      <aside className="flex w-52 flex-col border-r border-zinc-200">
        <div className="px-4 py-5">
          <span className="text-sm font-semibold text-zinc-900">Invoice Generator</span>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          <Link
            href="/invoices"
            className="flex items-center rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Invoices
          </Link>
          <Link
            href="/invoices/new"
            className="flex items-center rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            + New Invoice
          </Link>
        </nav>

        {/* Plan usage */}
        <div className="border-t border-zinc-200 px-4 py-3">
          {isPro ? (
            <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
              Pro
            </span>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{used}/{FREE_LIMIT} invoices</span>
                <span>Free</span>
              </div>
              <div className="h-1 w-full rounded-full bg-zinc-100">
                <div
                  className="h-1 rounded-full bg-zinc-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <Link
                href="/invoices/new"
                className="block text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                onClick={() => {}}
              >
                Upgrade to Pro →
              </Link>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-4 py-4">
          <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
