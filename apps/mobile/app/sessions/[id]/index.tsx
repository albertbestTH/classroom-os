import { useLocalSearchParams } from "expo-router";
import { SessionScreen } from "@/features/sessions/session-screen";
export default function SessionRoute() { const { id, scoreSaved } = useLocalSearchParams<{ id: string; scoreSaved?: string }>(); return <SessionScreen id={id} scoreSavedParam={scoreSaved} />; }
