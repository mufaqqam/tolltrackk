/**
 * Simple fixed-window rate limit kept in memory.
 * Good enough for an MVP on one server; on serverless each instance has its own memory,
 * so production should move this to the database or a shared store (e.g. Redis).
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  h.count++;
  return h.count <= limit;
}
