"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { DashboardContent } from "@/components/dashboard-content"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ui/protected-route"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
          router.push("/landing")
          return
        }

        window.history.replaceState({}, document.title, "/")
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.error("❌ User not found or error:", error?.message)
        router.push("/landing")
      } else {
        console.log("✅ Logged in as:", user.email)
        setUser(user)
      }

      setLoading(false)
    }

    handleOAuthRedirect()
  }, [router])

  if (loading) {
    return <div className="text-center mt-10">Signing you in...</div>
  }
  return (
    <ProtectedRoute>
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
    </ProtectedRoute>
  )
}
