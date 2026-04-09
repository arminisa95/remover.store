import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "User ID missing." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user || user.credits < 1) {
    return NextResponse.json(
      { error: "Not enough credits. Please purchase credits first." },
      { status: 402 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: "usage",
        credits: -1,
        description: "Background Removal",
      },
    }),
  ]);

  return NextResponse.json({ credits: user.credits - 1 });
}
