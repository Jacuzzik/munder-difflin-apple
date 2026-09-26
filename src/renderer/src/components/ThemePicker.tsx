/**
 * Top-bar theme picker (v0.5). Replaces the old sun/moon toggle as the one
 * app-wide appearance control; the toggle's side effects (DEC 2031 notify to
 * running TUIs, config.terminalTheme for new spawns) are preserved via
 * design/themeActions.ts and fire only when the BASE MODE actually changes.
 *
 * Presentation only: selecting a palette swaps two attributes on <html>. No
 * store, agent, terminal, task or scene state is read or written.
 *
 * Accessibility: trigger is a menu button (aria-haspopup/expanded); options are
 * menuitemradio with aria-checked. Arrow keys / Home / End move, Enter/Space
 * select, Esc or a click outside closes, and focus returns to the trigger.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { PALETTES, paletteInfo, useAppPalette, type AppPalette, type PaletteInfo } from '@/design/theme';
import { selectPalette } from '@/design/themeActions';
import { openAppearancePanel } from './AppearancePanel';

export function ThemePicker() {
  const current = useAppPalette();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  // Outside click / window blur closes. Capture phase so the floor canvas or a
  // terminal swallowing the event cannot leave the menu stranded open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    const onBlur = () => close(false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [open, close]);

  // On open, focus the checked item.
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, PALETTES.findIndex((p) => p.id === current));
    itemRefs.current[idx]?.focus();
    // current intentionally omitted: only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (id: AppPalette) => {
    selectPalette(id);
    close(true);
  };

  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    switch (e.key) {
      case 'ArrowDown': move(i + 1); break;
      case 'ArrowUp': move(i - 1); break;
      case 'Home': move(0); break;
      case 'End': move(items.length - 1); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(true); break;
      case 'Tab': close(false); break;
    }
  };

  const info = paletteInfo(current);

  return (
    <div ref={rootRef} className="cth-titlebar-nodrag" style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className="cth-topbar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${info.name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); }
        }}
      >
        <Swatch p={info} small />
        <span>{info.name}</span>
        <Chevron />
      </button>

      {open && (
        <div
          className="cth-popover"
          role="menu"
          aria-label="Theme"
          onKeyDown={onMenuKey}
        >
          <div className="cth-popover-title" aria-hidden="true">Appearance</div>
          {PALETTES.map((p, i) => {
            const checked = p.id === current;
            return (
              <button
                key={p.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                className="cth-theme-option"
                onClick={() => choose(p.id)}
              >
                <Swatch p={p} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span className="cth-theme-option-name">{p.name}</span>
                  <span className="cth-theme-option-blurb">{p.blurb}</span>
                </span>
                <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', justifyContent: 'center', color: 'var(--cth-accent)' }}>
                  {checked && <Check />}
                </span>
              </button>
            );
          })}
          <div className="cth-popover-sep" role="separator" />
          <button
            ref={(el) => { itemRefs.current[PALETTES.length] = el; }}
            type="button"
            role="menuitem"
            className="cth-theme-option"
            onClick={() => { setOpen(false); openAppearancePanel(); }}
          >
            <span aria-hidden="true" className="cth-customize-glyph">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 4.5h6M12 4.5h1M3 11.5h1M7 11.5h6" /><circle cx="10.5" cy="4.5" r="1.5" /><circle cx="5.5" cy="11.5" r="1.5" />
              </svg>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span className="cth-theme-option-name">Customize…</span>
              <span className="cth-theme-option-blurb">Colours, fonts, background, transparency</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/** A miniature of the palette: ground, a raised surface card, an accent dot.
 *  Literal colours on purpose — every swatch must show ITS palette, not the
 *  active one. */
function Swatch({ p, small }: { p: PaletteInfo; small?: boolean }) {
  const [ground, surface, accent] = p.swatch;
  return (
    <span className={small ? 'cth-swatch cth-swatch-sm' : 'cth-swatch'} aria-hidden="true" style={{ background: ground }}>
      <i style={{ left: '38%', top: '22%', right: '-10%', bottom: '-10%', background: surface, borderRadius: small ? 2 : 3 }} />
      <i style={{
        left: small ? 3 : 5, top: small ? 3 : 5,
        width: small ? 5 : 8, height: small ? 5 : 8,
        borderRadius: '50%', background: accent
      }} />
    </span>
  );
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ opacity: 0.6 }}>
      <path d="M2.5 4l2.5 2.5L7.5 4" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 7.4l2.6 2.6L11 4.4" />
    </svg>
  );
}
