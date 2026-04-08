import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (userId && credits > 0) {
      const existing = await prisma.transaction.findUnique({
        where: { stripeSessionId: session.id },
      });

      if (!existing) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: credits } },
          }),
          prisma.transaction.create({
            data: {
              userId,
              type: "purchase",
              credits,
              amountCents: session.amount_total || 0,
              stripeSessionId: session.id,
              description: `${credits} Credits gekauft`,
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ received: true });
}
