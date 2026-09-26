/**
 * Appearance customisation — layered ON TOP of the active palette (theme.ts).
 *
 * Everything here is presentation: it only ever writes CSS custom properties on
 * <html> (inline, so they win over the palette blocks in tokens.css) and one
 * class. No store, agent, PTY or scene state is read or written. "Reset" simply
 * removes the inline properties, which hands every token back to the palette.
 *
 * What each control drives:
 *   primary      → pills, primary buttons, focus ring, selected card
 *   secondary    → the supporting accent: pill track, hover, selection,
 *                  outlined-button borders (never text, so it stays readable)
 *   fonts        → --cth-font-display (headings/labels) + --cth-font-ui (body),
 *                  size-normalised with font-size-adjust so layouts hold
 *   glassOpacity → --cth-glass-alpha (the reduced-transparency media rule
 *                  still overrides the fill, so accessibility wins)
 *   background   → the Backdrop layer: theme gradient, a colour, or an image
 *                  (image bytes live in IndexedDB, never in config)
 *   window       → true OS-level transparency; the flag is read by the main
 *                  process when the window is CREATED, so it needs a restart.
 *
 * Persistence mirrors the palette: localStorage for the first paint, plus a
 * durable copy in config (appAppearance / windowTransparency) through the
 * existing config IPC, debounced so a dragged slider is not a write storm.
 */
import { useSyncExternalStore } from 'react';
import { fontById } from './fontLibrary';

export interface Rgb { r: number; g: number; b: number }
export type BackgroundKind = 'theme' | 'color' | 'image';

export interface Appearance {
  primary: Rgb | null;
  secondary: Rgb | null;
  headingFont: string;
  bodyFont: string;
  /** null = the palette's own glass density. */
  glassOpacity: number | null;
  background: { kind: BackgroundKind; color: Rgb; dim: number; blur: number };
  windowTransparent: boolean;
  /** How much of the backdrop stays painted when the window is transparent. */
  windowOpacity: number;
}

export const DEFAULT_APPEARANCE: Appearance = {
  primary: null,
  secondary: null,
  headingFont: 'system',
  bodyFont: 'system',
  glassOpacity: null,
  background: { kind: 'theme', color: { r: 46, g: 52, b: 64 }, dim: 0.25, blur: 0 },
  windowTransparent: false,
  windowOpacity: 0.75
};

const LS_KEY = 'cth.appearance';

// ── colour helpers ───────────────────────────────────────────────────────────
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ch = (v: number) => Math.round(clamp(v, 0, 255));
export const rgbCss = (c: Rgb, a = 1) => `rgb(${ch(c.r)} ${ch(c.g)} ${ch(c.b)} / ${a})`;
export const toHex = (c: Rgb) => '#' + [c.r, c.g, c.b].map((v) => ch(v).toString(16).padStart(2, '0')).join('').toUpperCase();
export function fromHex(h: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return null;
  const s = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}
function lum(c: Rgb): number {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
export function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const INK_DARK: Rgb = { r: 20, g: 18, b: 16 };
const INK_LIGHT: Rgb = { r: 255, g: 255, b: 255 };
/** Text colour for a fill: whichever of near-black / white reads better. */
export const onColor = (c: Rgb): Rgb => (contrast(c, INK_DARK) >= contrast(c, INK_LIGHT) ? INK_DARK : INK_LIGHT);

// ── state ────────────────────────────────────────────────────────────────────
function sanitize(v: unknown): Appearance {
  const d = DEFAULT_APPEARANCE;
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Appearance>;
  const rgb = (x: unknown): Rgb | null => {
    const c = x as Rgb | null;
    return c && [c.r, c.g, c.b].every((n) => typeof n === 'number' && isFinite(n))
      ? { r: ch(c.r), g: ch(c.g), b: ch(c.b) } : null;
  };
  const bg = (o.background ?? {}) as Partial<Appearance['background']>;
  const num = (x: unknown, lo: number, hi: number, dflt: number) =>
    typeof x === 'number' && isFinite(x) ? clamp(x, lo, hi) : dflt;
  return {
    primary: rgb(o.primary),
    secondary: rgb(o.secondary),
    headingFont: fontById(o.headingFont) ? o.headingFont! : d.headingFont,
    bodyFont: fontById(o.bodyFont) ? o.bodyFont! : d.bodyFont,
    glassOpacity: o.glassOpacity == null ? null : num(o.glassOpacity, 0.25, 1, 0.75),
    background: {
      kind: bg.kind === 'color' || bg.kind === 'image' ? bg.kind : 'theme',
      color: rgb(bg.color) ?? d.background.color,
      dim: num(bg.dim, 0, 0.8, d.background.dim),
      blur: num(bg.blur, 0, 40, d.background.blur)
    },
    windowTransparent: o.windowTransparent === true,
    windowOpacity: num(o.windowOpacity, 0.15, 1, d.windowOpacity)
  };
}

function load(): Appearance {
  try { return sanitize(JSON.parse(window.localStorage.getItem(LS_KEY) ?? 'null')); } catch { return DEFAULT_APPEARANCE; }
}

let state: Appearance = load();
/** Whether the CURRENT window was created transparent — fixed for its life. */
let windowIsTransparent = false;
let imageUrl: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

// ── apply ────────────────────────────────────────────────────────────────────
function setVar(name: string, value: string | null): void {
  const s = document.documentElement.style;
  if (value == null) s.removeProperty(name); else s.setProperty(name, value);
}

function backdropCss(a: Appearance): string | null {
  const bg = a.background;
  if (bg.kind === 'color') {
    const c = bg.color;
    const lift = rgbCss({ r: c.r + 34, g: c.g + 34, b: c.b + 34 });
    const sink = rgbCss({ r: c.r - 26, g: c.g - 26, b: c.b - 26 });
    return `radial-gradient(55% 65% at 12% 18%, ${lift} 0%, transparent 70%), `
      + `radial-gradient(60% 60% at 90% 90%, ${sink} 0%, transparent 70%), ${rgbCss(c)}`;
  }
  if (bg.kind === 'image' && imageUrl) return `url("${imageUrl}") center / cover no-repeat, ${rgbCss(bg.color)}`;
  return null; // theme ambient
}

export function applyAppearance(a: Appearance = state): void {
  try {
    // primary
    if (a.primary) {
      const p = a.primary; const fg = rgbCss(onColor(p));
      setVar('--cth-pill-active-bg', rgbCss(p)); setVar('--cth-pill-active-fg', fg);
      setVar('--cth-card-active-bg', rgbCss(p)); setVar('--cth-card-active-fg', fg);
      setVar('--cth-accent', rgbCss(p)); setVar('--cth-accent-soft', rgbCss(p, 0.13));
      setVar('--cth-focus-ring', `0 0 0 3px ${rgbCss(p, 0.38)}`);
    } else {
      for (const n of ['--cth-pill-active-bg', '--cth-pill-active-fg', '--cth-card-active-bg', '--cth-card-active-fg',
        '--cth-accent', '--cth-accent-soft', '--cth-focus-ring']) setVar(n, null);
    }
    // secondary (supporting accent — tints, never text)
    if (a.secondary) {
      const s = a.secondary;
      setVar('--cth-pill-track', rgbCss(s, 0.16)); setVar('--cth-selection', rgbCss(s, 0.32));
      setVar('--cth-hover', rgbCss(s, 0.12)); setVar('--cth-pressed', rgbCss(s, 0.2));
      setVar('--cth-outline', `color-mix(in srgb, ${rgbCss(s)} 70%, var(--cth-ink-300))`);
    } else {
      for (const n of ['--cth-pill-track', '--cth-selection', '--cth-hover', '--cth-pressed', '--cth-outline']) setVar(n, null);
    }
    // fonts
    const hf = fontById(a.headingFont); const bf = fontById(a.bodyFont);
    setVar('--cth-font-display', a.headingFont === 'system' ? null : hf?.stack ?? null);
    setVar('--cth-display-weight', a.headingFont === 'system' ? null : String(hf?.headingWeight ?? 600));
    setVar('--cth-display-adjust', a.headingFont === 'system' || hf?.displayAdjust == null ? null : String(hf.displayAdjust));
    setVar('--cth-font-ui', a.bodyFont === 'system' ? null : bf?.stack ?? null);
    // Normalise x-height to the default face's so a new body font keeps layouts.
    setVar('--cth-body-adjust', a.bodyFont === 'system' ? null : '0.53');
    // glass
    setVar('--cth-glass-alpha', a.glassOpacity == null ? null : String(a.glassOpacity));
    // background
    setVar('--cth-backdrop', backdropCss(a));
    const img = a.background.kind === 'image' && !!imageUrl;
    setVar('--cth-bg-dim', img ? String(a.background.dim) : null);
    setVar('--cth-bg-blur', img && a.background.blur > 0 ? `${a.background.blur}px` : null);
    // window
    document.documentElement.classList.toggle('cth-window-transparent', windowIsTransparent);
    setVar('--cth-window-opacity', windowIsTransparent ? String(a.windowOpacity) : null);
  } catch { /* SSR/tests */ }
}

// ── persistence ──────────────────────────────────────────────────────────────
let cfgTimer: ReturnType<typeof setTimeout> | null = null;
function persist(a: Appearance, windowFlagChanged: boolean): void {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(a)); } catch { /* noop */ }
  if (cfgTimer) clearTimeout(cfgTimer);
  const write = () => {
    cfgTimer = null;
    // The preload's type does not declare these keys; main merges them verbatim
    // (and reads windowTransparency when it creates the window).
    const patch = { appAppearance: a, windowTransparency: a.windowTransparent };
    void window.cth?.updateConfig?.(patch as Parameters<typeof window.cth.updateConfig>[0]);
  };
  if (windowFlagChanged) write(); else cfgTimer = setTimeout(write, 350);
}

export function updateAppearance(patch: Partial<Appearance> | ((a: Appearance) => Partial<Appearance>)): void {
  const p = typeof patch === 'function' ? patch(state) : patch;
  const next = sanitize({ ...state, ...p, background: { ...state.background, ...(p.background ?? {}) } });
  const windowFlagChanged = next.windowTransparent !== state.windowTransparent;
  state = next;
  applyAppearance(state);
  persist(state, windowFlagChanged);
  emit();
}

export function resetAppearance(): void {
  const keepWindow = state.windowTransparent;
  state = { ...DEFAULT_APPEARANCE, windowTransparent: keepWindow };
  void clearBackgroundImage(false);
  applyAppearance(state);
  persist(state, false);
  emit();
}

/** Startup: adopt the durable config copy (a quit can drop the localStorage
 *  write — every quit ends in app.exit()), note whether THIS window was created
 *  transparent, then load the background image. */
export function initAppearance(cfg: { appAppearance?: unknown; windowTransparency?: boolean } | null): void {
  windowIsTransparent = cfg?.windowTransparency === true;
  if (cfg?.appAppearance) {
    state = sanitize(cfg.appAppearance);
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }
  applyAppearance(state);
  emit();
  void loadBackgroundImage();
}

// ── background image (IndexedDB) ─────────────────────────────────────────────
const DB = 'cth-appearance'; const STORE = 'images'; const KEY = 'background';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, mode); const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { res(req.result); d.close(); };
    tx.onerror = () => { rej(tx.error); d.close(); };
  });
}
function setImageUrl(blob: Blob | null): void {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = blob ? URL.createObjectURL(blob) : null;
}
async function loadBackgroundImage(): Promise<void> {
  try {
    const blob = await idb<Blob | undefined>('readonly', (s) => s.get(KEY));
    setImageUrl(blob ?? null);
  } catch { setImageUrl(null); }
  applyAppearance(state); emit();
}

/** Downscale to the screen (max 2560 px wide, JPEG) before storing: a 12 MP
 *  photo becomes a few hundred KB and decodes instantly on every launch. */
async function downscale(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2560 / bmp.width, 1600 / bmp.height);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', 0.86));
}

export async function setBackgroundImage(file: Blob): Promise<void> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');
  const small = await downscale(file);
  await idb('readwrite', (s) => s.put(small, KEY));
  setImageUrl(small);
  updateAppearance((a) => ({ background: { ...a.background, kind: 'image' } }));
}

export async function clearBackgroundImage(switchToTheme = true): Promise<void> {
  try { await idb('readwrite', (s) => s.delete(KEY)); } catch { /* noop */ }
  setImageUrl(null);
  if (switchToTheme) updateAppearance((a) => ({ background: { ...a.background, kind: 'theme' } }));
  else { applyAppearance(state); emit(); }
}

// ── hooks ────────────────────────────────────────────────────────────────────
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useAppearance(): Appearance { return useSyncExternalStore(subscribe, () => state); }
export function useBackgroundImageUrl(): string | null { return useSyncExternalStore(subscribe, () => imageUrl); }
export function useWindowIsTransparent(): boolean { return useSyncExternalStore(subscribe, () => windowIsTransparent); }

applyAppearance(state);
