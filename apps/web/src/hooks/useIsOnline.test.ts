import { renderHook, act } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { useIsOnline } from './useIsOnline';

describe('useIsOnline', () => {
  afterEach(() => {
    // Restore to online state after each test
    act(() => {
      onlineManager.setOnline(undefined);
    });
  });

  it('returns true when online', () => {
    act(() => {
      onlineManager.setOnline(true);
    });
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
  });

  it('returns false when offline', () => {
    act(() => {
      onlineManager.setOnline(false);
    });
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(false);
  });

  it('updates reactively when online status changes', () => {
    act(() => {
      onlineManager.setOnline(true);
    });
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);

    act(() => {
      onlineManager.setOnline(false);
    });
    expect(result.current).toBe(false);

    act(() => {
      onlineManager.setOnline(true);
    });
    expect(result.current).toBe(true);
  });
});
