import { CSSProperties, ReactNode } from 'react';
import { AccentColorName } from '@/design/tokens';

type Variant = 'default' | 'inset' | 'active' | 'terminal' | 'dialog';

export interface PixelPanelProps {
  variant?: Variant;
  title?: string;
  accent?: AccentColorName;
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  noPadding?: boolean;
}

const borderByVariant: Record<Variant, string> = {
  default:  'var(--cth-panel-border)',
  inset:    'var(--cth-panel-border-inset)',
  active:   'var(--cth-panel-border)',  // accent overlay added separately
  terminal: 'var(--cth-panel-border-terminal)',
  dialog:   'var(--cth-panel-border-dialog)'
};

/** v0.5 corner radius by hierarchy: dialogs read as sheets, insets as wells. */
const radiusByVariant: Record<Variant, string> = {
  default:  'var(--cth-radius-lg)',
  inset:    'var(--cth-radius-md)',
  active:   'var(--cth-radius-lg)',
  terminal: 'var(--cth-radius-md)',
  dialog:   'var(--cth-radius-lg)'
};

const fillByVariant: Record<Variant, string> = {
  default:  'var(--cth-cream-100)',
  inset:    'var(--cth-cream-200)',
  active:   'var(--cth-cream-100)',
  terminal: 'var(--cth-paper-100)',
  dialog:   'var(--cth-cream-50)'
};

export function PixelPanel({
  variant = 'default',
  title,
  accent,
  children,
  style,
  className,
  noPadding = false
}: PixelPanelProps) {
  const baseStyle: CSSProperties = {
    background: fillByVariant[variant],
    boxShadow: borderByVariant[variant],
    padding: noPadding ? 0 : 'var(--cth-space-3)',
    position: 'relative',
    borderRadius: radiusByVariant[variant],
    // Clip the title strip and children to the rounded corner.
    overflow: title ? 'hidden' : undefined,
    ...style
  };

  // Active variant: the agent's accent as a crisp ring plus a soft halo
  // (v0.5; was a 5px three-layer SNES frame). Same meaning, same accent token.
  if (variant === 'active' && accent) {
    baseStyle.boxShadow = `
      inset 0 0 0 1.5px var(--cth-${accent}),
      0 0 0 3px color-mix(in srgb, var(--cth-${accent}) 22%, transparent),
      var(--cth-shadow-sm)`;
  }

  return (
    <div className={className} style={baseStyle}>
      {title && (
        <div
          style={{
            margin: noPadding ? 0 : '-12px -12px 12px',
            padding: '6px 12px 4px',
            // A tint of the accent, not a slab of it: identity without glare.
            background: accent
              ? `color-mix(in srgb, var(--cth-${accent}) 20%, var(--cth-cream-100))`
              : 'var(--cth-cream-200)',
            color: 'var(--cth-ink-900)',
            fontFamily: 'var(--cth-font-display)',
            fontSize: 'var(--cth-text-display-md)',
            lineHeight: 'var(--cth-lh-display-md)',
            boxShadow: 'inset 0 -1px 0 var(--cth-ink-100)'
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
