import type { SessionStatus } from "@classroom-os/types";
import { OperationalFreshness } from "@/components/operational-freshness";
import { sessionNeedsPolling } from "@/lib/operational-freshness-policy";

export const sessionRefreshInterval = (status: SessionStatus): number | false => status === "live" ? 10_000 : false;

export function SessionFreshness({ status, scheduledStart, scheduledEnd }: { status: SessionStatus; scheduledStart: string; scheduledEnd: string }) {
  return <OperationalFreshness poll={sessionNeedsPolling(status, scheduledStart, scheduledEnd, new Date().getTime())} />;
}
