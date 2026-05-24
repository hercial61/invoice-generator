import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { SignOutButton } from "@/components/sign-out-button"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

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
        <div className="border-t border-zinc-200 px-4 py-4">
          <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
