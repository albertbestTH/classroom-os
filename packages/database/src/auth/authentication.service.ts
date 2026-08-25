import { createHash, randomBytes } from "node:crypto";

import type {
  CurrentUserResult,
  TrustedAuthContext,
} from "@classroom-os/types";

import { getPrismaClient } from "../client.js";
import { authError } from "./auth-errors.js";
import { verifyPassword } from "./password.js";

const WEB_SESSION_DURATION_MS = 12 * 60 * 60 * 1_000;
const MOBILE_SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1_000;
const MOBILE_TOKEN_PREFIX = "mobile.";
const MAX_LOGIN_PASSWORD_LENGTH = 1_024;
let dummyPasswordHash: string | undefined;

export interface PasswordLoginInput {
  email: string;
  password: string;
}

export interface PasswordLoginOptions {
  sessionKind?: "web" | "mobile";
}

export interface ServerSessionResult {
  token: string;
  expiresAt: Date;
  user: CurrentUserResult;
}

export interface ResolvedSessionResult {
  context: TrustedAuthContext;
  user: CurrentUserResult;
}

export function normalizeEmail(email: string): string {
  return email.trim().normalize("NFKC").toLowerCase();
}

function hashOpaqueValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function getDummyPasswordHash(): Promise<string> {
  if (dummyPasswordHash) return dummyPasswordHash;
  const { hashPassword } = await import("./password.js");
  dummyPasswordHash = await hashPassword("Synthetic-only!Timing7");
  return dummyPasswordHash;
}

function mapCurrentUser(record: {
  id: string;
  schoolId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  profileImageKey: string | null;
  role: CurrentUserResult["role"];
  school: { name: string; workspaceType: CurrentUserResult["workspaceType"] };
  teacherProfile: { id: string; employeeCode: string; _count: { teachingAssignments: number } } | null;
}): CurrentUserResult {
  return {
    userId: record.id,
    workspaceType: record.school.workspaceType,
    schoolId: record.schoolId,
    role: record.role,
    teacherId: record.teacherProfile?.id ?? null,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    phoneNumber: record.phoneNumber,
    profileImageKey: record.profileImageKey,
    schoolName: record.school.name,
    employeeCode: record.teacherProfile?.employeeCode ?? null,
    assignmentCount: record.teacherProfile?._count.teachingAssignments ?? 0,
  };
}

export async function authenticateWithPassword(
  input: PasswordLoginInput,
  options: PasswordLoginOptions = {},
): Promise<ServerSessionResult> {
  const prisma = getPrismaClient();
  const email = normalizeEmail(input.email);
  const principalHash = hashOpaqueValue(email);

  if (!email || !input.password || input.password.length > MAX_LOGIN_PASSWORD_LENGTH) {
    await prisma.authenticationEvent.create({
      data: { type: "LOGIN_FAILURE", principalHash, reason: "invalid_input" },
    });
    throw authError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      school: { select: { name: true, workspaceType: true, isActive: true } },
      teacherProfile: { select: { id: true, employeeCode: true, isActive: true, _count: { select: { teachingAssignments: true } } } },
    },
  });
  const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(passwordHash, input.password);

  if (!user || !passwordMatches || !user.passwordHash) {
    await prisma.authenticationEvent.create({
      data: {
        schoolId: user?.schoolId,
        userId: user?.id,
        type: "LOGIN_FAILURE",
        principalHash,
        reason: "invalid_credentials",
      },
    });
    throw authError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  if (
    user.status !== "ACTIVE" ||
    !user.school.isActive ||
    (user.role === "TEACHER" && !user.teacherProfile?.isActive)
  ) {
    await prisma.authenticationEvent.create({
      data: {
        schoolId: user.schoolId,
        userId: user.id,
        type: "LOGIN_FAILURE",
        principalHash,
        reason: "account_disabled",
      },
    });
    throw authError("ACCOUNT_DISABLED", "This account is not available.");
  }

  const opaqueValue = randomBytes(32).toString("base64url");
  const token = options.sessionKind === "mobile"
    ? `${MOBILE_TOKEN_PREFIX}${opaqueValue}`
    : opaqueValue;
  const tokenHash = hashOpaqueValue(token);
  const now = new Date();
  const sessionDurationMs = options.sessionKind === "mobile"
    ? MOBILE_SESSION_DURATION_MS
    : WEB_SESSION_DURATION_MS;
  const expiresAt = new Date(now.getTime() + sessionDurationMs);

  await prisma.$transaction([
    prisma.authSession.create({
      data: { schoolId: user.schoolId, userId: user.id, tokenHash, expiresAt },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
    prisma.authenticationEvent.create({
      data: {
        schoolId: user.schoolId,
        userId: user.id,
        type: "LOGIN_SUCCESS",
        principalHash,
      },
    }),
  ]);

  return { token, expiresAt, user: mapCurrentUser(user) };
}

export async function resolveServerSession(
  token: string | null | undefined,
): Promise<ResolvedSessionResult> {
  if (!token) throw authError("UNAUTHENTICATED", "Authentication is required.");

  const prisma = getPrismaClient();
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashOpaqueValue(token) },
    include: {
      user: {
        include: {
          school: { select: { name: true, workspaceType: true, isActive: true } },
          teacherProfile: { select: { id: true, employeeCode: true, isActive: true, _count: { select: { teachingAssignments: true } } } },
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE" ||
    !session.user.school.isActive ||
    session.schoolId !== session.user.schoolId ||
    (session.user.role === "TEACHER" && !session.user.teacherProfile?.isActive)
  ) {
    throw authError("UNAUTHENTICATED", "Authentication is required.");
  }

  const user = mapCurrentUser(session.user);
  return {
    context: {
      userId: user.userId,
      schoolId: user.schoolId,
      role: user.role,
      teacherId: user.teacherId,
    },
    user,
  };
}

export async function refreshMobileServerSession(
  token: string | null | undefined,
): Promise<ResolvedSessionResult & { expiresAt: Date }> {
  const resolved = await resolveServerSession(token);
  if (!token?.startsWith(MOBILE_TOKEN_PREFIX)) {
    throw authError("UNAUTHENTICATED", "Authentication is required.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + MOBILE_SESSION_DURATION_MS);
  const update = await getPrismaClient().authSession.updateMany({
    where: {
      tokenHash: hashOpaqueValue(token),
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { expiresAt, lastSeenAt: now },
  });
  if (update.count !== 1) {
    throw authError("UNAUTHENTICATED", "Authentication is required.");
  }

  return { ...resolved, expiresAt };
}

export async function revokeServerSession(
  token: string | null | undefined,
): Promise<void> {
  if (!token) return;
  const prisma = getPrismaClient();
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashOpaqueValue(token) },
    select: { id: true, schoolId: true, userId: true, revokedAt: true },
  });
  if (!session || session.revokedAt) return;

  const now = new Date();
  await prisma.$transaction([
    prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: now } }),
    prisma.authenticationEvent.create({
      data: {
        schoolId: session.schoolId,
        userId: session.userId,
        type: "LOGOUT",
      },
    }),
  ]);
}
