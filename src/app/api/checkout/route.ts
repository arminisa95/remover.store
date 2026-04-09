import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

const CREDIT_PACKAGES = [
  { credits: 10, priceCents: 299, label: "10 Credits" },
  { credits: 30, priceCents: 699, label: "30 Credits" },
  { credits: 75, priceCents: 1499, label: "75 Credits" },
  { credits: 200, priceCents: 2999, label: "200 Credits" },
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not logged in." }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User ID missing." }, { status: 401 });
    }

    const { packageIndex } = await req.json();
    const pkg = CREDIT_PACKAGES[packageIndex];
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package." }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || req.headers.get("origin") || "https://removerstore.vercel.app";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pkg.credits} Credit${pkg.credits > 1 ? "s" : ""} – remover.store`,
              description: `${pkg.credits}x KI-Bildverarbeitung`,
            },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        credits: String(pkg.credits),
      },
      success_url: `${baseUrl}?payment=success`,
      cancel_url: `${baseUrl}?payment=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Checkout error:", message);
    return NextResponse.json(
      { error: `Error: ${message}` },
      { status: 500 }
    );
  }
}
