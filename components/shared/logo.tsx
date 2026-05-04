import { cn } from "@/lib/utils"

/**
 * Circle's wordmark glyph: a sans-serif "C" inscribed in a thin
 * outer ring. Both strokes use `currentColor` so the logo inherits
 * its colour from the parent — black on light, white on dark, no
 * theme-aware variants needed.
 *
 * Geometry on a 32-unit viewBox:
 *   * Outer ring: cx=16, cy=16, r=14, stroke-width=1.75 — leaves
 *     0.875 units of breathing room outside the C arc.
 *   * Inner C: an arc from 105° to 255° around the same centre at
 *     r=8.5, stroke-width=3, round caps. The 150° sweep gives a
 *     comfortable mouth (≈ 6.6 units wide) without looking like an
 *     open semicircle.
 *
 * Why arc-as-path, not a glyph: keeps the file dependency-free (no
 * font load required), and the stroke weight is independent of the
 * outer ring, which lets us read the C as the foreground element
 * even at favicon size.
 */
export function Logo({
  className,
  size = 32,
  strokeWidth = 1.75,
  cStrokeWidth = 3,
}: {
  className?: string
  size?: number
  strokeWidth?: number
  cStrokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      role="img"
      aria-label="Circle"
    >
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      {/* C arc — start at angle 105° (upper-left), sweep CCW through
          the left side to 255° (lower-left). Endpoints derived from
          x = 16 + 8.5·cos θ, y = 16 − 8.5·sin θ (SVG y-axis flipped).
          150° sweep → ≈ 6.6-unit mouth on the right. */}
      <path
        d="M13.8 7.79 A 8.5 8.5 0 1 0 13.8 24.21"
        stroke="currentColor"
        strokeWidth={cStrokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
