-- AlterTable
ALTER TABLE "School" ADD COLUMN     "address" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "PendingSchoolRegistration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolName" TEXT NOT NULL,
    "schoolCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PendingSchoolRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailChangeRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingSchoolRegistration_tokenHash_key" ON "PendingSchoolRegistration"("tokenHash");

-- CreateIndex
CREATE INDEX "PendingSchoolRegistration_email_expiresAt_idx" ON "PendingSchoolRegistration"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "PendingSchoolRegistration_schoolCode_expiresAt_idx" ON "PendingSchoolRegistration"("schoolCode", "expiresAt");

-- CreateIndex
CREATE INDEX "PendingSchoolRegistration_expiresAt_consumedAt_idx" ON "PendingSchoolRegistration"("expiresAt", "consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeRequest_tokenHash_key" ON "EmailChangeRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_schoolId_userId_expiresAt_idx" ON "EmailChangeRequest"("schoolId", "userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_newEmail_expiresAt_idx" ON "EmailChangeRequest"("newEmail", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_expiresAt_consumedAt_idx" ON "EmailChangeRequest"("expiresAt", "consumedAt");

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
