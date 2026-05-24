import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

type Db = ReturnType<typeof drizzle<typeof schema>>

let _db: Db | undefined

// Lazy singleton — defers client creation to first use so Next.js static
// analysis at build time doesn't fail when runtime env vars aren't present.
export const db = new Proxy({} as Db, {
  get(_, prop: string | symbol) {
    _db ??= drizzle(
      createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
      { schema }
    )
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
