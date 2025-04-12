import Fastify from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";

import prismaPlugin from "./plugins/prisma";

dotenv.config();

const app = Fastify({
  logger: true,
});

app.register(cors, {
  origin: process.env.CORS_ORIGIN,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});
app.register(prismaPlugin);
app.register(import("./routes/users"));
app.register(import("./routes/events"));
app.register(import("./routes/claims"));
app.register(import("./routes/operators"));
app.register(import("./routes/auth"));
app.register(import("./routes/actions"));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`🚀 API is running on ${address}`);
});
