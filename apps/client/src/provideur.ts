import fs from "node:fs";
import path from "node:path";
import configDotenv from "dotenv";

configDotenv.config({
  path: "../../.env",
});

// console.log(process.env.FILE);

const debounceDelay = 1000;
const timeouts: { [key: string]: NodeJS.Timeout } = {};

fs.watch(process.env.FILE as string, { recursive: true }, async (eventType, filename) => {
  // console.log(eventType, filename);

  if (!filename || !isFile(filename)) return;

  const filePath = path.join(process.env.FILE as string, filename);

  if (timeouts[filePath]) {
    clearTimeout(timeouts[filePath]);
  }

  timeouts[filePath] = setTimeout(async () => {
    delete timeouts[filePath];
    try {
      if (eventType === "rename") {
        if (fs.existsSync(filePath)) {
          // CREATED
          // console.log("Created", filename);
          await uploadSetup(filename);
        } else {
          //todo REMOVE
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
  }, debounceDelay);
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

  const filePath = `${process.env.FILE}/${filename}`;
  const rawContent = fs.readFileSync(filePath, 'utf-8');

  // console.log(`Raw content of ${filename}:`, rawContent);

  try {
    return JSON.parse(rawContent);
  } catch (error) {
    console.error(`Failed to parse JSON in file ${filename}:`, error);
    console.error(`Problematic JSON content: ${rawContent}`);
    throw error;
  }
}

function uploadSetup(filename: string) {
  const { file, paths } = extractFromFilename(filename);

  if (file.includes("Jardier"))
    return;

  let payload;
  try {
    payload = {
      name: file,
      path: paths,
      setup: readSetup(filename),
    };
    console.log("Setup being sent to the server:", payload.name, "...");
  } catch (error) {
    console.error("Error creating payload:", error);
    return;
  }

  fetch("https://acc-shareure.thomasgleizes.fr/entry", {
    body: JSON.stringify(payload),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(response => response.json())
    .then(jsonResponse => {
      // console.log("Raw response from server:", jsonResponse);
      const { name, path, createdAt } = jsonResponse.setup;
      console.log(
        `\nSetup ID: ${name} a été enregistré avec succès.\n` +
        `Emplacement: distant/${path}\n` +
        `Date de création: ${new Date(createdAt).toLocaleString()}`
      );        
    })
    .catch(error => {
      console.error("Error in uploadSetup:", error);
    });
}

function removeSetup(filename: string) {}
