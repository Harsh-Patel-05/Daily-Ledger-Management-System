import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  DEFAULT_ACCENT,
  THEME_MODES,
  applyAccentToDom,
  resolveDarkMode,
} from '../data/themePresets';

const STORAGE_KEY = 'dlms_theme_prefs';

function readStoredPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const mode = THEME_MODES.includes(parsed.mode) ? parsed.mode : 'light';
      return {
        mode,
        accent: parsed.accent || DEFAULT_ACCENT,
      };
    }
  } catch {
    // ignore corrupt storage
  }
  // Legacy key: 'dark' | 'light'
  const legacy = localStorage.getItem('dlms_theme');
  if (legacy === 'dark' || legacy === 'light') {
    return { mode: legacy, accent: DEFAULT_ACCENT };
  }
  return { mode: 'light', accent: DEFAULT_ACCENT };
}

function writeStoredPrefs(mode, accent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, accent }));
  // Keep legacy key in sync for older code paths / quick checks
  localStorage.setItem('dlms_theme', mode === 'system' ? (resolveDarkMode('system') ? 'dark' : 'light') : mode);
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(readStoredPrefs);
  const [darkMode, setDarkModeState] = useState(() => resolveDarkMode(readStoredPrefs().mode));

  const mode = prefs.mode;
  const accent = prefs.accent;

  // Apply dark class + full color theme (surfaces, borders, slate scale)
  useEffect(() => {
    const resolved = resolveDarkMode(mode);
    setDarkModeState(resolved);
    const root = document.documentElement;
    if (resolved) root.classList.add('dark');
    else root.classList.remove('dark');
    applyAccentToDom(accent, resolved);
    writeStoredPrefs(mode, accent);
  }, [mode, accent]);

  // Follow OS when mode === system — re-apply full palette for light/dark surfaces
  useEffect(() => {
    if (mode !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = mq.matches;
      setDarkModeState(resolved);
      const root = document.documentElement;
      if (resolved) root.classList.add('dark');
      else root.classList.remove('dark');
      applyAccentToDom(accent, resolved);
      writeStoredPrefs('system', accent);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode, accent]);

  const setMode = useCallback((nextMode) => {
    if (!THEME_MODES.includes(nextMode)) return;
    setPrefs((p) => ({ ...p, mode: nextMode }));
  }, []);

  const setAccent = useCallback((nextAccent) => {
    setPrefs((p) => ({ ...p, accent: nextAccent || DEFAULT_ACCENT }));
  }, []);

  /** Apply theme prefs from settings API / form (theme + accentColor). */
  const applyFromSettings = useCallback((settings = {}) => {
    const nextMode = THEME_MODES.includes(settings.theme) ? settings.theme : undefined;
    const nextAccent = settings.accentColor || undefined;
    setPrefs((p) => ({
      mode: nextMode ?? p.mode,
      accent: nextAccent ?? p.accent,
    }));
  }, []);

  /** Explicit light/dark (used by Settings when not using applyFromSettings). */
  const setDarkMode = useCallback((value) => {
    setPrefs((p) => ({ ...p, mode: value ? 'dark' : 'light' }));
  }, []);

  /** Navbar / command palette: flip between light and dark (exits system). */
  const toggleDarkMode = useCallback(() => {
    setPrefs((p) => {
      const currentlyDark = resolveDarkMode(p.mode);
      return { ...p, mode: currentlyDark ? 'light' : 'dark' };
    });
  }, []);

  const value = useMemo(
    () => ({
      darkMode,
      mode,
      accent,
      setMode,
      setAccent,
      setDarkMode,
      toggleDarkMode,
      applyFromSettings,
    }),
    [darkMode, mode, accent, setMode, setAccent, setDarkMode, toggleDarkMode, applyFromSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
