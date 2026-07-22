-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('SCHOOL', 'PERSONAL');

-- AlterTable
ALTER TABLE "PendingSchoolRegistration" ADD COLUMN     "workspaceType" "WorkspaceType" NOT NULL DEFAULT 'SCHOOL';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "workspaceType" "WorkspaceType" NOT NULL DEFAULT 'SCHOOL';
