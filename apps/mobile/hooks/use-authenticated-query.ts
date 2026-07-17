import { useQuery, type QueryKey } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";

export function useAuthenticatedQuery<T>(queryKey: QueryKey, path: string, enabled = true) {
  const { token, state } = useAuth();
  return useQuery({ queryKey, queryFn: () => apiRequest<T>(path, { token }), enabled: enabled && state === "authenticated" && Boolean(token) });
}
