import type { TeachingAssignmentResult } from "@classroom-os/types";
import { Text } from "react-native";

import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, SafeScreen } from "@/components/ui/primitives";
import { useAuthenticatedQuery } from "@/hooks/use-authenticated-query";
import { thaiErrorMessage } from "@/lib/api-error";

export default function ScoresScreen() { const assignments = useAuthenticatedQuery<TeachingAssignmentResult[]>(["assignments"], "/api/teaching-assignments"); if (assignments.isLoading) return <LoadingSkeleton />; if (assignments.error) return <SafeScreen><ErrorState message={thaiErrorMessage(assignments.error)} onRetry={() => void assignments.refetch()} /></SafeScreen>; return <SafeScreen><AppHeader title="คะแนน" subtitle="พื้นที่คะแนนตามชั้นเรียนและรายวิชาที่คุณสอน" />{assignments.data?.map((item) => <Card key={item.id}><Text style={{ fontSize: 17, fontWeight: "700" }}>{item.classroomName}</Text><Text>{item.subjectName} · {item.termName}</Text></Card>)}<EmptyState title="การบันทึกคะแนนบนมือถือกำลังเตรียมให้พร้อม" description="ขณะนี้ยังไม่มี Gradebook API ที่สมบูรณ์ แอปจะไม่แสดงคะแนนหรือเกรดจำลอง" /></SafeScreen>; }
