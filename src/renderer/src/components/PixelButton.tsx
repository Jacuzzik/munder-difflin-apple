import { CSSProperties, ReactNode, useState } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface PixelButtonProps {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
  title?: string;
}

const heightBySize: Record<Size, number> = { sm: 24, md: 32, lg: 40 };
const padBySize: Record<Size, string> = { sm: '0 8px', md: '0 12px', lg: '0 16px' };

export function PixelButton({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  fullWidth = false,
  style,
  title
}: PixelButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);

  // DISABLED TEXT IS ITS OWN COLOR, not the variant's.
  //
  // Every variant swaps its FILL to `--cth-cream-300` when disabled, but the
  // variants used to keep their enabled text token — and `primary`'s is
  // `--cth-cream-50`, the INVERSE foreground picked to sit on an ink-900 button.
  // On the cream-300 disabled fill that pairing collapses: in dark mode it is
  // #1A191E text on #37363E (~1.4:1, effectively invisible), and in light mode a
  // near-white #FFFDF5 on tan, which is barely better. That is why a disabled
  // Send or Dispatch reads as an empty box.
  //
  // `--cth-ink-500` is the one foreground that works against cream-300 in BOTH
  // themes, because both tokens flip together — and a muted label is what a
  // disabled control should look like anyway.
  const disabledText = 'var(--cth-ink-500)';

  // v0.5: fills ride the chrome tokens. `primary` is the palette's accent (ink
  // in Original — the same #1A1320 fill as before — orange in Ember, magenta
  // in Violet); `secondary` is a raised surface with a hairline.
  const palette = (() => {
    switch (variant) {
      case 'primary':
        return {
          // v0.5.1: the filled pill — the same colour as the active nav pill.
          fill:    disabled ? 'var(--cth-cream-300)'
                   : (hover ? 'color-mix(in srgb, var(--cth-pill-active-bg) 88%, var(--cth-ink-500))' : 'var(--cth-pill-active-bg)'),
          text:    disabled ? disabledText : 'var(--cth-pill-active-fg)',
          border:  'transparent',
          shadow:  'var(--cth-shadow-sm)'
        };
      case 'secondary':
        return {
          // v0.5.1: an OUTLINED pill (reference: the stroked option pills).
          fill:    disabled ? 'var(--cth-cream-300)' : (hover ? 'var(--cth-hover)' : 'transparent'),
          text:    disabled ? disabledText : 'var(--cth-ink-900)',
          // --cth-outline is the Appearance panel's secondary colour; unset, the
          // element's own ink-300 is used (so inverted cards still work).
          border:  'var(--cth-outline, var(--cth-ink-300))',
          shadow:  'none'
        };
      case 'ghost':
        return {
          fill:    hover && !disabled ? 'var(--cth-hover)' : 'transparent',
          text:    disabled ? disabledText : 'var(--cth-ink-700)',
          border:  'transparent',
          shadow:  'none'
        };
      case 'destructive':
        return {
          fill:    disabled ? 'var(--cth-cream-300)' : (hover ? 'color-mix(in srgb, var(--cth-coral) 85%, var(--cth-cream-50))' : 'var(--cth-coral)'),
          text:    disabled ? disabledText : 'var(--cth-on-accent)',
          border:  'transparent',
          shadow:  'var(--cth-shadow-sm)'
        };
    }
  })();

  return (
    <button
      title={title}
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => { setPressed(false); setHover(false); }}
      onMouseEnter={() => setHover(true)}
      disabled={disabled}
      style={{
        // Centre content HERE rather than trusting each call site.
        //
        // A <button> with a fixed height centres bare text on its own, but a
        // child that is itself `inline-flex` (which every icon+label call site
        // uses, to sit the glyph beside the word) aligns on ITS baseline
        // instead. So a row of buttons where some labels were wrapped and some
        // were bare text — `edit` beside `IDE` and `terminal` — sat at visibly
        // different heights. Fixing it per call site fixes today's row and not
        // the next one someone writes.
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Matches the gap the wrapped call sites already use, so an icon can be
        // dropped in beside a label with no wrapper at all.
        gap: 4,
        // Kill descender-driven drift: with the height fixed above, an inherited
        // line-height only moves the text off centre.
        lineHeight: 1,
        // A button never shrinks below its own label. The default flex-shrink is
        // 1, and with `whiteSpace: nowrap` below, a squeezed button keeps drawing
        // its full-width text out of a narrowed box — so in a tight row the
        // labels paint straight over whatever sits to their left. That is not a
        // clipped button, it is two controls on top of each other.
        flexShrink: 0,
        height: heightBySize[size],
        padding: padBySize[size],
        background: palette.fill,
        color: palette.text,
        border: 'none',
        // v0.5: hairline + soft lift at rest; on press the lift drops and the
        // button settles (scale) on pointer-DOWN, so feedback is immediate.
        borderRadius: 'var(--cth-radius-pill)',
        boxShadow: pressed && !disabled || palette.shadow === 'none'
          ? `inset 0 0 0 1px ${palette.border}`
          : `inset 0 0 0 1px ${palette.border}, ${palette.shadow}`,
        transform: pressed && !disabled ? 'scale(0.97)' : 'none',
        fontWeight: 500,
        fontFamily: 'var(--cth-font-ui)',
        fontSize: size === 'lg' ? 'var(--cth-text-body-md)' : 'var(--cth-text-body-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : 'auto',
        userSelect: 'none',
        // Height is fixed by the size variant above, so a label that wraps does
        // not make the button taller — the extra line simply prints through the
        // bottom border. Every label here is a short phrase ("Check for updates",
        // "reset & start over"), so wrapping is always a layout bug rather than a
        // wanted behaviour. Callers that genuinely want a multi-line button can
        // still override, since `style` spreads after this.
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {children}
    </button>
  );
}
