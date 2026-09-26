/**
 * Animated Counter — ported from Rare UI (https://rareui.com)
 * Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution;
 * see ./LICENSE-RAREUI.txt. Not covered by this project's MIT license.
 *
 * Changes from the original: Tailwind → inline styles; React 18 (Digit/Mark are
 * forwardRef components — popLayout measures leaving columns through the ref,
 * and React 18 does not pass `ref` as a prop); the screen-reader copy uses the
 * app's .cth-sr-only. The odometer maths is unchanged.
 *
 * Each digit is a wheel that spins to its new face; places that appear or
 * vanish fade and the row reflows with a spring. Reduced motion → instant.
 */
import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform, type Transition } from 'motion/react';

const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const WHEEL = [...FACES, 0];
const LINE = 1.5;
const FADE = `linear-gradient(to bottom,
  rgba(0,0,0,0) 0%, rgba(0,0,0,0.06) 5.5%, rgba(0,0,0,0.5) 11%, rgba(0,0,0,0.94) 16.5%,
  #000 22%, #000 78%,
  rgba(0,0,0,0.94) 83.5%, rgba(0,0,0,0.5) 89%, rgba(0,0,0,0.06) 94.5%, rgba(0,0,0,0) 100%)`;
const EASE = [0.22, 1, 0.36, 1] as const;
const BOUNCE = 0.18;
const LEAVE = { duration: 0.18, ease: EASE } as const;
const INSTANT = { duration: 0 } as const;
const spring = (duration: number): Transition => ({ type: 'spring', visualDuration: duration, bounce: BOUNCE });
const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
const isDigit = (c: string) => c >= '0' && c <= '9';

const SIZER = FACES.map((f) => (
  <span key={f} aria-hidden style={{ visibility: 'hidden', gridArea: '1 / 1' }}>{f}</span>
));
const STACK = WHEEL.map((f, i) => (
  <span key={i} style={{ height: `${LINE}em`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f}</span>
));

type Cell = { kind: 'digit'; key: number; digit: number } | { kind: 'mark'; key: string; char: string };
function toCells(chars: string, width: number): Cell[] {
  const cells: Cell[] = []; let seen = 0; let run = 0;
  for (const c of chars) {
    if (isDigit(c)) { run = 0; cells.push({ kind: 'digit', key: width - seen++, digit: Number(c) }); }
    else cells.push({ kind: 'mark', key: `mark-${width - seen}-${run++}`, char: c });
  }
  return cells;
}

function useWheel(from: number, digit: number, dir: number, duration: number, reduced: boolean) {
  const pos = useMotionValue(from);
  const goal = useRef(from);
  const heading = useRef(dir);
  useEffect(() => { heading.current = dir; }, [dir]);
  useEffect(() => {
    if (reduced) { goal.current = digit; pos.set(digit); return; }
    if (mod(goal.current, 10) !== digit) {
      const at = pos.get();
      goal.current = heading.current < 0 ? at - mod(at - digit, 10) : at + mod(digit - at, 10);
    }
    const roll = animate(pos, goal.current, spring(duration));
    return () => roll.stop();
  }, [digit, duration, reduced, pos]);
  return useTransform(pos, (p) => `${(-mod(p, 10) * 100) / WHEEL.length}%`);
}

type SlotProps = { reduced: boolean; dep: number; shift: Transition };
const shifts = ({ reduced, dep, shift }: SlotProps) => ({ layout: !reduced, layoutDependency: dep, transition: shift });
const fades = (reduced: boolean) => ({
  initial: { opacity: 0 }, animate: { opacity: 1 },
  exit: { opacity: 0, transition: reduced ? INSTANT : LEAVE }
});

const Mark = forwardRef<HTMLSpanElement, SlotProps & { char: string }>(function Mark({ char, ...slot }, ref) {
  return <motion.span ref={ref} {...shifts(slot)} {...fades(slot.reduced)} style={{ display: 'inline-block' }}>{char}</motion.span>;
});

const Digit = memo(forwardRef<HTMLSpanElement, SlotProps & { digit: number; from: number; dir: number; duration: number }>(
  function Digit({ digit, from, dir, duration, ...slot }, ref) {
    const y = useWheel(from, digit, dir, duration, slot.reduced);
    return (
      <motion.span
        ref={ref}
        {...shifts(slot)}
        {...fades(slot.reduced)}
        style={{
          position: 'relative', display: 'inline-grid', overflow: 'hidden',
          height: `${LINE}em`, lineHeight: LINE, maskImage: FADE, WebkitMaskImage: FADE
        }}
      >
        {SIZER}
        <motion.span style={{ y, position: 'absolute', left: 0, right: 0, top: 0 }}>{STACK}</motion.span>
      </motion.span>
    );
  }
));

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  /** Line box of the digits; the app's rows are tight, so default a touch under the original. */
  style?: React.CSSProperties;
}

export function AnimatedCounter({ value, duration = 0.6, style }: AnimatedCounterProps) {
  const reduced = useReducedMotion() ?? false;
  const amount = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const chars = String(Math.min(amount, Number.MAX_SAFE_INTEGER));
  const width = chars.length;
  const cells = toCells(chars, width);
  const [previous, setPrevious] = useState(amount);
  const [dir, setDir] = useState(1);
  if (previous !== amount) { setDir(amount >= previous ? 1 : -1); setPrevious(amount); }
  const [seed] = useState(() => {
    const faces: Record<number, number> = {};
    for (const c of cells) if (c.kind === 'digit') faces[c.key] = c.digit;
    return faces;
  });
  const pace = clamp(duration, 0.01, 60);
  const shift = useMemo<Transition>(() => (reduced ? INSTANT : spring(pace)), [reduced, pace]);
  const slot: SlotProps = { reduced, dep: chars.length, shift };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums', verticalAlign: 'bottom', ...style }}>
      <span className="cth-sr-only">{chars}</span>
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', userSelect: 'none' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {cells.map((c) =>
            c.kind === 'digit'
              ? <Digit key={c.key} {...slot} digit={c.digit} from={seed[c.key] ?? 0} dir={dir} duration={pace} />
              : <Mark key={c.key} {...slot} char={c.char} />
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}

/** Render a translated count string ("{{count}} tasks", any word order, any
 *  plural form) with only the number swapped for the rolling counter. */
export function CountText({ text, count }: { text: string; count: number }) {
  const n = String(count);
  const i = text.indexOf(n);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<AnimatedCounter value={count} />{text.slice(i + n.length)}</>;
}

