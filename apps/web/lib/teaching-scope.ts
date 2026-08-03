import type { CurrentUserResult, TrustedAuthContext } from "@classroom-os/types";

export function isTeacherWorkspace(
  context: TrustedAuthContext,
  user: Pick<CurrentUserResult, "workspaceType">,
): boolean {
  return context.role === "TEACHER" || user.workspaceType === "PERSONAL";
}

export function effectiveTeachingContext(
  context: TrustedAuthContext,
  user: Pick<CurrentUserResult, "workspaceType">,
): TrustedAuthContext {
  return user.workspaceType === "PERSONAL"
    ? { ...context, role: "TEACHER" }
    : context;
}
