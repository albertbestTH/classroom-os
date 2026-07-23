import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const storageKey = "classroom-os:teacher-cache:v1";
export const offlineReadableQueryRoots = ["today", "timetable", "assignments", "classrooms", "timetable-coverages", "profile"] as const;

export function shouldPersistQuery(query: { state: { status: string }; queryKey: readonly unknown[] }): boolean {
  return query.state.status === "success" && offlineReadableQueryRoots.includes(String(query.queryKey[0]) as (typeof offlineReadableQueryRoots)[number]);
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: storageKey,
  throttleTime: 1_000,
});

export const persistedQueryOptions = {
  persister: queryPersister,
  maxAge: 12 * 60 * 60 * 1_000,
  dehydrateOptions: {
    shouldDehydrateQuery: shouldPersistQuery,
  },
};

export function clearPersistedQueries(): Promise<void> {
  return AsyncStorage.removeItem(storageKey);
}
