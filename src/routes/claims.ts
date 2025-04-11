import { FastifyPluginAsync } from "fastify";
import { calculateMultiplier } from "./users";

const claimRoutes: FastifyPluginAsync = async (app) => {
  app.post("/claims", async (req, reply) => {
    const { telegramId, code } = req.body as {
      telegramId: string;
      code: string;
    };

    const user = await app.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const event = await app.prisma.event.findUnique({
      where: { code },
      include: { claims: true },
    });
    if (!event) return reply.code(404).send({ error: "Event not found" });

    const now = new Date();
    if (event.expiresAt && now > event.expiresAt)
      return reply.code(400).send({ error: "Event expired" });

    const alreadyClaimed = event.claims.some((c) => c.userId === user.id);
    if (alreadyClaimed)
      return reply.code(400).send({ error: "Already claimed" });

    const multiplier = calculateMultiplier(user.bs);
    const amount = event.reward * multiplier;

    await app.prisma.claim.create({
      data: {
        userId: user.id,
        eventId: event.id,
        amount,
      },
    });

    await app.prisma.user.update({
      where: { id: user.id },
      data: { dkp: user.dkp + amount },
    });

    return reply.send({ success: true, amount });
  });
};

export default claimRoutes;
