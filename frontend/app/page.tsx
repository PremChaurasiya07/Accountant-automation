"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardContent } from "@/components/dashboard-content"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initAuth = async () => {
      // Step 1: Handle OAuth redirect hash
      const hash = window.location.hash
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get("access_token")
        const refresh_token = params.get("refresh_token")

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          window.history.replaceState(null, "", window.location.pathname)
        }
      }

      // // Step 2: Refresh session
      // const { error: refreshError } = await supabase.auth.refreshSession()
      // if (refreshError) {
      //   await supabase.auth.signOut()
      //   router.push("/login")
      //   return
      // }

      // Step 3: Get current user
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        await supabase.auth.signOut()
        router.push("/login")
      } else {
        setUser(user)
      }

      setLoading(false)
    }

    initAuth()
  }, [router])

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>
  }

  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
