import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

type Auth = ReturnType<typeof betterAuth>

let _auth: Auth | undefined

function createAuth(): Auth {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  return betterAuth({
    baseURL: process.env.NEXT_PUBLIC_APP_URL!,
    secret: process.env.BETTER_AUTH_SECRET!,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await resend.emails.send({
            from: "Invoice Generator <noreply@" + (process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, "") ?? "localhost") + ">",
            to: email,
            subject: "Your sign-in link",
            html: `<p>Click <a href="${url}">here</a> to sign in. Link expires in 10 minutes.</p>`,
          })
        },
      }),
    ],
  })
}

// Lazy singleton — defers initialization so Next.js build-time static
// analysis doesn't fail when runtime env vars aren't present.
export const auth = new Proxy({} as Auth, {
  get(_, prop: string | symbol) {
    _auth ??= createAuth()
    return (_auth as unknown as Record<string | symbol, unknown>)[prop]
  },
})
