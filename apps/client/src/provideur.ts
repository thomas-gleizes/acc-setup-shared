import fs from "node:fs";
import path from "node:path";
import configDotenv from "dotenv";

configDotenv.config({
  path: "../../.env",
});

// console.log(process.env.FILE);

const debounceDelay = 1000;
const timeouts: { [key: string]: NodeJS.Timeout } = {};

fs.watch(process.env.FILE, { recursive: true }, async (eventType, filename) => {
  console.log(eventType, filename);

  if (!filename || !isFile(filename)) return;

  const filePath = path.join(process.env.FILE, filename);

  if (timeouts[filePath]) {
    clearTimeout(timeouts[filePath]);
  }

  timeouts[filePath] = setTimeout(async () => {
    delete timeouts[filePath]; // Nettoyer l'entrée du fichier dans les timeouts
    try {
      if (eventType === "rename") {
        if (fs.existsSync(filePath)) {
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

  console.log(`Raw content of ${filename}:`, rawContent);

  try {
    return JSON.parse(rawContent);
  } catch (error) {
    console.error(`Failed to parse JSON in file ${filename}:`, error);
    console.error(`Problematic JSON content: ${rawContent}`);
    throw error;
  }
}

async function uploadSetup(filename: string) {
  const { file, paths } = extractFromFilename(filename);

  let payload;
  try {
    payload = {
      name: file,
      path: paths,
      setup: readSetup(filename),
    };
    console.log("Payload being sent to the server:", JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("Error creating payload:", error);
    return;
  }


  try {
    const response = await fetch("https://acc-shareure.thomasgleizes.fr/entry", {
      body: JSON.stringify(payload),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log("Raw response from server:", responseText);

    const jsonResponse = JSON.parse(responseText);
    console.log("Parsed JSON response:", jsonResponse);
  } catch (error) {
    console.error("Error in uploadSetup:", error);
  }
}

function removeSetup(filename: string) {}
