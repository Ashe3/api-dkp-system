import { FastifyPluginAsync } from "fastify";

const userRoutes: FastifyPluginAsync = async (app) => {
  // GET /users — get all users
  app.get("/users", async (req, reply) => {
    const users = await app.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    return reply.send(
      users.map((user) => ({
        ...user,
        telegramId: user.telegramId.toString(),
      }))
    );
  });

  // POST /users — sign up
  app.post("/users", async (req, reply) => {
    const { telegramId, username } = req.body as {
      telegramId: number;
      username: string;
    };

    const existing = await app.prisma.user.findUnique({
      where: { telegramId },
    });
    if (existing) return reply.code(409).send({ error: "User already exists" });

    const multiplier = calculateMultiplier(0);

    const user = await app.prisma.user.create({
      data: {
        telegramId,
        username,
        bs: 0,
        multiplier,
        dkp: 0,
      },
    });

    return reply.send({
      message: "User created",
      user: { ...user, telegramId: user.telegramId.toString },
    });
  });

  // GET /users/:telegramId
  app.get("/users/:telegramId", async (req, reply) => {
    const telegramId = BigInt((req.params as any).telegramId);

    const user = await app.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) return reply.code(404).send({ error: "User not found" });
    return reply.send({ ...user, telegramId: user.telegramId.toString() });
  });

  // PATCH /users/:telegramId
  app.patch("/users/:telegramId", async (req, reply) => {
    const telegramId = BigInt((req.params as any).telegramId);
    const { bs, username, banned } = req.body as {
      bs?: number;
      username?: string;
      banned?: boolean;
    };

    const user = await app.prisma.user.findUnique({ where: { telegramId } });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const updated = await app.prisma.user.update({
      where: { telegramId },
      data: {
        bs: bs ?? user.bs,
        username: username ?? user.username,
        multiplier:
          bs !== undefined ? calculateMultiplier(bs) : user.multiplier,
        isBanned: banned ?? user.isBanned,
      },
    });

    return reply.send({ ...updated, telegramId: user.telegramId.toString() });
  });

  // GET /users/:telegramId/history
  app.get("/users/:telegramId/history/:take", async (req, reply) => {
    const telegramId = BigInt((req.params as any).telegramId);
    const take = Number((req.params as any).take) ?? 10;

    const user = await app.prisma.user.findUnique({ where: { telegramId } });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const history = await app.prisma.claim.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        event: true,
      },
    });

    return reply.send(history);
  });

  app.delete("/users/:telegramId", async (req, reply) => {
    const telegramId = BigInt((req.params as any).telegramId);

    try {
      const user = await app.prisma.user.delete({
        where: { telegramId },
      });

      return reply.send({
        message: "User deleted",
        telegramId: user.telegramId.toString(),
      });
    } catch (error) {
      return reply.code(404).send({ error: "User not found" });
    }
  });
};

export function calculateMultiplier(bs: number): number {
  return parseFloat((bs / 100000).toFixed(2));
}

export default userRoutes;
