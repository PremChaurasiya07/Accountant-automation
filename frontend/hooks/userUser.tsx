// hooks/useUser.ts
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase" // if using supabase client directly

export function useUser() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:8000/auth/me", {
        method: "GET",
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  const refreshToken = async () => {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) console.error("Token refresh error", error.message)
  }

  const interval = setInterval(() => {
    refreshToken()
  }, 1000 * 60 * 5) // every 5 mins

  return () => clearInterval(interval)
}, [])


  useEffect(() => {
    fetchUser()

    // Listen for session changes from Supabase client (if used anywhere)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Optional: refresh your backend cookie by calling a route
          await fetchUser()
        } else {
          setUser(null)
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
