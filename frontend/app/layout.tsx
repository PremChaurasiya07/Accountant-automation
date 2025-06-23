"use client"

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import ChatBot from "@/components/chatbot"
import { UserProvider } from "@/hooks/context/UserContext"
import { LoadingProvider } from "@/hooks/context/loading-context"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Vyapari",
  description: "Business tool at your hand",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showChatBot = pathname !== "/login" // ⛔ Hide ChatBot on login

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LoadingProvider>
          <UserProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              {children}
              <Analytics />
              <Toaster />
              {showChatBot && <ChatBot />}
            </ThemeProvider>
          </UserProvider>
        </LoadingProvider>
      </body>
    </html>
  )
}
