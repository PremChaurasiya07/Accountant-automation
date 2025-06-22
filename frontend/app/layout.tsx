import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import ChatBot from "@/components/chatbot"
import { UserProvider } from "@/hooks/context/UserContext"
import { LoadingProvider } from "@/hooks/context/loading-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Modern Dashboard",
  description: "A modern, responsive dashboard application",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LoadingProvider>
        <UserProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
          <ChatBot />
        </ThemeProvider>
        </UserProvider>
        </LoadingProvider>
        
      </body>
    </html>
  )
}
