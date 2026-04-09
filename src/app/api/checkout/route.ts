import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

const CREDIT_PACKAGES = [
  { credits: 1, priceCents: 25, label: "1 Credit" },
  { credits: 5, priceCents: 100, label: "5 Credits" },
  { credits: 20, priceCents: 350, label: "20 Credits" },
  { credits: 50, priceCents: 750, label: "50 Credits" },
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User ID fehlt." }, { status: 401 });
    }

    const { packageIndex } = await req.json();
    const pkg = CREDIT_PACKAGES[packageIndex];
    if (!pkg) {
      return NextResponse.json({ error: "Ungültiges Paket." }, { status: 400 });
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
      { error: `Fehler: ${message}` },
      { status: 500 }
    );
  }
}
