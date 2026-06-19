import { useEffect, useReducer } from 'react';

// Live online/offline presence, fed by the backend `user_status_change` broadcast.
// `undefined` means "no realtime info yet" — callers fall back to the last value
// the API gave them until the socket reports an actual change.
const onlineMap = new Map<string, boolean>();
let listeners: (() => void)[] = [];

const notify = () => {
  listeners.forEach((l) => {
    try { l(); } catch {}
  });
};

export const setupPresenceListeners = (socket: any) => {
  if (!socket) return;
  socket.off('user_status_change');
  socket.on('user_status_change', (data: { userId: string; isOnline: boolean }) => {
    if (!data?.userId) return;
    onlineMap.set(String(data.userId), !!data.isOnline);
    notify();
  });
};

export const getPresence = (userId?: string | null): boolean | undefined =>
  userId != null ? onlineMap.get(String(userId)) : undefined;

export const subscribePresence = (l: () => void) => {
  listeners.push(l);
  return () => { listeners = listeners.filter((x) => x !== l); };
};

/** Resolves the displayed online state: realtime value if known, else the API fallback. */
export const useIsOnline = (userId?: string | null, fallback: boolean = false): boolean => {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => subscribePresence(force), []);
  const known = getPresence(userId);
  return known === undefined ? fallback : known;
};
