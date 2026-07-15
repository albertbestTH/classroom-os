-- Add the owner role while preserving the existing mapped admin and teacher values.
ALTER TYPE "UserRole" ADD VALUE 'SCHOOL_OWNER';

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AuthenticationEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3);

-- Preserve disabled accounts before replacing the legacy boolean with one status field.
UPDATE "User" SET "status" = 'DISABLED' WHERE "isActive" = false;

DROP INDEX "User_schoolId_role_isActive_idx";
DROP INDEX "User_schoolId_email_key";
ALTER TABLE "User" DROP COLUMN "isActive";

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthenticationEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID,
    "userId" UUID,
    "type" "AuthenticationEventType" NOT NULL,
    "principalHash" CHAR(64),
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthenticationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_schoolId_role_status_idx" ON "User"("schoolId", "role", "status");
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_schoolId_userId_expiresAt_idx" ON "AuthSession"("schoolId", "userId", "expiresAt");
CREATE INDEX "AuthSession_expiresAt_revokedAt_idx" ON "AuthSession"("expiresAt", "revokedAt");
CREATE INDEX "AuthenticationEvent_schoolId_createdAt_idx" ON "AuthenticationEvent"("schoolId", "createdAt");
CREATE INDEX "AuthenticationEvent_userId_createdAt_idx" ON "AuthenticationEvent"("userId", "createdAt");
CREATE INDEX "AuthenticationEvent_principalHash_createdAt_idx" ON "AuthenticationEvent"("principalHash", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthenticationEvent" ADD CONSTRAINT "AuthenticationEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuthenticationEvent" ADD CONSTRAINT "AuthenticationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
