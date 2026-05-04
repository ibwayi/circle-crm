import { ImageResponse } from "next/og"

// Next 16 App Router icon convention — replaces the placeholder
// favicon for the browser tab. ImageResponse rasterises the JSX to
// PNG via Satori at request time, so the icon stays in sync with the
// Logo component without a separate build step.
//
// Hardcoded black-on-white because Satori doesn't see the page's
// CSS variables — the favicon ignores theme. That's also what
// browsers expect (a tab icon should be legible regardless of the
// page's theme).

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "white",
        }}
      >
        <svg
          width={28}
          height={28}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22 10 A 8.5 8.5 0 1 0 22 22"
            stroke="black"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="16" r="3" fill="black" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
