/**
 * The painted background behind the app: theme gradient, a colour, or the
 * user's image (design/appearance.ts sets the variables). Purely decorative —
 * pointer-events none, aria-hidden, never above content.
 *
 * `contained` is for full-window overlays (focus mode) that must stay opaque
 * over the app beneath them even when the window itself is transparent.
 */
export function Backdrop({ contained = false }: { contained?: boolean }) {
  return (
    <div className={contained ? 'cth-backdrop cth-backdrop--contained' : 'cth-backdrop'} aria-hidden="true">
      <div className="cth-backdrop__paint" />
      <div className="cth-backdrop__dim" />
    </div>
  );
}
