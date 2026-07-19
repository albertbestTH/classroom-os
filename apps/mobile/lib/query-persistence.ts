import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const storageKey = "classroom-os:teacher-cache:v1";

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: storageKey,
  throttleTime: 1_000,
});

export const persistedQueryOptions = {
  persister: queryPersister,
  maxAge: 12 * 60 * 60 * 1_000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string }; queryKey: readonly unknown[] }) => {
      const root = query.queryKey[0];
      return query.state.status === "success" && ["today", "timetable", "assignments", "timetable-coverages"].includes(String(root));
    },
  },
};

export function clearPersistedQueries(): Promise<void> {
  return AsyncStorage.removeItem(storageKey);
}
