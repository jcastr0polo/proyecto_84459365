'use client';

/**
 * ThemeProvider — Sistema de temas oscuro/claro
 * Fase 23 — Design System Architecture
 * 
 * - Reads config.json "theme" as default
 * - Respects prefers-color-scheme from OS
 * - Persists user preference in localStorage
 * - Provides toggle via context
 * - Sets data-theme attribute on <html> for CSS variable switching
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

const STORAGE_KEY = 'platform-theme';

/* ─── Hydration-safe check ─── */
function subscribeToNothing() { return () => {}; }
function getClientSnapshot() { return true; }
function getServerSnapshot() { return false; }

export default function ThemeProvider({ children, defaultTheme = 'dark' }: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const isClient = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  const [theme, setThemeState] = useState<Theme>(() => {
    // During SSR, use default
    if (typeof window === 'undefined') return defaultTheme;

    // 1. Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;

    // 2. Check OS preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';

    // 3. Fall back to config default
    return defaultTheme;
  });

  // Apply theme to document + mark as hydrated (for SSR framer-motion fix)
  useEffect(() => {
    if (!isClient) return;
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);

    // Delay .hydrated by one frame so framer-motion can start animations
    // before the CSS override (html:not(.hydrated)) is removed
    if (!html.classList.contains('hydrated')) {
      requestAnimationFrame(() => {
        html.classList.add('hydrated');
      });
    }
  }, [theme, isClient]);

  // Listen for OS preference changes
  useEffect(() => {
    if (!isClient) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function handler(e: MediaQueryListEvent) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    }
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [isClient]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ─── ThemeToggle button component ─── */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Render a fixed-size placeholder during SSR to avoid hydration mismatch
  const isDark = mounted ? theme === 'dark' : true;

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors cursor-pointer
                  text-subtle hover:text-foreground/80
                  hover:bg-foreground/[0.06] ${className}`}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
