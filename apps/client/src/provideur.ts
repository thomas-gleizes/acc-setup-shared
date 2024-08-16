import fs from "node:fs";
import path from "node:path";
import configDotenv from "dotenv";

configDotenv.config({
  path: "../../.env",
});

// console.log(process.env.FILE);

fs.watch(process.env.FILE, { recursive: true }, async (eventType, filename) => {
  console.log(eventType, filename);

  if (!filename || !isFile(filename)) return;

  try {
    if (eventType === "rename") {
      if (fs.existsSync(path.join(process.env.FILE, filename))) {
        // CREATED
        // console.log("Created", filename);
        await uploadSetup(filename);
      } else {
        // REMOVE
        // console.log("remove", filename);
        await removeSetup(filename);
      }
    } else if (eventType === "change") {
      // UPDATED
      // console.log("updated", filename);
      await uploadSetup(filename);
    }
  } catch (error) {
    console.error(error);
  }
});

function extractFromFilename(filename: string) {
  return {
    file: path.basename(filename),
    paths: path.dirname(filename).split(path.sep),
  };
}

function isFile(filename: string) {
  return filename.split(".").length > 1;
}

function readSetup(filename: string) {
  const extension = filename.split(".").pop();

  // console.log("Filename", filename, extension);

  if (extension !== "json") throw new Error("Invalid file extension");

  const setup = fs.readFileSync(`${process.env.FILE}/${filename}`);

  return JSON.parse(setup);
}

async function uploadSetup(filename: string) {
  const { file, paths } = extractFromFilename(filename);

  const payload = {
    name: file,
    path: paths,
    setup: readSetup(filename),
  };

  const response = await fetch("https://acc-shareure.thomasgleizes.fr/entry", {
    body: JSON.stringify(payload),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => resp.json());

  console.log("Response", response);
}

function removeSetup(filename: string) {}
