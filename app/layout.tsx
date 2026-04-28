import type { Metadata } from "next"
import { Questrial } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/shared/theme-provider"
import "./globals.css"

// Questrial only ships weight 400. We rely on size + tracking for hierarchy
// rather than swapping to a heavier display font — see CONCEPT.md typography.
const questrial = Questrial({
  variable: "--font-questrial",
  weight: "400",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Circle",
  description: "A clean, Monday-inspired CRM.",
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
