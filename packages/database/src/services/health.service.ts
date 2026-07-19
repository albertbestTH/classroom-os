import { getPrismaClient } from "../client.js";

export async function checkDatabaseHealth(): Promise<{ database: "ready" }> {
  await getPrismaClient().$queryRaw`SELECT 1`;
  return { database: "ready" };
}
