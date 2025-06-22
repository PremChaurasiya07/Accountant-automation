"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { DashboardContent } from "@/components/dashboard-content"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      // 🔁 1. Check for access_token in URL hash
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(hash)
      const access_token = params.get("access_token")
      const refresh_token = params.get("refresh_token")

      if (access_token && refresh_token) {
        // 🪄 2. Set Supabase session
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) {
          console.error("Failed to set session:", error.message)
        }
        // 🧹 3. Remove token hash from URL
        window.history.replaceState(null, "", window.location.pathname)
      }

      // 👤 4. Try fetching user
      const { data, error: getUserError } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
      } else {
        console.warn("User not found", getUserError)
        setUser(null)
      }

      setLoading(false)
    }

    initAuth()
  }, [router])

  if (loading) return <div className="text-center mt-10">Loading...</div>

  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
