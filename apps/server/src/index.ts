import EventEmitter from "node:events";
import { serve } from "@hono/node-server";
import { streamText } from "hono/streaming";
import { Hono } from "hono";

import { addToDb, findById } from "./utils";
import configDotenv from "dotenv";

configDotenv.config({
  path: "../../.env",
});

const emitter = new EventEmitter();

const app = new Hono();

app.use(async (ctx, next) => {
  await next();
  console.log(`${ctx.req.method} (${ctx.res.status}) ${ctx.req.path}`);
});

app.post("/entry", async (c) => {
  try {
    const data = await c.req.json();

    const [id, needEmit] = await addToDb({
      name: data.name,
      path: data.path.join("/"),
      setup: data.setup,
    });

    if (needEmit) emitter.emit("message", id);

    return c.json({ data });
  } catch (error) {
    console.error(error, c.req);
  }
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
  const entry = await findById(c.req.param("id"));

  if (!entry) {
    throw new Error("Entry not found");
  }

  return c.json({ entry });
});

const port = process.env.PORT;
console.log(`Server is running on port ${port}`);

serve({ fetch: app.fetch, port });
