import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const UpsertSchema = z.object({
  packId: z.string().min(1),
  unitId: z.string().min(1),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const packId = url.searchParams.get("packId");
  if (!packId) return Response.json({ error: "packId is required" }, { status: 400 });

  const progress = await prisma.unitProgress.findMany({
    where: { userId: user.id, packId },
    select: { packId: true, unitId: true, status: true },
  });

  return Response.json({ progress });
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

  const { packId, unitId, status } = parsed.data;

  const saved = await prisma.unitProgress.upsert({
    where: { userId_packId_unitId: { userId: user.id, packId, unitId } },
    update: { status },
    create: { userId: user.id, packId, unitId, status },
    select: { packId: true, unitId: true, status: true },
  });

  return Response.json({ ok: true, saved });
}
