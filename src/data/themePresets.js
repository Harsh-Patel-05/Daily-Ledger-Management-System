/** Full color themes — selecting one retints the whole app (surfaces, borders, slate scale). */

function hsl(h, s, l) {
  return `hsl(${h} ${s}% ${l}%)`;
}

/** Build a tinted neutral (slate-like) scale from a hue. */
function buildNeutralScale(h, chroma) {
  const c = chroma;
  return {
    50: hsl(h, c * 0.45, 97.5),
    100: hsl(h, c * 0.4, 94.5),
    200: hsl(h, c * 0.35, 88),
    300: hsl(h, c * 0.3, 78),
    400: hsl(h, c * 0.28, 64),
    500: hsl(h, c * 0.25, 48),
    600: hsl(h, c * 0.28, 38),
    700: hsl(h, c * 0.32, 28),
    800: hsl(h, c * 0.35, 18),
    900: hsl(h, c * 0.38, 12),
    950: hsl(h, c * 0.42, 7),
  };
}

function buildTheme({ id, label, hue, chroma = 28, primaryS = 78, primaryL = 48 }) {
  const primary = hsl(hue, primaryS, primaryL);
  const primaryDark = hsl(hue, Math.min(primaryS + 4, 90), Math.max(primaryL - 8, 32));
  const primaryLight = hsl(hue, Math.max(primaryS - 8, 55), Math.min(primaryL + 10, 62));
  const secondaryHue = (hue + 140) % 360;
  const secondary = hsl(secondaryHue, 65, 42);
  const secondaryDark = hsl(secondaryHue, 70, 34);
  const scale = buildNeutralScale(hue, chroma);

  return {
    id,
    label,
    hue,
    primary,
    primaryDark,
    primaryLight,
    secondary,
    secondaryDark,
    scale,
    light: {
      background: scale[50],
      surface: hsl(hue, Math.max(chroma * 0.15, 8), 99.2),
      border: scale[200],
      muted: scale[500],
    },
    dark: {
      background: scale[900],
      surface: scale[800],
      border: scale[700],
      muted: scale[400],
    },
  };
}

export const ACCENT_PRESETS = [
  buildTheme({ id: 'blue', label: 'Blue', hue: 217, chroma: 26, primaryS: 84, primaryL: 53 }),
  buildTheme({ id: 'emerald', label: 'Emerald', hue: 160, chroma: 30, primaryS: 76, primaryL: 40 }),
  buildTheme({ id: 'teal', label: 'Teal', hue: 173, chroma: 32, primaryS: 80, primaryL: 36 }),
  buildTheme({ id: 'indigo', label: 'Indigo', hue: 239, chroma: 28, primaryS: 76, primaryL: 55 }),
  buildTheme({ id: 'violet', label: 'Violet', hue: 262, chroma: 30, primaryS: 72, primaryL: 52 }),
  buildTheme({ id: 'rose', label: 'Rose', hue: 347, chroma: 28, primaryS: 77, primaryL: 50 }),
  buildTheme({ id: 'orange', label: 'Orange', hue: 24, chroma: 32, primaryS: 90, primaryL: 48 }),
  buildTheme({ id: 'amber', label: 'Amber', hue: 38, chroma: 34, primaryS: 92, primaryL: 44 }),
  buildTheme({ id: 'cyan', label: 'Cyan', hue: 189, chroma: 30, primaryS: 86, primaryL: 38 }),
  buildTheme({ id: 'slate', label: 'Slate', hue: 215, chroma: 12, primaryS: 20, primaryL: 38 }),
];

export const DEFAULT_ACCENT = 'blue';
export const THEME_MODES = ['light', 'dark', 'system'];

export function getAccentPreset(id) {
  return ACCENT_PRESETS.find((p) => p.id === id) || ACCENT_PRESETS[0];
}

/** Apply full palette so primary + slate/surfaces all match the selected color theme. */
export function applyAccentToDom(accentId, isDark = false) {
  const preset = getAccentPreset(accentId);
  const root = document.documentElement;
  const surface = isDark ? preset.dark : preset.light;
  const { scale } = preset;

  root.dataset.colorTheme = preset.id;

  root.style.setProperty('--color-primary', preset.primary);
  root.style.setProperty('--color-primary-dark', preset.primaryDark);
  root.style.setProperty('--color-primary-light', preset.primaryLight);
  root.style.setProperty('--color-secondary', preset.secondary);
  root.style.setProperty('--color-secondary-dark', preset.secondaryDark);

  root.style.setProperty('--color-background', surface.background);
  root.style.setProperty('--color-surface', surface.surface);
  root.style.setProperty('--color-border', surface.border);
  root.style.setProperty('--color-muted', surface.muted);

  // Retint every slate-* utility used across the app
  Object.entries(scale).forEach(([step, value]) => {
    root.style.setProperty(`--color-slate-${step}`, value);
  });

  // Soft primary tints for soft buttons / chips
  root.style.setProperty(
    '--color-primary-soft',
    isDark
      ? `color-mix(in srgb, ${preset.primary} 22%, transparent)`
      : `color-mix(in srgb, ${preset.primary} 12%, white)`,
  );
  root.style.setProperty(
    '--color-primary-soft-hover',
    isDark
      ? `color-mix(in srgb, ${preset.primary} 34%, transparent)`
      : `color-mix(in srgb, ${preset.primary} 20%, white)`,
  );
}

export function resolveDarkMode(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
