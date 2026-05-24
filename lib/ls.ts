import crypto from "node:crypto"

export async function createLsCheckout(email: string, userId: string, appUrl: string): Promise<string | null> {
  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY!}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email,
            custom: { user_id: userId },
          },
          product_options: {
            redirect_url: `${appUrl}?upgraded=1`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID! } },
          variant: { data: { type: "variants", id: process.env.LEMONSQUEEZY_VARIANT_ID! } },
        },
      },
    }),
  })
  const json = await res.json()
  return (json.data?.attributes?.url as string) ?? null
}

export function verifyLsWebhook(rawBody: string, signature: string): boolean {
  const digest = crypto
    .createHmac("sha256", process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex")
  return digest === signature
}
