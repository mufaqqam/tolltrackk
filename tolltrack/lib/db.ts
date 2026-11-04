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
  // Clean up copy-paste accidents: spaces, line breaks or quote marks around the value.
  const raw = (process.env.DATABASE_URL ?? "").trim().replace(/^['"]+|['"]+$/g, "").trim();
  if (!raw) throw new Error("DATABASE_URL is not set");
  const u = new URL(raw);
  const opts = {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")) || "postgres",
  };
  const local = /^(localhost|127\.0\.0\.1)$/.test(opts.host);
  // Safe to log: shows what we connect to, never the password.
  console.log("[db] connecting", { host: opts.host, port: opts.port, user: opts.user, database: opts.database });
  return postgres({
    ...opts,
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
