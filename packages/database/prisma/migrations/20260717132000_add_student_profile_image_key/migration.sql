-- Display-only student profile image reference. The referenced object must be
-- private and tenant-authorized by the application; no biometric templates are stored.
ALTER TABLE "Student" ADD COLUMN "profileImageKey" TEXT;
