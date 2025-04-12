import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (req, reply) => {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };

    console.log("Login attempt:", { username, password });

    const operator = await app.prisma.operator.findUnique({
      where: { username },
    });

    if (!operator) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    if (!operator.isActive) {
      return reply.code(403).send({ error: "Operator is not active" });
    }

    const isValid = await bcrypt.compare(password, operator.password);
    if (!isValid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: operator.id,
        username: operator.username,
        role: operator.role,
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    return reply.send({ token });
  });
};

export default authRoutes;
