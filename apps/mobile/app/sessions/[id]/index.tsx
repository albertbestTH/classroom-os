import { useLocalSearchParams } from "expo-router";
import { SessionScreen } from "@/features/sessions/session-screen";
export default function SessionRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <SessionScreen id={id} />; }
