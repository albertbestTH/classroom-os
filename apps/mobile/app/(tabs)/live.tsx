import type { TodayTimetableResult } from "@classroom-os/types";
import { router } from "expo-router";

import { AppButton, AppHeader, EmptyState, ErrorState, LoadingSkeleton, OfflineBanner, SafeScreen } from "@/components/ui/primitives";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { useNetworkStatus } from "@/hooks/use-network-status";

export default function LiveTab() {
  const { isOnline } = useNetworkStatus();
  const today = useAuthenticatedQuery<TodayTimetableResult>(["today"], "/api/me/today");
  if (today.isLoading) return <LoadingSkeleton />;
  if (today.error) return <SafeScreen><ErrorState error={today.error} onRetry={() => void today.refetch()} /></SafeScreen>;
  const live = today.data?.classes.find((item) => item.status === "live" && item.session);
  return <SafeScreen><OfflineBanner visible={!isOnline} lastUpdated={today.dataUpdatedAt} /><AppHeader title="Live Class" subtitle="คาบที่กำลังสอนของคุณ" />{live?.session ? <AppButton label={`กลับเข้าสู่ ${live.timetableEntry.classroomName} · ${live.timetableEntry.subjectName}`} onPress={() => router.push(`/sessions/${live.session!.id}`)} /> : <EmptyState title="ยังไม่มีคาบที่กำลังสอน" description="เริ่มคาบจากหน้า วันนี้ แล้วกลับมาที่นี่ได้ทุกเวลา" />}</SafeScreen>;
}
