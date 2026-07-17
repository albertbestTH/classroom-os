import type { ClassSessionResult, SessionAttendanceResult } from "@classroom-os/types";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { AppHeader, Card, ErrorState, LoadingSkeleton, MetricCard, SafeScreen, StatusBadge } from "@/components/ui/primitives";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { thaiErrorMessage } from "@/lib/api-error";

export default function SummaryScreen() { const { id } = useLocalSearchParams<{ id: string }>(); const session = useAuthenticatedQuery<ClassSessionResult>(["session", id], `/api/sessions/${id}`); const attendance = useAuthenticatedQuery<SessionAttendanceResult>(["attendance", id], `/api/sessions/${id}/attendance?classroomId=${session.data?.classroomId ?? ""}`, Boolean(session.data)); if (session.isLoading || (session.data && attendance.isLoading)) return <LoadingSkeleton />; if (!session.data || session.error) return <SafeScreen><ErrorState message={thaiErrorMessage(session.error)} /></SafeScreen>; const totals = { present: 0, late: 0, absent: 0, leave: 0 }; attendance.data?.students.forEach((student) => { if (student.status) totals[student.status] += 1; }); return <SafeScreen><AppHeader title="สรุปคาบเรียน" subtitle={`${session.data.classroomName} · ${session.data.subjectName}`} /><StatusBadge label={session.data.status === "cancelled" ? "ยกเลิกแล้ว" : "เสร็จสิ้น"} tone={session.data.status === "cancelled" ? "danger" : "success"} />{session.data.cancellationReason ? <Card><Text>{session.data.cancellationReason}</Text></Card> : null}<MetricCard label="มาเรียน" value={totals.present} /><MetricCard label="มาสาย" value={totals.late} /><MetricCard label="ขาด" value={totals.absent} /><MetricCard label="ลา" value={totals.leave} /></SafeScreen>; }
