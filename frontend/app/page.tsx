"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { DashboardContent } from "@/components/dashboard-content"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { AuthLoadingScreen } from "@/components/ui/modern_loader"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const wakeUpServer = async () => {
    try {
      console.log("Ping sent to wake up the server in the background...");
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ping`, {
        method: 'GET',
      });
      console.log("Server has received the ping.");
    } catch (error) {
      console.error("Background server ping failed:", error);
    }
  };

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const access_token = params.get("access_token")
      const refresh_token = params.get("refresh_token")

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })

        if (error) {
          console.error("❌ Error setting session:", error.message)
          router.push("/login")
          return
        }
        
        window.history.replaceState({}, document.title, "/")
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        setLoading(false); // Stop loading even if there's an error
        console.error("❌ User not found or error:", error?.message)
        router.push("/login")
      } else {
        console.log("✅ Logged in as:", user.email)
        setUser(user)
        
        // ** THE FIX IS HERE **
        // Stop loading and show the UI IMMEDIATELY
        setLoading(false);
        
        // Now, start the server wake-up call in the background
        wakeUpServer(); 
      }
    }

    handleOAuthRedirect()
  }, [router])

  // This loading screen will now only show during the Supabase auth check
  if (loading) {
    return <AuthLoadingScreen />
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  )
}