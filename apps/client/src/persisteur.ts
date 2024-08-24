import http from "node:http";
import fs from "node:fs";
import { config } from "dotenv";

config({ path: "../../.env" });

const abort = new AbortController();
const url = "http://localhost:3000/listen";

const listen = () => {
  http.get(url, { signal: abort.signal }, (response) => {
    response.on("data", async (data: Buffer) => {
      console.log(data.toString());
      const message = data.toString().replaceAll('"', "");

      if (message === "waiting") return;

      await persist(message);
    });

    process.on("SIGINT", () => {
      console.log("exist");
      process.exit(1);
    });

    response.on("close", () => {
      listen();
    });
  });
};

async function persist(id: string) {
  const response = await fetch(`http://localhost:3000/entry/${id}`, {
    method: "GET",
  }).then((resp) => resp.json());

  if (!response.entry) return;

  const { entry } = response;

  console.log("Entry", entry);

  const dir = `C:/Users/thoma/Desktop/SETUp/${entry.path}`;

  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    `${dir}/${entry.name}`,
    new Buffer(JSON.stringify(entry.setup)),
    "utf-8",
  );
}

listen();
