import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import RootClient from './root-client' // 👈 client layout

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Vyapari",
  description: "Business tool at your hand",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  )
}
