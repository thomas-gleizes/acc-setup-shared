import fs from "node:fs/promises";
import crypto from "node:crypto";

import { DB, Entry } from "./types";

const databasePath = "./setup.json";

function readDb(): Promise<DB> {
  return fs.readFile(databasePath, "utf-8").then((data) => JSON.parse(data));
}

function saveDB(db: DB): Promise<void> {
  return fs.writeFile(databasePath, JSON.stringify(db));
}

export function sha256(str: string): Promise<string> {
  return new Promise((resolve) => {
    const hash = crypto.createHash("sha256");

    hash.update(str);
    const hashedString: string = hash.digest().toString("hex");
    hash.end();

    resolve(hashedString);
  });
}

export function generateId(name: string, path: string): Promise<string> {
  return sha256(name + path);
}

export async function addToDb(entry: Entry): Promise<[string, boolean]> {
  const db = await readDb();

  const id = await generateId(entry.name, entry.path);

  if (db[id]) {
    const checksum = await sha256(JSON.stringify(entry.setup));
    const existingChecksum = await sha256(JSON.stringify(db[id].setup));

    if (checksum === existingChecksum) {
      return [id, false];
    }
  }

  db[id] = entry;

  await saveDB(db);

  return [id, true];
}

export async function findByNamePath(
  name: string,
  path: string,
): Promise<Entry> {
  const db = await readDb();

  const id = await generateId(name, path);

  return db[id];
}

export async function findById(id: string): Promise<Entry> {
  const db = await readDb();

  return db[id];
}
