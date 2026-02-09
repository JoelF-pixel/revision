import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const UpsertSchema = z.object({
  packId: z.string().min(1),
  skillId: z.string().min(1),
  rating: z.number().int().min(0).max(3),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const packId = url.searchParams.get("packId");

  const ratings = await prisma.skillRating.findMany({
    where: {
      userId: user.id,
      ...(packId ? { packId } : {}),
    },
    select: { packId: true, skillId: true, rating: true },
  });

  return Response.json({ ratings });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { packId, skillId, rating } = parsed.data;

  const saved = await prisma.skillRating.upsert({
    // Prisma generates this unique selector name from @@unique([userId, packId, skillId])
    where: { userId_packId_skillId: { userId: user.id, packId, skillId } },
    update: { rating },
    create: { userId: user.id, packId, skillId, rating },
    select: { packId: true, skillId: true, rating: true },
  });

  return Response.json({ ok: true, saved });
}
