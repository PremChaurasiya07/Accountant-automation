"use client"

import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import ChatBot from "@/components/chatbot"
import { UserProvider } from "@/hooks/context/UserContext"
import { LoadingProvider } from "@/hooks/context/loading-context"
import { Analytics } from "@vercel/analytics/next"

export default function RootClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showChatBot = pathname !== "/login"

  return (
    <LoadingProvider>
      <UserProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          {/* <Analytics /> */}
          <Toaster />
          {/* {showChatBot && <ChatBot />} */}
        </ThemeProvider>
      </UserProvider>
    </LoadingProvider>
  )
}
