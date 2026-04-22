import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';

export function useIsOnline() {
  return useSyncExternalStore(
    onlineManager.subscribe.bind(onlineManager),
    () => onlineManager.isOnline(),
    () => true,
  );
}
