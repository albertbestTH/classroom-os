import { useLocalSearchParams } from "expo-router";
import { AttendanceScreen } from "@/features/attendance/attendance-screen";
export default function AttendanceRoute() { const { id, classroomId } = useLocalSearchParams<{ id: string; classroomId: string }>(); return <AttendanceScreen sessionId={id} classroomId={classroomId} />; }
