import type { DomainErrorCode } from "@classroom-os/types";
import { ZodError } from "zod";

import { Prisma } from "./generated/prisma/client.js";
import {
  RepositoryValidationError,
  TenantRecordNotFoundError,
  TenantScopeError,
} from "./tenant.js";

export type DomainErrorDetails = Readonly<Record<string, unknown>>;

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: DomainErrorDetails,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function domainError(
  code: DomainErrorCode,
  message: string,
  details?: DomainErrorDetails,
): DomainError {
  return new DomainError(code, message, details);
}

export function mapToDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;

  if (error instanceof TenantScopeError) {
    return domainError(
      "TENANT_ACCESS_DENIED",
      "A valid school scope is required for this operation.",
    );
  }

  if (error instanceof TenantRecordNotFoundError) {
    return domainError(
      "NOT_FOUND",
      `${error.resource} was not found for this school.`,
    );
  }

  if (error instanceof RepositoryValidationError) {
    return domainError("VALIDATION_ERROR", error.message);
  }

  if (error instanceof ZodError) {
    return domainError("VALIDATION_ERROR", "The request is invalid.", {
      issues: error.issues.map(({ path, message }) => ({ path, message })),
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return domainError("CONFLICT", "The requested record conflicts with existing data.");
  }

  return domainError("VALIDATION_ERROR", "The operation could not be completed.");
}

export async function withDomainErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapToDomainError(error);
  }
}
