import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

import { createAppFocusHandler, STABLE_STALE_TIME } from "./operational-query-policy";

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
);
focusManager.setEventListener((setFocused) => {
  const handleState = createAppFocusHandler(setFocused);
  handleState(AppState.currentState);
  const subscription = AppState.addEventListener("change", handleState);
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: STABLE_STALE_TIME, retry: 1, refetchOnReconnect: true },
    mutations: { retry: false },
  },
});
