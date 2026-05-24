"use client"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-2 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
    >
      Sign out
    </button>
  )
}
