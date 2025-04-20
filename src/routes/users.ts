import { FastifyPluginAsync } from "fastify";

const userRoutes: FastifyPluginAsync = async (app) => {
  // GET /users — get all users
  app.get("/users", async (req, reply) => {
    const users = await app.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const tzOffset = 3 * 60; // GMT+3 in minutes
    const localNow = new Date(now.getTime() + tzOffset * 60 * 1000);

    const startOfWeek = new Date(localNow);
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const offsetToMonday = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - offsetToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [claimsCount, checkinCount] = await Promise.all([
          app.prisma.claim.count({
            where: {
              userId: user.id,
              createdAt: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
            },
          }),
          app.prisma.action.count({
            where: {
              userId: user.id,
              checkin: true,
              createdAt: {
                gte: startOfWeek,
                lte: endOfWeek,
              },
            },
          }),
        ]);

        return {
          ...user,
          telegramId: user.telegramId.toString(),
          weeklyCheckins: (claimsCount ?? 0) + (checkinCount ?? 0),
        };
      })
    );

    return reply.send(enrichedUsers);
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
    if (user.isBanned) return reply.code(404).send({ error: "User is banned" });
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
    if (user.isBanned && banned !== false)
      return reply.code(404).send({ error: "User is banned" });

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
    if (user.isBanned) return reply.code(404).send({ error: "User is banned" });

    const claims = await app.prisma.claim.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        event: true,
      },
    });

    const actions = await app.prisma.action.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        operator: {
          select: {
            username: true,
          },
        },
      },
    });

    const mappedClaims = claims.map((claim) => ({
      id: `claim-${claim.id}`,
      amount: claim.amount,
      description: claim.event?.title ?? "Unknown",
      createdAt: claim.createdAt,
    }));

    const mappedActions = actions.map((action) => {
      let metadata;
      try {
        metadata = JSON.parse(action.metadata || "{}");
      } catch {
        metadata = {};
      }

      return {
        id: `action-${action.id}`,
        amount: metadata.amount ?? 0,
        description: `"${metadata.note || "manual"}" by ${
          action.operator?.username ?? "unknown"
        }`,
        createdAt: action.createdAt,
      };
    });

    const history = [...mappedClaims, ...mappedActions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return reply.send(history.slice(0, take));
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
