import EventEmitter from "node:events";
import { serve } from "@hono/node-server";
import { streamText } from "hono/streaming";
import { Hono } from "hono";

import { generateId } from "./utils";
import configDotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

configDotenv.config({
  path: "../../.env",
});

const prisma = new PrismaClient();

const emitter = new EventEmitter();

const app = new Hono();

app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.req.method} (${ctx.res.status}) ${ctx.req.path}`);
});

app.post("/entry", async (c) => {
  const data = await c.req.json();

  const id = await generateId(data.name, data.path);

  const setup = await prisma.setup.upsert({
    where: { hash: id },
    create: {
      hash: id,
      name: data.name,
      path: data.path,
      setup: data.setup,
    },
    update: {
      setup: data.setup,
    },
  });

  emitter.emit("message", setup);

  return c.json({ setup });
});

app.get("/listen", (c) => {
  return streamText(
    c,
    async (stream) => {
      await stream.writeln("waiting");
      await stream.sleep(1);

      emitter.on("message", async (content) => {
        await stream.writeln(JSON.stringify(content));
        await stream.sleep(100);
      });

      let loop = true;

      while (loop) {
        await stream.sleep(1000);
      }
    },
    async (err, stream) => {
      await stream.writeln("An error occurred!");
      console.error(err);
    },
  );
});

app.get("/entry/:id", async (c) => {
  const setup = await prisma.setup.findUnique({
    where: {
      hash: c.req.param("id"),
    },
  });

  if (!setup) {
    throw new Error("Setup not found");
  }

  return c.json({ setup });
});

const port = process.env.PORT || "8010";
console.log(`Server is running on port ${port}`);

serve({ fetch: app.fetch, port: +port });
