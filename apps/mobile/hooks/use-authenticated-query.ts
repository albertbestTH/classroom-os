import { onlineManager, useQuery, type QueryKey } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";
import { isOperationalQueryKey, queryPolicyForKey } from "@/lib/operational-query-policy";

export function useAuthenticatedQuery<T>(queryKey: QueryKey, path: string, enabled = true) {
  const { token, state } = useAuth();
  const query = useQuery({ queryKey, queryFn: () => apiRequest<T>(path, { token }), enabled: enabled && state === "authenticated" && Boolean(token), ...queryPolicyForKey(queryKey) });
  const { refetch } = query;
  const initialFocus = useRef(true);
  const operational = isOperationalQueryKey(queryKey);
  useFocusEffect(useCallback(() => {
    if (initialFocus.current) { initialFocus.current = false; return; }
    if (operational && onlineManager.isOnline()) void refetch();
  }, [operational, refetch]));
  return query;
}
