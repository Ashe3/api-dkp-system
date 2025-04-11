import { FastifyPluginAsync } from "fastify";

const generateCode = (length = 5) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

const eventRoutes: FastifyPluginAsync = async (app) => {
  app.get("/events", async (_, reply) => {
    const events = await app.prisma.event.findMany({
      orderBy: { createdAt: "desc" },
    });
    return reply.send(events);
  });

  app.get("/events/:code", async (req, reply) => {
    const { code } = req.params as { code: string };

    const event = await app.prisma.event.findUnique({
      where: { code },
    });

    if (!event) return reply.code(404).send({ error: "Event not found" });
    return reply.send(event);
  });

  app.post("/events", async (req, reply) => {
    const { title, reward, comment, durationMinutes } = req.body as {
      title: string;
      reward: number;
      comment?: string;
      durationMinutes?: number;
    };

    const code = generateCode(5);
    const minutes = Math.max(1, durationMinutes ?? 5);
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const event = await app.prisma.event.create({
      data: {
        title,
        reward,
        comment,
        code,
        expiresAt,
      },
    });

    return reply.send(event);
  });
};

export default eventRoutes;
