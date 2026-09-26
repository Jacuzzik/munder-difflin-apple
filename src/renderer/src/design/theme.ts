/**
 * App-wide theme — five palettes over ONE token-driven component tree.
 *
 * History: v0.3.4 introduced a single light/dark switch that stamped
 * `data-cth-theme` on <html> and let tokens.css swap the `--cth-*` ramp. That
 * mechanism is unchanged and still load-bearing: the xterm palette, the DEC 2031
 * notification to running TUIs, and the per-agent Claude session theme
 * (config.terminalTheme) all key off the BASE MODE ('light' | 'dark').
 *
 * v0.5 adds a PALETTE on top of the mode. Each palette declares which base mode
 * it rides on, and tokens.css layers its overrides under
 * `:root[data-cth-palette='<id>']`. So:
 *
 *   original → light base, the recognizable cream/ink identity
 *   smoke    → dark base, warm smoke glass + ivory pills (v0.5.1)
 *   arctic   → light base, cool white/grey
 *   obsidian → dark base, near-black greyscale (+ greyscale simulator filter)
 *   ember    → dark base, graphite + orange accent
 *   violet   → dark base, deep violet + magenta accent
 *
 * `useAppTheme()` keeps returning the base MODE so every existing consumer
 * (PtyTerminalView, FullscreenTerminal) keeps its exact semantics. New code
 * that needs the palette uses `useAppPalette()`.
 *
 * Persistence stays where it always was — localStorage — under a new key, with
 * the legacy mode key kept in sync so a downgrade still lands on the right mode.
 * Switching is a pure attribute swap: no reload, no remount, no state touched.
 */
import { useSyncExternalStore } from 'react';

export type AppTheme = 'light' | 'dark';
export type AppPalette = 'original' | 'smoke' | 'obsidian' | 'ember' | 'violet' | 'arctic';

export interface PaletteInfo {
  id: AppPalette;
  name: string;
  mode: AppTheme;
  /** One-line description for the picker. */
  blurb: string;
  /** Literal swatch colours for the picker preview: [ground, surface, accent]. */
  swatch: [string, string, string];
}

/** Picker order. `original` first: it is the restore/default state. */
export const PALETTES: readonly PaletteInfo[] = [
  { id: 'original', name: 'Original', mode: 'light', blurb: 'The classic Munder Difflin office',  swatch: ['#FFF8E7', '#FFFDF5', '#1A1320'] },
  { id: 'smoke',    name: 'Smoke',    mode: 'dark',  blurb: 'Warm smoke glass with ivory accents',  swatch: ['#2F2A26', '#605B56', '#EFEAD8'] },
  { id: 'obsidian', name: 'Obsidian', mode: 'dark',  blurb: 'Near-black, monochrome, after hours', swatch: ['#0B0B0C', '#1A1A1D', '#E6E6E6'] },
  { id: 'ember',    name: 'Ember',    mode: 'dark',  blurb: 'Graphite with an orange glow',         swatch: ['#100E0D', '#1E1B19', '#FF8A2B'] },
  { id: 'violet',   name: 'Violet',   mode: 'dark',  blurb: 'Deep violet with magenta accents',     swatch: ['#0F0C13', '#1D1825', '#D05FE0'] },
  { id: 'arctic',   name: 'Arctic',   mode: 'light', blurb: 'Clean white and cool grey',            swatch: ['#F5F6F8', '#FFFFFF', '#4E6D8C'] }
] as const;

const PALETTE_BY_ID: Record<AppPalette, PaletteInfo> =
  Object.fromEntries(PALETTES.map((p) => [p.id, p])) as Record<AppPalette, PaletteInfo>;

const LS_PALETTE_KEY = 'cth.palette';
/** The v0.3.4 mode key. Still written, so downgrades and old readers agree. */
const LS_KEY = 'cth.theme';
/** Pre-0.3.4 the terminal had its own theme key — honor it once as the seed. */
const LEGACY_LS_KEY = 'cth.ptyTheme';

export function isPalette(v: unknown): v is AppPalette {
  return typeof v === 'string' && v in PALETTE_BY_ID;
}

export function paletteInfo(id: AppPalette): PaletteInfo {
  return PALETTE_BY_ID[id];
}

function load(): AppPalette {
  try {
    const p = window.localStorage.getItem(LS_PALETTE_KEY);
    if (isPalette(p)) return p;
    // Migration: a user who only ever had the light/dark toggle keeps what they
    // chose. Their dark was the neutral near-black ramp, which Obsidian extends.
    const v = window.localStorage.getItem(LS_KEY) ?? window.localStorage.getItem(LEGACY_LS_KEY);
    if (v === 'dark') return 'obsidian';
  } catch { /* noop */ }
  return 'original';
}

let palette: AppPalette = load();
const subscribers = new Set<() => void>();

function apply(): void {
  try {
    const root = document.documentElement;
    root.dataset.cthTheme = PALETTE_BY_ID[palette].mode;
    root.dataset.cthPalette = palette;
  } catch { /* SSR/tests */ }
}
apply();

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

/** Base mode of the active palette. */
export function appTheme(): AppTheme {
  return PALETTE_BY_ID[palette].mode;
}

export function appPalette(): AppPalette {
  return palette;
}

/** Select a palette. Returns the new BASE MODE so callers can forward it to
 *  terminals/config exactly as they did with the old toggle. */
export function setAppPalette(next: AppPalette): AppTheme {
  if (next !== palette) {
    palette = next;
    try {
      window.localStorage.setItem(LS_PALETTE_KEY, next);
      window.localStorage.setItem(LS_KEY, PALETTE_BY_ID[next].mode);
    } catch { /* noop */ }
    apply();
    subscribers.forEach((fn) => fn());
  }
  return PALETTE_BY_ID[palette].mode;
}

/** Adopt the palette stored in the harness config (the durable copy) at
 *  startup, WITHOUT writing it back. No-op when it is absent, invalid, or
 *  already active — so a user who never had one keeps their localStorage value
 *  (and the legacy dark → Obsidian migration). Returns true when it changed. */
export function adoptPersistedPalette(v: unknown): boolean {
  if (!isPalette(v) || v === palette) return false;
  setAppPalette(v);
  return true;
}

/** Legacy mode setter: picks the canonical palette for a mode unless the
 *  current palette already has that mode. */
export function setAppTheme(next: AppTheme): void {
  if (PALETTE_BY_ID[palette].mode === next) return;
  setAppPalette(next === 'dark' ? 'obsidian' : 'original');
}

/** Legacy light/dark flip (focus mode still has its own quick toggle). */
export function toggleAppTheme(): AppTheme {
  const next: AppTheme = appTheme() === 'dark' ? 'light' : 'dark';
  setAppTheme(next);
  return next;
}

/** Base mode — unchanged contract for existing consumers. */
export function useAppTheme(): AppTheme {
  return useSyncExternalStore(subscribe, () => PALETTE_BY_ID[palette].mode);
}

export function useAppPalette(): AppPalette {
  return useSyncExternalStore(subscribe, () => palette);
}
