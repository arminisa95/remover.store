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

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "paypal"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pkg.credits} Credit${pkg.credits > 1 ? "s" : ""} – backgroundRemover`,
              description: `${pkg.credits}x Hintergrund entfernen`,
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
      success_url: `${process.env.NEXTAUTH_URL}?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}?payment=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Zahlung konnte nicht gestartet werden." },
      { status: 500 }
    );
  }
}
