export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let description: string
  try {
    const body = await request.json()
    description = (body.description ?? "").trim()
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }

  if (!description) return NextResponse.json({ error: "description_required" }, { status: 400 })

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 80,
    messages: [
      {
        role: "user",
        content: `Rewrite this invoice line item description to sound professional and clear. Return only the improved description, nothing else:\n\n${description}`,
      },
    ],
  })

  const improved =
    message.content[0]?.type === "text" ? message.content[0].text.trim() : description

  return NextResponse.json({ description: improved })
}
