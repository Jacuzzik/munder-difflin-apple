/**
 * The one place a palette change fans out beyond CSS. Both theme entry points
 * (the top-bar picker and focus mode's quick toggle) go through here so a TUI
 * running in a background terminal is never left on the old mode.
 *
 * Only a BASE MODE change is forwarded to terminals: moving Obsidian → Ember
 * changes chrome and the xterm palette (PtyTerminalView follows useAppPalette),
 * but a running program only understands light/dark, so it is told nothing it
 * does not need. The palette NAME is persisted on every change.
 */
import { appPalette, appTheme, setAppPalette, toggleAppTheme, type AppPalette, type AppTheme } from './theme';
import { notifyThemeChangeAll } from '@/components/terminalPool';

/** Durable copy in the harness config — see HarnessConfig.appPalette. On a
 *  light↔dark crossing the same single write also carries `terminalTheme`, so
 *  every agent (re)spawned from now on gets the matching Claude session theme
 *  (scoped to harness agents; the user's global Claude theme is never touched).
 *  A same-mode switch writes the palette name only: terminalTheme is untouched. */
function persist(palette: AppPalette, prev: AppTheme, next: AppTheme): void {
  const patch: { appPalette: AppPalette; terminalTheme?: AppTheme } = { appPalette: palette };
  if (prev !== next) patch.terminalTheme = next;
  // The preload's type does not declare appPalette; main merges it verbatim.
  void window.cth.updateConfig(patch as Parameters<typeof window.cth.updateConfig>[0]);
}

/** Tell every RUNNING program the mode flipped (DEC mode 2031 subscribers) —
 *  only when it actually did. */
function notifyMode(prev: AppTheme, next: AppTheme): void {
  if (prev !== next) notifyThemeChangeAll(next);
}

export function selectPalette(id: AppPalette): void {
  const prev = appTheme();
  const next = setAppPalette(id);
  notifyMode(prev, next);
  persist(id, prev, next);
}

export function toggleModeEverywhere(): AppTheme {
  const prev = appTheme();
  const next = toggleAppTheme();
  notifyMode(prev, next);
  persist(appPalette(), prev, next);
  return next;
}
