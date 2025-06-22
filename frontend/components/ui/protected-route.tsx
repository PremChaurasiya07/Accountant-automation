// components/ProtectedRoute.tsx
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace("/login")
      }
      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) {
    return <div className="text-center mt-20">Loading...</div>
  }

  return <>{children}</>
}
