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
});
app.register(prismaPlugin);
app.register(import("./routes/users"));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`🚀 API is running on ${address}`);
});
