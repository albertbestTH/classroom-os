import { domainError } from "../domain-errors.js";

type ScheduledWindow = {
  scheduledStart: Date;
  scheduledEnd: Date;
};

export function requireSessionStartTime(session: ScheduledWindow, occurredAt: Date): void {
  if (occurredAt < session.scheduledStart) {
    throw domainError(
      "INVALID_STATE_TRANSITION",
      "The class session cannot be started before its scheduled time.",
      { scheduledStart: session.scheduledStart.toISOString() },
    );
  }
  if (occurredAt >= session.scheduledEnd) {
    throw domainError(
      "INVALID_STATE_TRANSITION",
      "The scheduled time for this class session has already ended.",
      { scheduledEnd: session.scheduledEnd.toISOString() },
    );
  }
}
