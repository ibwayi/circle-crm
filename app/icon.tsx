import { ImageResponse } from "next/og"

// Next 16 App Router icon convention — replaces app/favicon.ico for
// the browser tab. ImageResponse rasterises the JSX to PNG via
// Satori at request time, so the icon stays in sync with the Logo
// component without a separate build step.
//
// Hardcoded black-on-white because Satori doesn't see the page's
// CSS variables — the favicon ignores theme. That's also what
// browsers expect (a tab icon should be legible regardless of
// what theme the page itself ends up in).

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
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="black"
            strokeWidth={1.75}
          />
          <path
            d="M13.8 7.79 A 8.5 8.5 0 1 0 13.8 24.21"
            stroke="black"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
