import { Prisma } from "./generated/prisma/client.js";

export type TenantScope = Readonly<{
  schoolId: string;
}>;

export class TenantScopeError extends Error {
  readonly code = "TENANT_SCOPE_REQUIRED";

  constructor() {
    super("A non-empty schoolId is required for this database operation.");
    this.name = "TenantScopeError";
  }
}

export class TenantRecordNotFoundError extends Error {
  readonly code = "TENANT_RECORD_NOT_FOUND";
  readonly resource: string;

  constructor(resource: string) {
    super(`${resource} was not found or is not accessible for this school.`);
    this.name = "TenantRecordNotFoundError";
    this.resource = resource;
  }
}

export class RepositoryValidationError extends Error {
  readonly code = "REPOSITORY_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "RepositoryValidationError";
  }
}

export function requireSchoolId(scope: TenantScope): string {
  const schoolId = scope.schoolId?.trim();

  if (!schoolId) throw new TenantScopeError();

  return schoolId;
}

export function requireRecordId(value: string, label: string): string {
  const id = value?.trim();

  if (!id) {
    throw new RepositoryValidationError(`${label} must be a non-empty identifier.`);
  }

  return id;
}

export function rethrowScopedMutationError(error: unknown, resource: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new TenantRecordNotFoundError(resource);
  }

  throw error;
}
