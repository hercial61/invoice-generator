import { SignInForm } from "./sign-in-form"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-sm border border-zinc-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Invoice Generator</h1>
          <p className="mt-1 text-sm text-zinc-500">Enter your email to receive a sign-in link.</p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
