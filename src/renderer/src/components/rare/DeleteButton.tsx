/**
 * Delete Button — ported from Rare UI (https://rareui.com)
 * Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution;
 * see ./LICENSE-RAREUI.txt. Not covered by this project's MIT license.
 *
 * Changes from the original: Tailwind → this app's theme tokens (coral for the
 * destructive glyph, the palette's surfaces for the tile/tray); a compact size
 * that sits in a 24px header row; labels passed in (i18n); `title` carries the
 * full consequence sentence so nothing the old confirm() dialog said is lost.
 *
 * Behaviour: click the bin → the lid swings open and a tray slides out with
 * confirm (✓) and cancel (✕). Escape cancels. Focus returns to the bin. The
 * action runs only on an explicit confirm — same safety as the old dialog,
 * without the OS popup.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  animate, AnimatePresence, motion, useMotionTemplate, useMotionValue,
  useReducedMotion, useTransform, type Transition
} from 'motion/react';

const HINGE = '3px 6px';
const LID_OPEN = -35;
const WALL_TOP = 6;
const WALL_TOP_OPEN = 13.5;
const WALL_BASE = 20;

const TILE = 26;
const PANEL = 56;
const HOLD = { deleted: 1400, kept: 600 };

const EASE = [0.32, 0.72, 0, 1] as const;
const EASE_LID = [0.34, 1.1, 0.64, 1] as const;
const WIDTH = { duration: 0.62, ease: EASE } as const;
const LID = { duration: 0.6, ease: EASE_LID } as const;
const WALL = { duration: 0.56, ease: EASE } as const;
const IN = { duration: 0.44, ease: EASE, delay: 0.14 } as const;
const OUT = { duration: 0.3, ease: EASE } as const;
const TAP = { duration: 0.2, ease: EASE } as const;
const SWAP = { duration: 0.22, ease: EASE } as const;
const SETTLE = { duration: 0.45, ease: EASE } as const;
const PRESS = { type: 'spring', stiffness: 520, damping: 18, mass: 0.5 } as const;
const INSTANT = { duration: 0 } as const;

const ACCENT = 'var(--cth-coral)';
const SURFACE = 'color-mix(in srgb, var(--cth-coral) 16%, var(--cth-paper-100))';
const RECESS = 'var(--cth-paper-100)';

const ICON = { viewBox: '0 0 24 24', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

const panelMotion = {
  hidden: { opacity: 0, x: -6, transition: OUT },
  shown: { opacity: 1, x: 0, transition: { ...IN, staggerChildren: 0.07 } }
};
const circleMotion = {
  hidden: { opacity: 0, scale: 0.9, transition: OUT },
  shown: { opacity: 1, scale: 1, transition: IN }
};

function Circle({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div style={{ display: 'flex' }} variants={reduced ? undefined : circleMotion}>
      <motion.button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        whileHover={reduced ? undefined : { scale: 1.06 }}
        whileTap={reduced ? undefined : { scale: 0.84 }}
        transition={PRESS}
        style={{
          display: 'grid', placeItems: 'center', width: 20, height: 20, padding: 0,
          border: 'none', borderRadius: 999, cursor: 'pointer',
          background: 'var(--cth-cream-50)', color: 'var(--cth-ink-700)',
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.12)'
        }}
      >
        <svg {...ICON} width="11" height="11" stroke="currentColor" strokeWidth="3.5">{children}</svg>
      </motion.button>
    </motion.div>
  );
}

type Status = 'idle' | 'deleted' | 'kept';

export interface DeleteButtonProps {
  /** Accessible name of the trigger, e.g. "Close Jim". */
  label: string;
  /** Full consequence sentence (tooltip + description). */
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function DeleteButton({ label, description, confirmLabel, cancelLabel, onConfirm, onCancel }: DeleteButtonProps) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const trigger = useRef<HTMLButtonElement>(null);
  const timing = (t: Transition) => (reduced ? INSTANT : t);

  const top = useMotionValue(WALL_TOP);
  const wall = useTransform(top, (y) => WALL_BASE - y);
  const bin = useMotionTemplate`M19 ${top}v${wall}a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V${top}`;
  const settle = useMotionValue(1);

  useEffect(() => {
    const walls = animate(top, open ? WALL_TOP_OPEN : WALL_TOP, reduced ? INSTANT : WALL);
    return () => walls.stop();
  }, [open, reduced, top]);

  useEffect(() => {
    if (status === 'idle') return;
    const nudge = status === 'kept' && !reduced ? animate(settle, [1, 0.86, 1], SETTLE) : null;
    const done = setTimeout(() => setStatus('idle'), HOLD[status]);
    return () => { nudge?.stop(); clearTimeout(done); };
  }, [status, reduced, settle]);

  const resolve = (next: Exclude<Status, 'idle'>) => {
    setOpen(false);
    setStatus(next);
    trigger.current?.focus();
    (next === 'deleted' ? onConfirm : onCancel)?.();
  };

  return (
    <motion.div
      data-state={open ? 'open' : 'closed'}
      data-status={status}
      className="cth-titlebar-nodrag"
      style={{ position: 'relative', height: TILE, borderRadius: 999, flexShrink: 0, background: SURFACE, color: ACCENT }}
      initial={false}
      animate={{ width: open ? TILE + PANEL : TILE }}
      transition={timing(WIDTH)}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); resolve('kept'); } }}
    >
      <motion.button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-description={description}
        title={description ?? label}
        aria-expanded={open}
        onClick={() => {
          if (open) return resolve('kept');
          setStatus('idle');
          setOpen(true);
        }}
        whileTap={reduced ? undefined : { scale: 0.92 }}
        transition={TAP}
        style={{
          position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center',
          width: TILE, height: TILE, padding: 0, border: 'none', borderRadius: 999,
          background: 'transparent', color: 'inherit', cursor: 'pointer'
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === 'deleted' ? (
            <motion.svg key="done" {...ICON} width="15" height="15" stroke={ACCENT} strokeWidth="2.5"
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
              transition={timing(SWAP)}>
              <motion.path d="M4 12.5 9.5 18 20 7"
                initial={reduced ? undefined : { pathLength: 0 }} animate={reduced ? undefined : { pathLength: 1 }}
                transition={SETTLE} />
            </motion.svg>
          ) : (
            <motion.svg key="bin" {...ICON} width="15" height="15" stroke="currentColor" strokeWidth="2"
              style={{ overflow: 'visible', scale: settle }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={timing(SWAP)}>
              <motion.path d={bin} />
              <motion.g style={{ transformBox: 'view-box', transformOrigin: HINGE }}
                animate={{ rotate: open ? LID_OPEN : 0 }} transition={timing(LID)}>
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </motion.g>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      <span role="status" aria-live="polite" className="cth-sr-only">
        {status === 'deleted' ? confirmLabel : status === 'kept' ? cancelLabel : ''}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            style={{
              position: 'absolute', top: 0, bottom: 0, right: 0, width: PANEL,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 999, background: RECESS
            }}
            variants={reduced ? undefined : panelMotion}
            initial="hidden" animate="shown" exit="hidden"
          >
            <Circle label={confirmLabel} onClick={() => resolve('deleted')}>
              <path d="M4 12.5 9.5 18 20 7" stroke={ACCENT} />
            </Circle>
            <Circle label={cancelLabel} onClick={() => resolve('kept')}>
              <path d="M6 6 18 18M18 6 6 18" />
            </Circle>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
