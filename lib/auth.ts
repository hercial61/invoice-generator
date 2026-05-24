import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"

const resend = new Resend(process.env.RESEND_API_KEY!)

export const auth = betterAuth({
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
