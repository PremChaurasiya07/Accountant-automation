'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
type UserContextType = {
  userId: string | null
  userSession: any | null
}

const UserContext = createContext<UserContextType>({ userId: null, userSession: null })

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null)
  const [userSession, setUserSession] = useState<any | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      console.log('Fetched user:', data, 'Error:', error)
      if (data?.user) {
        setUserId(data.user.id)
      }
      const { data: { session } } = await supabase.auth.getSession()
      setUserSession(session)
      console.log('User session:', session)
    }
    

    fetchUser()
   
  }, [])

  return (
    <UserContext.Provider value={{ userId, userSession }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUserId = () => useContext(UserContext)
