export {
  createPrismaClient,
  disconnectPrisma,
  getPrismaClient,
} from "./client.js";
export * from "./repositories/classroom.repository.js";
export * from "./repositories/session.repository.js";
export * from "./repositories/student.repository.js";
export * from "./tenant.js";

export * from "./generated/prisma/client.js";
