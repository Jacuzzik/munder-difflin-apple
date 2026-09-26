/**
 * Font library for the Appearance panel — GENERATED alongside fonts-library.css
 * from assets/fonts/library (OFL-1.1, see LICENSE.txt there). Keep the ids,
 * stacks and weights in step with those files; `displayAdjust` is hand-measured.
 *
 * `headingWeight` is the weight display-slot labels use with this face: 600 for
 * variable faces that reach it, otherwise the heaviest real file, so a heading is
 * never faux-bolded by the browser.
 *
 * `displayAdjust` (optional) replaces the display slot's default
 * `font-size-adjust: 0.7` for the few wide or low-x-height faces that would
 * otherwise overflow the tightest display row (the agent sidebar tabs). Each
 * value was measured in the running app, minus a 0.02 margin.
 */
export type FontCategory = 'system' | 'sans' | 'serif' | 'display' | 'mono' | 'pixel';

export interface FontDef {
  id: string;
  label: string;
  category: FontCategory;
  /** Full CSS font-family stack, i18n fallbacks included. */
  stack: string;
  headingWeight: number;
  displayAdjust?: number;
}

/** CJK + Arabic tail every stack ends with, so a localized UI never falls to a
 *  generic face (same rule as tokens.css). */
const I18N = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Geeza Pro", "Noto Naskh Arabic", "Segoe UI Historic"';
const stack = (family: string, fallback: string) => `"${family}", ${fallback}, ${I18N}`;

export const FONTS: readonly FontDef[] = [
  // The app's own faces (already bundled in assets/fonts/).
  { id: 'system', label: 'System', category: 'system', stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI Variable", "Segoe UI", system-ui, ${I18N}, sans-serif`, headingWeight: 600 },
  { id: 'inter', label: 'Inter', category: 'sans', stack: stack('Inter', 'system-ui, sans-serif'), headingWeight: 600 },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', category: 'mono', stack: stack('JetBrains Mono', 'ui-monospace, monospace'), headingWeight: 600 },
  { id: 'press-start-2p', label: 'Press Start 2P', category: 'pixel', stack: stack('Press Start 2P', 'monospace'), headingWeight: 400 },

  { id: 'albert-sans', label: 'Albert Sans', category: 'sans', stack: stack('MDL Albert Sans', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'bricolage-grotesque', label: 'Bricolage Grotesque', category: 'display', stack: stack('MDL Bricolage Grotesque', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', category: 'serif', stack: stack('MDL Cormorant Garamond', 'Georgia, "Times New Roman", serif'), headingWeight: 600, displayAdjust: 0.59 },
  { id: 'dm-sans', label: 'DM Sans', category: 'sans', stack: stack('MDL DM Sans', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'dm-serif-display', label: 'DM Serif Display', category: 'serif', stack: stack('MDL DM Serif Display', 'Georgia, "Times New Roman", serif'), headingWeight: 400 },
  { id: 'eb-garamond', label: 'EB Garamond', category: 'serif', stack: stack('MDL EB Garamond', 'Georgia, "Times New Roman", serif'), headingWeight: 600, displayAdjust: 0.61 },
  { id: 'figtree', label: 'Figtree', category: 'sans', stack: stack('MDL Figtree', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'fira-code', label: 'Fira Code', category: 'mono', stack: stack('MDL Fira Code', 'ui-monospace, "SF Mono", Menlo, monospace'), headingWeight: 600 },
  { id: 'fraunces', label: 'Fraunces', category: 'serif', stack: stack('MDL Fraunces', 'Georgia, "Times New Roman", serif'), headingWeight: 600, displayAdjust: 0.66 },
  { id: 'geist', label: 'Geist', category: 'sans', stack: stack('MDL Geist', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'geist-mono', label: 'Geist Mono', category: 'mono', stack: stack('MDL Geist Mono', 'ui-monospace, "SF Mono", Menlo, monospace'), headingWeight: 600 },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', category: 'mono', stack: stack('MDL IBM Plex Mono', 'ui-monospace, "SF Mono", Menlo, monospace'), headingWeight: 700 },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', category: 'sans', stack: stack('MDL IBM Plex Sans', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'instrument-serif', label: 'Instrument Serif', category: 'serif', stack: stack('MDL Instrument Serif', 'Georgia, "Times New Roman", serif'), headingWeight: 400 },
  { id: 'lexend', label: 'Lexend', category: 'sans', stack: stack('MDL Lexend', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'libre-baskerville', label: 'Libre Baskerville', category: 'serif', stack: stack('MDL Libre Baskerville', 'Georgia, "Times New Roman", serif'), headingWeight: 700, displayAdjust: 0.63 },
  { id: 'lora', label: 'Lora', category: 'serif', stack: stack('MDL Lora', 'Georgia, "Times New Roman", serif'), headingWeight: 600 },
  { id: 'manrope', label: 'Manrope', category: 'sans', stack: stack('MDL Manrope', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'nunito', label: 'Nunito', category: 'sans', stack: stack('MDL Nunito', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'onest', label: 'Onest', category: 'sans', stack: stack('MDL Onest', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'outfit', label: 'Outfit', category: 'sans', stack: stack('MDL Outfit', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'pixelify-sans', label: 'Pixelify Sans', category: 'pixel', stack: stack('MDL Pixelify Sans', 'ui-monospace, monospace'), headingWeight: 600 },
  { id: 'playfair-display', label: 'Playfair Display', category: 'serif', stack: stack('MDL Playfair Display', 'Georgia, "Times New Roman", serif'), headingWeight: 600 },
  { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', category: 'sans', stack: stack('MDL Plus Jakarta Sans', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'rubik', label: 'Rubik', category: 'sans', stack: stack('MDL Rubik', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'silkscreen', label: 'Silkscreen', category: 'pixel', stack: stack('MDL Silkscreen', 'ui-monospace, monospace'), headingWeight: 700, displayAdjust: 0.57 },
  { id: 'sora', label: 'Sora', category: 'sans', stack: stack('MDL Sora', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'space-grotesk', label: 'Space Grotesk', category: 'sans', stack: stack('MDL Space Grotesk', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'space-mono', label: 'Space Mono', category: 'mono', stack: stack('MDL Space Mono', 'ui-monospace, "SF Mono", Menlo, monospace'), headingWeight: 700 },
  { id: 'syne', label: 'Syne', category: 'display', stack: stack('MDL Syne', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600, displayAdjust: 0.66 },
  { id: 'unbounded', label: 'Unbounded', category: 'display', stack: stack('MDL Unbounded', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600, displayAdjust: 0.64 },
  { id: 'urbanist', label: 'Urbanist', category: 'sans', stack: stack('MDL Urbanist', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
  { id: 'vt323', label: 'VT323', category: 'pixel', stack: stack('MDL VT323', 'ui-monospace, monospace'), headingWeight: 400 },
  { id: 'work-sans', label: 'Work Sans', category: 'sans', stack: stack('MDL Work Sans', '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'), headingWeight: 600 },
];

const BY_ID = new Map(FONTS.map((f) => [f.id, f]));
export function fontById(id: string | undefined): FontDef | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export interface FontPairing { id: string; label: string; heading: string; body: string }

/** Curated heading + body pairings. `default` is the shipped look. */
export const PAIRINGS: readonly FontPairing[] = [
  { id: 'default',   label: 'Default',   heading: 'system',              body: 'system' },
  { id: 'editorial', label: 'Editorial', heading: 'playfair-display',    body: 'inter' },
  { id: 'studio',    label: 'Studio',    heading: 'instrument-serif',    body: 'figtree' },
  { id: 'soft',      label: 'Soft',      heading: 'fraunces',            body: 'manrope' },
  { id: 'modern',    label: 'Modern',    heading: 'space-grotesk',       body: 'dm-sans' },
  { id: 'geometric', label: 'Geometric', heading: 'outfit',              body: 'plus-jakarta-sans' },
  { id: 'swiss',     label: 'Swiss',     heading: 'geist',               body: 'geist' },
  { id: 'tech',      label: 'Tech',      heading: 'jetbrains-mono',      body: 'ibm-plex-sans' },
  { id: 'bookish',   label: 'Bookish',   heading: 'cormorant-garamond',  body: 'lora' },
  { id: 'bold',      label: 'Bold',      heading: 'bricolage-grotesque', body: 'work-sans' },
  { id: 'classic',   label: 'Classic',   heading: 'libre-baskerville',   body: 'albert-sans' },
  { id: 'avant',     label: 'Avant',     heading: 'syne',                body: 'urbanist' },
  { id: 'wide',      label: 'Wide',      heading: 'unbounded',           body: 'onest' },
  { id: 'readable',  label: 'Readable',  heading: 'lexend',              body: 'lexend' },
  { id: 'rounded',   label: 'Rounded',   heading: 'nunito',              body: 'rubik' },
  { id: 'arcade',    label: 'Arcade',    heading: 'press-start-2p',      body: 'pixelify-sans' },
  { id: 'terminal',  label: 'Terminal',  heading: 'vt323',               body: 'space-mono' }
];
