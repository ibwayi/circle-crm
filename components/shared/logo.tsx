import { cn } from "@/lib/utils"

/**
 * Circle's wordmark glyph: a sans-serif "C" with a small filled
 * circle ("dot") sitting in its mouth — visual wordplay for the name.
 * Both shapes use `currentColor` so the logo inherits its colour
 * from the parent (black on light, white on dark, no theme-aware
 * variants needed).
 *
 * Geometry on a 32-unit viewBox:
 *   * C arc: r=8.5 around (16, 16). Endpoints at (22, 10) and
 *     (22, 22) — both on the right side of the circle, ~45° above /
 *     below the horizontal-right radius. The arc traces the long way
 *     around (large-arc-flag=1), making a 270° sweep that opens to
 *     the right with a ~12-unit-tall mouth.
 *   * Dot: filled circle at (24, 16), r=3. Sits visually centred
 *     between the two arc tips, slightly OUTSIDE the C's right edge
 *     so it reads as "the missing piece of the circle" rather than
 *     a separate inner element.
 *   * Phase 27 had an outer ring (r=14) that completed the negative
 *     space; the dot now plays that role with more intent.
 *
 * Stroke 3 with round caps gives the C enough weight to balance the
 * filled dot at favicon scale (16-20px). Below that the dot may
 * become a smudge — kept r=3 (not 2.5) for that reason.
 */
export function Logo({
  className,
  size = 32,
  strokeWidth = 3,
}: {
  className?: string
  size?: number
  strokeWidth?: number
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
      <path
        d="M22 10 A 8.5 8.5 0 1 0 22 22"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="24" cy="16" r="3" fill="currentColor" />
    </svg>
  )
}
