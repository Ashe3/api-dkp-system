import { FastifyPluginAsync } from "fastify";

const actionRoutes: FastifyPluginAsync = async (app) => {
  app.post("/actions", async (req, res) => {
    const { targetTelegramId, amount, note, operatorId } = req.body as any;

    if (
      !targetTelegramId ||
      !amount ||
      !operatorId ||
      typeof note !== "string"
    ) {
      return res.status(400).send({ error: "Invalid data" });
    }

    const user = await app.prisma.user.findUnique({
      where: { telegramId: BigInt(targetTelegramId) },
    });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const action = await app.prisma.action.create({
      data: {
        type: "manual",
        metadata: JSON.stringify({
          amount: Math.round(amount),
          note,
        }),
        operatorId,
        userId: user.id,
      },
    });

    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        dkp: { increment: Math.round(amount) },
      },
    });

    return res.status(201).send(action);
  });
};

export default actionRoutes;
