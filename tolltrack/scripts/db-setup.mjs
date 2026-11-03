// Creates the tables and loads demo data into the database in DATABASE_URL.
// Usage: DATABASE_URL=postgres://... npm run db:setup
// (Alternative with no installs: paste db/schema.sql then db/seed.sql into the Supabase SQL Editor.)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
const local = /localhost|127\.0\.0\.1/.test(url);
const db = postgres(url, { ssl: local ? false : "require", prepare: false, max: 1, onnotice: () => {} });
for (const file of ["schema.sql", "seed.sql"]) {
  await db.unsafe(fs.readFileSync(path.join(root, "db", file), "utf8"));
  console.log("ran", file);
}
await db.end();
