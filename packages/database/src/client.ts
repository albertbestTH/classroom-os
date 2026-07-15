import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client.js";

type PrismaGlobal = typeof globalThis & {
  __classroomOsPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  if (!databaseUrl.trim()) {
    throw new Error("A non-empty PostgreSQL connection URL is required.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Copy packages/database/.env.example to packages/database/.env for local development.",
    );
  }

  prismaGlobal.__classroomOsPrisma ??= createPrismaClient(databaseUrl);

  return prismaGlobal.__classroomOsPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (!prismaGlobal.__classroomOsPrisma) return;

  await prismaGlobal.__classroomOsPrisma.$disconnect();
  delete prismaGlobal.__classroomOsPrisma;
}
