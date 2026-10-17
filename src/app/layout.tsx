import type { Metadata } from "next"
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
})

export const metadata: Metadata = {
  title: "GesturePass — Sign in with your hands",
  description: "A password made of six hand gestures and your face. No keyboard required.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤟</text></svg>",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} font-sans`}
      >
        {children}
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  )
}