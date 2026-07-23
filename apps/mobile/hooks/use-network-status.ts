import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOnline, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)), []);
  return { isOnline };
}
