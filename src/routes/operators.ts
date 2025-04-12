import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcrypt";

const operatorsRoutes: FastifyPluginAsync = async (app) => {
  // POST /operators — create a new operator
  app.post("/operators", async (req, reply) => {
    const { username, password, role } = req.body as {
      username: string;
      password: string;
      role?: string;
    };

    const existing = await app.prisma.operator.findUnique({
      where: { username },
    });
    if (existing) {
      return reply.code(409).send({ error: "Operator already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const operator = await app.prisma.operator.create({
      data: {
        username,
        password: hashedPassword,
        role: role ?? "operator",
        isActive: true,
      },
    });

    return reply.send({
      id: operator.id,
      username: operator.username,
      role: operator.role,
    });
  });

  // GET /operators — list all operators
  app.get("/operators", async (req, reply) => {
    const operators = await app.prisma.operator.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return reply.send(operators);
  });

  // PATCH /operators/:id — update isActive and/or role
  app.patch("/operators/:id", async (req, reply) => {
    const id = parseInt((req.params as any).id, 10);
    const { isActive, role } = req.body as {
      isActive?: boolean;
      role?: string;
    };

    const updated = await app.prisma.operator.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(role && { role }),
      },
    });

    return reply.send({
      id: updated.id,
      username: updated.username,
      role: updated.role,
      isActive: updated.isActive,
    });
  });

  // DELETE /operators/:id — delete an operator
  app.delete("/operators/:id", async (req, reply) => {
    const id = parseInt((req.params as any).id, 10);
    await app.prisma.operator.delete({ where: { id } });
    return reply.send({ success: true });
  });
};

export default operatorsRoutes;
