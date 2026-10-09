import { useSyncExternalStore } from 'react';
import { getHomeSession, getSession, subscribeSessions } from './session';

export function useSession(id: string | undefined) {
  return useSyncExternalStore(
    subscribeSessions,
    () => getSession(id),
    () => getSession(id),
  );
}
export function useHomeSession() {
  return useSyncExternalStore(subscribeSessions, getHomeSession, getHomeSession);
}
