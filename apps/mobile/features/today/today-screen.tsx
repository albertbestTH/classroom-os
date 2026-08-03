import type {
  ClassSessionResult,
  DashboardOverviewResult,
  TodayClassResult,
  TodayTimetableResult,
} from "@classroom-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl } from "react-native";

import {
  Card,
  ErrorState,
  OfflineBanner,
  SafeScreen,
  SkeletonCard,
  StatusBadge,
  ThemedText,
} from "@/components/ui/primitives";
import { spacing } from "@/constants/tokens";
import { useAuth } from "@/features/auth/auth-context";
import { canStartScheduledSession } from "@/features/sessions/session-time";
import { useTheme } from "@/features/theme/theme-context";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { apiRequest } from "@/lib/api-client";
import { thaiErrorMessage } from "@/lib/api-error";
import { invalidateSessionWorkflow, queryKeys } from "@/lib/query-keys";

import { TodayDashboard } from "./today-dashboard";

export function TodayScreen() {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const [now, setNow] = useState(() => Date.now());
  const today = useAuthenticatedQuery<TodayTimetableResult>(queryKeys.today, "/api/me/today");

  const focusClassroomId = useMemo(() => {
    const classes = today.data?.classes ?? [];
    const focus = classes.find((item) => item.status === "live")
      ?? classes.find((item) => item.status === "scheduled")
      ?? classes.findLast((item) => item.status === "completed");
    return focus?.timetableEntry.classroomId;
  }, [today.data?.classes]);

  const dashboardPath = focusClassroomId
    ? `/api/dashboard/overview?classroomId=${encodeURIComponent(focusClassroomId)}`
    : "/api/dashboard/overview";
  const dashboard = useAuthenticatedQuery<DashboardOverviewResult>(
    queryKeys.dashboard(focusClassroomId),
    dashboardPath,
    Boolean(today.data),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const start = useMutation({
    retry: false,
    mutationFn: async (item: TodayClassResult) => {
      const session = item.session ?? await apiRequest<ClassSessionResult>(
        `/api/timetable/${item.timetableEntry.id}/materialize`,
        { method: "POST", token, body: { localDate: today.data?.localDate } },
      );
      const live = await apiRequest<ClassSessionResult>(
        `/api/sessions/${session.id}/start`,
        { method: "POST", token, body: {} },
      );
      if (live.status !== "live") throw new Error("Session start was not confirmed by the server.");
      return live;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session(session.id), session);
      router.push(`/sessions/${session.id}`);
      void invalidateSessionWorkflow(queryClient, session.id);
    },
  });

  if (today.isLoading) {
    return <SafeScreen><SkeletonCard /><SkeletonCard /><SkeletonCard /></SafeScreen>;
  }
  if (today.error || !today.data) {
    return <SafeScreen><ErrorState error={today.error} onRetry={() => void today.refetch()} /></SafeScreen>;
  }

  const data = today.data;
  const openItem = (item: TodayClassResult) => {
    if (item.status === "scheduled") {
      if (isOnline && !start.isPending && canStartScheduledSession(item.scheduledStart, item.scheduledEnd, now)) {
        start.mutate(item);
      }
      return;
    }
    if (!item.session) return;
    if (item.status === "live") {
      router.push(`/sessions/${item.session.id}/attendance?classroomId=${item.timetableEntry.classroomId}`);
      return;
    }
    if (item.status === "completed") router.push(`/sessions/${item.session.id}/summary`);
  };

  const refresh = () => {
    void Promise.all([today.refetch(), dashboard.refetch()]);
  };

  return (
    <SafeScreen
      refreshControl={(
        <RefreshControl
          refreshing={today.isRefetching || dashboard.isRefetching}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      )}
    >
      <OfflineBanner visible={!isOnline} lastUpdated={Math.max(today.dataUpdatedAt, dashboard.dataUpdatedAt)} />
      {data.holiday ? (
        <Card>
          <StatusBadge label="วันหยุด" tone="warning" />
          <ThemedText style={{ marginTop: spacing.sm, fontSize: 20, fontWeight: "900" }}>
            {data.holiday.name}
          </ThemedText>
          <ThemedText tone="muted">
            {data.holiday.description ?? "วันนี้เป็นวันหยุดตามปฏิทินโรงเรียน"}
          </ThemedText>
        </Card>
      ) : null}
      {start.error ? (
        <ThemedText accessibilityRole="alert" tone="danger">
          {thaiErrorMessage(start.error)}
        </ThemedText>
      ) : null}
      <TodayDashboard
        user={user}
        data={data}
        overview={dashboard.data}
        now={now}
        isOnline={isOnline}
        isStarting={start.isPending}
        onOpen={openItem}
      />
    </SafeScreen>
  );
}
