import { Redirect } from "expo-router";

import { LoadingSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/auth-context";

export default function Index() {
  const { state } = useAuth();
  if (state === "loading") return <LoadingSkeleton />;
  return <Redirect href={state === "authenticated" ? "/(tabs)" : "/(auth)/login"} />;
}
