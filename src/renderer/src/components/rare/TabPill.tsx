/**
 * The sliding active-tab pill. One element per tab strip that springs from the
 * old tab to the new one (shared layoutId), in the spirit of Rare UI's Gooey
 * Nav / Bounce Sidebar indicators — written here from scratch, no Rare UI code.
 *
 * It sits BEHIND every tab's label (z-index -1 inside the isolated tablist), so
 * text is never covered while it travels. Reduced motion → it just appears
 * (MotionConfig reducedMotion="user" at the root).
 */
import { motion } from 'motion/react';

export const TAB_SPRING = { type: 'spring', visualDuration: 0.38, bounce: 0.15 } as const;

export function TabPill() {
  return <motion.span layoutId="cth-tab-pill" className="cth-tab-pill" transition={TAB_SPRING} aria-hidden="true" />;
}
