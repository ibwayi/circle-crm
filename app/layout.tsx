import type { Metadata, Viewport } from "next"
import { Questrial } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/shared/theme-provider"
import "./globals.css"

// Questrial only ships weight 400. We rely on size + tracking for hierarchy
// rather than swapping to a heavier display font.
const questrial = Questrial({
  variable: "--font-questrial",
  weight: "400",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Circle",
  description: "A clean, Monday-inspired CRM.",
}

// Next 14+ moved themeColor and viewport-meta options out of `metadata` and
// into the `viewport` export. The colors mirror our --background tokens so
// the mobile status bar tint matches each theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#212121" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${questrial.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
