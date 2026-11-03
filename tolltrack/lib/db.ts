import postgres from "postgres";

/**
 * One shared database connection pool.
 * DATABASE_URL comes from the environment (Vercel project settings / .env.local) and is never sent to the browser.
 * `prepare: false` is required for Supabase's connection pooler (transaction mode, port 6543).
 */
declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    prepare: false,
    ssl: local ? false : "require",
    max: local ? 5 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
    types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
  });
}

export function sql() {
  if (!globalThis.__sql) globalThis.__sql = create();
  return globalThis.__sql;
}
