'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseAntiCheatOptions {
  enabled: boolean;
  onBlur?: (blurCount: number) => void;
  onAutoSubmit?: (blurCount: number) => void;
  maxBlurs?: number; // Auto-submit after this many blurs (default: Infinity = never auto by count)
}

/**
 * useAntiCheat — Monitors browser focus and visibility.
 * When enabled, tracks blur/visibilitychange events and can auto-submit the quiz.
 *
 * Returns:
 * - blurCount: number of times the user left the quiz
 * - autoSubmitted: whether the hook triggered an auto-submit
 */
export function useAntiCheat({ enabled, onBlur, onAutoSubmit, maxBlurs = Infinity }: UseAntiCheatOptions) {
  const blurCountRef = useRef(0);
  const autoSubmittedRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onBlurRef = useRef(onBlur);

  // Keep refs fresh
  onAutoSubmitRef.current = onAutoSubmit;
  onBlurRef.current = onBlur;

  const handleBlur = useCallback(() => {
    if (!enabled || autoSubmittedRef.current) return;

    blurCountRef.current += 1;
    onBlurRef.current?.(blurCountRef.current);

    // Auto-submit if max blurs exceeded
    if (blurCountRef.current >= maxBlurs && onAutoSubmitRef.current) {
      autoSubmittedRef.current = true;
      onAutoSubmitRef.current(blurCountRef.current);
    }
  }, [enabled, maxBlurs]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      handleBlur();
    }
  }, [handleBlur]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleBlur, handleVisibilityChange]);

  return {
    getBlurCount: () => blurCountRef.current,
    isAutoSubmitted: () => autoSubmittedRef.current,
  };
}
