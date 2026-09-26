/**
 * Appearance panel — a non-modal floating sheet (no scrim) that grows from the
 * theme button, so every change is seen live on the real app underneath.
 *
 * Everything here writes through design/appearance.ts (CSS variables on <html>)
 * or design/themeActions.ts (palette). Presentation only: no agent, terminal,
 * task or scene state is touched.
 *
 * Controls follow the Apple Design skill: sliders track the pointer 1:1 with
 * pointer capture and full keyboard support (role=slider); segmented controls
 * and the sheet itself move on critically damped springs; reduced motion is
 * honoured through the root MotionConfig.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { PALETTES, useAppPalette, type PaletteInfo } from '@/design/theme';
import { selectPalette } from '@/design/themeActions';
import {
  clamp, clearBackgroundImage, contrast, fromHex, onColor, resetAppearance, rgbCss, setBackgroundImage, toHex,
  updateAppearance, useAppearance, useBackgroundImageUrl, useWindowIsTransparent, type BackgroundKind, type Rgb
} from '@/design/appearance';
import { FONTS, PAIRINGS, fontById, type FontCategory, type FontDef } from '@/design/fontLibrary';

// ── open/close store ─────────────────────────────────────────────────────────
let isOpen = false;
const subs = new Set<() => void>();
export function openAppearancePanel(): void { isOpen = true; subs.forEach((f) => f()); }
export function closeAppearancePanel(): void { isOpen = false; subs.forEach((f) => f()); }
const useOpen = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => isOpen);

const SHEET_SPRING = { type: 'spring', visualDuration: 0.34, bounce: 0 } as const;
const PILL_SPRING = { type: 'spring', visualDuration: 0.32, bounce: 0.12 } as const;

/** Read the palette's current value of a colour token (for "default" states). */
function readTokenRgb(token: string): Rgb {
  const el = document.createElement('span');
  el.style.color = `var(${token})`;
  el.style.display = 'none';
  document.body.appendChild(el);
  const m = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(getComputedStyle(el).color);
  el.remove();
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : { r: 128, g: 128, b: 128 };
}

const PRESETS: Rgb[] = ['#EFEAD8', '#FF8A2B', '#D05FE0', '#4F9FAF', '#5CA97A', '#D96A62', '#4E6D8C', '#DCAB3C', '#A896E3', '#1A1320']
  .map((h) => fromHex(h)!);

// ── primitives ───────────────────────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="cth-ap-section">
      <div className="cth-ap-section-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextButton({ onClick, children, label, disabled }: { onClick: () => void; children: ReactNode; label?: string; disabled?: boolean }) {
  return <button type="button" className="cth-ap-link" onClick={onClick} aria-label={label} disabled={disabled}>{children}</button>;
}

interface SliderProps {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string; track?: string; disabled?: boolean;
}
/** Direct-manipulation slider: pointer-captured, 1:1 with the pointer, full
 *  keyboard support, announced as a real slider. */
function Slider({ label, value, min, max, step = 1, onChange, format = (v) => String(Math.round(v)), track, disabled }: SliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100;
  // Snap to the step grid and drop float noise (0.1 + 0.2 ≠ 0.3).
  const snap = (v: number) => Math.round(clamp(Math.round(v / step) * step, min, max) * 1e4) / 1e4;
  const fromX = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(snap(min + clamp((clientX - r.left) / r.width, 0, 1) * (max - min)));
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    setDragging(true);
    fromX(e.clientX);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = Math.max(step, (max - min) / 10);
    const map: Record<string, number> = {
      ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step,
      PageUp: value + big, PageDown: value - big, Home: min, End: max
    };
    if (e.key in map) { e.preventDefault(); onChange(snap(map[e.key])); }
  };
  return (
    <div className="cth-ap-slider-row" data-disabled={disabled || undefined}>
      <span className="cth-ap-slider-label">{label}</span>
      <div
        ref={ref}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 100) / 100}
        aria-valuetext={format(value)}
        aria-disabled={disabled || undefined}
        className="cth-ap-slider"
        style={{ '--track': track ?? 'var(--cth-pill-track)' } as CSSProperties}
        onPointerDown={onDown}
        onPointerMove={(e) => { if (dragging) fromX(e.clientX); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={onKey}
      >
        <div className="cth-ap-slider-track" />
        {!track && <div className="cth-ap-slider-fill" style={{ width: `${pct}%` }} />}
        <motion.div
          className="cth-ap-slider-thumb"
          style={{ left: `${pct}%` }}
          animate={{ scale: dragging ? 1.18 : 1 }}
          transition={{ type: 'spring', visualDuration: 0.18, bounce: 0 }}
        />
      </div>
      <span className="cth-ap-slider-value">{format(value)}</span>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div role="radiogroup" aria-label={label} className="cth-ap-seg">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} className="cth-ap-seg-item" onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                const i = options.findIndex((x) => x.value === value);
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onChange(options[(i + 1) % options.length].value); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onChange(options[(i - 1 + options.length) % options.length].value); }
              }}
              tabIndex={on ? 0 : -1}
            >
              {on && <motion.span layoutId="seg-pill" className="cth-ap-seg-pill" transition={PILL_SPRING} />}
              <span style={{ position: 'relative' }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="cth-ap-switch" onClick={() => onChange(!checked)}>
      <motion.span className="cth-ap-switch-knob" animate={{ x: checked ? 16 : 0 }} transition={{ type: 'spring', visualDuration: 0.25, bounce: 0.15 }} />
    </button>
  );
}

// ── colour control ───────────────────────────────────────────────────────────
function ColorControl({ label, hint, value, token, onChange, preview }: {
  label: string; hint: string; value: Rgb | null; token: string; onChange: (v: Rgb | null) => void; preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shown = value ?? readTokenRgb(token);
  const [hex, setHex] = useState(toHex(shown));
  useEffect(() => { setHex(toHex(shown)); }, [shown.r, shown.g, shown.b]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (c: Rgb) => onChange(c);
  const commitHex = () => { const c = fromHex(hex); if (c) set(c); else setHex(toHex(shown)); };
  const channel = (k: 'r' | 'g' | 'b', name: string) => (
    <Slider
      key={k}
      label={name}
      value={shown[k]}
      min={0} max={255}
      onChange={(v) => set({ ...shown, [k]: v })}
      track={`linear-gradient(90deg, ${rgbCss({ ...shown, [k]: 0 })}, ${rgbCss({ ...shown, [k]: 255 })})`}
    />
  );
  const text = onColor(shown);
  return (
    <div className="cth-ap-color">
      <div className="cth-ap-color-head">
        <button type="button" className="cth-ap-swatch-btn" aria-expanded={open} aria-label={`${label}: ${toHex(shown)}. ${open ? 'Hide' : 'Show'} sliders`}
          onClick={() => setOpen((o) => !o)} style={{ background: rgbCss(shown) }} />
        <div className="cth-ap-color-text">
          <span className="cth-ap-color-name">{label}{value == null && <span className="cth-ap-muted"> · theme</span>}</span>
          <span className="cth-ap-muted">{hint}</span>
        </div>
        <input
          className="cth-ap-hex cth-input"
          aria-label={`${label} hex`}
          value={hex}
          spellCheck={false}
          onChange={(e) => setHex(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitHex(); } }}
        />
        {value != null && <TextButton onClick={() => onChange(null)} label={`Reset ${label} to theme`}>Reset</TextButton>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="cth-ap-color-body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={SHEET_SPRING}
          >
            <div style={{ paddingTop: 10, display: 'grid', gap: 8 }}>
              {channel('r', 'Red')}{channel('g', 'Green')}{channel('b', 'Blue')}
              <div className="cth-ap-presets" role="group" aria-label={`${label} presets`}>
                {PRESETS.map((c) => (
                  <button key={toHex(c)} type="button" className="cth-ap-preset" aria-label={toHex(c)} title={toHex(c)}
                    aria-pressed={value != null && toHex(value) === toHex(c)} style={{ background: rgbCss(c) }} onClick={() => set(c)} />
                ))}
              </div>
              {preview && (
                <div className="cth-ap-preview" style={{ background: rgbCss(shown), color: rgbCss(text) }}>
                  <span>Button text</span>
                  <span className="cth-ap-muted" style={{ color: 'inherit', opacity: 0.8 }}>
                    {contrast(shown, text).toFixed(1)}:1 {contrast(shown, text) >= 4.5 ? '· AA' : '· low contrast'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── fonts ────────────────────────────────────────────────────────────────────
const CAT_LABEL: Record<FontCategory, string> = { system: 'System', sans: 'Sans serif', serif: 'Serif', display: 'Display', mono: 'Monospace', pixel: 'Pixel' };

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  const listRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const cur = fontById(value) ?? FONTS[0];
  useLayoutEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-font="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);
  // Move focus into the list only when it opens (not when its exit animation starts).
  useEffect(() => { if (open) listRef.current?.focus(); }, [open]);
  const pick = (id: string) => { onChange(id); setOpen(false); btnRef.current?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    const i = FONTS.findIndex((f) => f.id === active);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(FONTS[Math.min(FONTS.length - 1, i + 1)].id); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(FONTS[Math.max(0, i - 1)].id); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(FONTS[0].id); }
    else if (e.key === 'End') { e.preventDefault(); setActive(FONTS[FONTS.length - 1].id); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
  };
  let lastCat: FontCategory | null = null;
  return (
    <div className="cth-ap-fontpick">
      <span className="cth-ap-slider-label">{label}</span>
      <button ref={btnRef} type="button" className="cth-ap-select" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
        onClick={() => { setActive(value); setOpen((o) => !o); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setActive(value); setOpen(true); } }}
        style={{ fontFamily: cur.stack }}>
        <span>{cur.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 4l2.5 2.5L7.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${listId}-${active}`}
            tabIndex={-1}
            className="cth-ap-listbox"
            onKeyDown={onKey}
            initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={SHEET_SPRING}
          >
            {FONTS.map((f: FontDef) => {
              const head = f.category !== lastCat ? CAT_LABEL[f.category] : null;
              lastCat = f.category;
              return (
                <div key={f.id}>
                  {head && <div className="cth-ap-list-head" role="presentation">{head}</div>}
                  <div
                    id={`${listId}-${f.id}`}
                    data-font={f.id}
                    role="option"
                    aria-selected={f.id === value}
                    data-active={f.id === active || undefined}
                    className="cth-ap-option"
                    style={{ fontFamily: f.stack }}
                    onPointerEnter={() => setActive(f.id)}
                    onClick={() => pick(f.id)}
                  >
                    {f.label}
                    {f.id === value && <span aria-hidden="true" className="cth-ap-check">✓</span>}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── panel ────────────────────────────────────────────────────────────────────
function ThemeChip({ p, on }: { p: PaletteInfo; on: boolean }) {
  const [ground, surface, accent] = p.swatch;
  return (
    <button type="button" role="radio" aria-checked={on} className="cth-ap-theme" onClick={() => selectPalette(p.id)} title={p.blurb}>
      <span className="cth-ap-theme-sw" style={{ background: ground }} aria-hidden="true">
        <i style={{ background: surface }} /><b style={{ background: accent }} />
      </span>
      <span>{p.name}</span>
    </button>
  );
}

export function AppearancePanel() {
  const open = useOpen();
  const a = useAppearance();
  const palette = useAppPalette();
  const imageUrl = useBackgroundImageUrl();
  const windowNow = useWindowIsTransparent();
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [armReset, setArmReset] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { if (!armReset) return; const t = setTimeout(() => setArmReset(false), 3000); return () => clearTimeout(t); }, [armReset]);
  useEffect(() => { if (open) requestAnimationFrame(() => panelRef.current?.focus()); }, [open]);

  const close = () => { closeAppearancePanel(); document.querySelector<HTMLElement>('[aria-haspopup=menu]')?.focus(); };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setImgError(null);
    try { await setBackgroundImage(f); } catch (e) { setImgError(e instanceof Error ? e.message : String(e)); }
  };
  const glassDefault = () => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cth-glass-alpha'));
    return Number.isFinite(v) ? v : 0.7;
  };
  const pairing = PAIRINGS.find((p) => p.heading === a.headingFont && p.body === a.bodyFont)?.id;
  const pending = a.windowTransparent !== windowNow;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Appearance"
          tabIndex={-1}
          className="cth-ap-panel cth-titlebar-nodrag"
          style={{ transformOrigin: 'top right' }}
          initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }}
          transition={SHEET_SPRING}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
        >
          <header className="cth-ap-header">
            <h2>Appearance</h2>
            <button type="button" className="cth-topbar-btn" aria-label="Close appearance panel" onClick={close}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </header>

          <div className="cth-ap-scroll">
            <Section title="Theme">
              <div role="radiogroup" aria-label="Theme" className="cth-ap-themes">
                {PALETTES.map((p) => <ThemeChip key={p.id} p={p} on={p.id === palette} />)}
              </div>
            </Section>

            <Section title="Colours">
              <ColorControl label="Primary" hint="Buttons, active tabs, focus" value={a.primary} token="--cth-pill-active-bg"
                onChange={(v) => updateAppearance({ primary: v })} preview />
              <ColorControl label="Secondary" hint="Outlines, tab track, highlights" value={a.secondary} token="--cth-ink-300"
                onChange={(v) => updateAppearance({ secondary: v })} />
            </Section>

            <Section title="Fonts" action={(a.headingFont !== 'system' || a.bodyFont !== 'system') ? (
              <TextButton onClick={() => updateAppearance({ headingFont: 'system', bodyFont: 'system' })}>Reset</TextButton>) : undefined}>
              <div role="radiogroup" aria-label="Font pairings" className="cth-ap-pairs">
                {PAIRINGS.map((p) => {
                  const h = fontById(p.heading)!; const b = fontById(p.body)!;
                  const on = p.id === pairing;
                  return (
                    <button key={p.id} type="button" role="radio" aria-checked={on} className="cth-ap-pair"
                      aria-label={`${p.label}: ${h.label} and ${b.label}`}
                      onClick={() => updateAppearance({ headingFont: p.heading, bodyFont: p.body })}>
                      <span className="cth-ap-pair-aa" style={{ fontFamily: h.stack, fontWeight: h.headingWeight }}>Ag</span>
                      <span className="cth-ap-pair-name" style={{ fontFamily: b.stack }}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
              <FontPicker label="Headings" value={a.headingFont} onChange={(id) => updateAppearance({ headingFont: id })} />
              <FontPicker label="Body" value={a.bodyFont} onChange={(id) => updateAppearance({ bodyFont: id })} />
            </Section>

            <Section title="Background">
              <Segmented<BackgroundKind>
                label="Background"
                value={a.background.kind}
                options={[{ value: 'theme', label: 'Theme' }, { value: 'color', label: 'Colour' }, { value: 'image', label: 'Image' }]}
                onChange={(k) => updateAppearance((s) => ({ background: { ...s.background, kind: k } }))}
              />
              {a.background.kind === 'color' && (
                <ColorControl label="Backdrop" hint="Behind the panels" value={a.background.color} token="--cth-cream-50"
                  onChange={(v) => updateAppearance((s) => ({ background: { ...s.background, color: v ?? s.background.color } }))} />
              )}
              {a.background.kind === 'image' && (
                <div className="cth-ap-image">
                  <div
                    className="cth-ap-drop"
                    data-over={dragOver || undefined}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); void onFile(e.dataTransfer.files[0]); }}
                    style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
                  >
                    {!imageUrl && <span className="cth-ap-muted">Drop an image here</span>}
                  </div>
                  <div className="cth-ap-row">
                    <button type="button" className="cth-ap-btn" onClick={() => fileRef.current?.click()}>{imageUrl ? 'Replace…' : 'Choose image…'}</button>
                    {imageUrl && <TextButton onClick={() => { void clearBackgroundImage(); }}>Remove</TextButton>}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
                  </div>
                  {imgError && <p role="alert" className="cth-ap-error">{imgError}</p>}
                  <Slider label="Dim" value={a.background.dim} min={0} max={0.8} step={0.01} disabled={!imageUrl}
                    format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateAppearance((s) => ({ background: { ...s.background, dim: v } }))} />
                  <Slider label="Blur" value={a.background.blur} min={0} max={40} disabled={!imageUrl}
                    format={(v) => `${Math.round(v)}px`} onChange={(v) => updateAppearance((s) => ({ background: { ...s.background, blur: v } }))} />
                </div>
              )}
            </Section>

            <Section title="Glass" action={a.glassOpacity != null ? <TextButton onClick={() => updateAppearance({ glassOpacity: null })}>Reset</TextButton> : undefined}>
              <Slider label="Panel opacity" value={a.glassOpacity ?? glassDefault()} min={0.25} max={1} step={0.01}
                format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateAppearance({ glassOpacity: v })} />
            </Section>

            <Section title="Window">
              <div className="cth-ap-row cth-ap-switch-row">
                <div className="cth-ap-color-text">
                  <span className="cth-ap-color-name">Transparent window</span>
                  <span className="cth-ap-muted">See your desktop through the app. Needs a compositor (Hyprland, KDE, GNOME, macOS, Windows).</span>
                </div>
                <Switch label="Transparent window" checked={a.windowTransparent} onChange={(v) => updateAppearance({ windowTransparent: v })} />
              </div>
              {pending && <p className="cth-ap-note" role="status">Restart Munder Difflin to {a.windowTransparent ? 'turn it on' : 'turn it off'}.</p>}
              <Slider label="Backdrop" value={a.windowOpacity} min={0.15} max={1} step={0.01} disabled={!windowNow}
                format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateAppearance({ windowOpacity: v })} />
            </Section>
          </div>

          <footer className="cth-ap-footer">
            <button type="button" className="cth-ap-link" data-armed={armReset || undefined}
              onClick={() => { if (armReset) { resetAppearance(); setArmReset(false); } else setArmReset(true); }}>
              {armReset ? 'Click again to reset' : 'Reset appearance'}
            </button>
            <a className="cth-ap-credit" href="https://rareui.com" onClick={(e) => { e.preventDefault(); void window.cth.openExternal('https://rareui.com'); }}>
              Motion components: Rare UI ↗
            </a>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
