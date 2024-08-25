import http from "node:https";
import fs from "node:fs";
import { config } from "dotenv";

config({ path: "../../.env" });

const API_URL = process.env.API;
const SETUP_PATH = process.env.FILE;

const abort = new AbortController();

const listen = () => {
  http.get(`${API_URL}/listen`, { signal: abort.signal }, (response) => {
    console.log("Connection start");

    response.on("data", async (data: Buffer) => {
      const message = data.toString();
      console.log("Message", message.trim());
      try {
        const content = JSON.parse(message);
        const path = `${SETUP_PATH}/${content.path}`;

        console.log("content", content.path, content.name);
        fs.mkdirSync(path, { recursive: true });
        fs.writeFileSync(
          `${SETUP_PATH}/${content.path}/${content.name}`,
          content.setup,
          "utf-8",
        );
      } catch (error) {
        // @ts-ignore
        console.log("Error.message", error.message);
      }
    });

    process.on("SIGINT", () => {
      console.log("exist");
      process.exit(1);
    });

    response.on("close", () => {
      console.log("Connection closed");
      listen();
    });
  });
};

listen();
