// 'use client'

// import { createContext, useContext, useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabase'
// type UserContextType = {
//   userId: string | null
//   userSession: any | null
// }

// const UserContext = createContext<UserContextType>({ userId: null, userSession: null })

// export const UserProvider = ({ children }: { children: React.ReactNode }) => {
//   const [userId, setUserId] = useState<string | null>(null)
//   const [userSession, setUserSession] = useState<any | null>(null)

//   useEffect(() => {
//     const fetchUser = async () => {
//       const { data, error } = await supabase.auth.getUser()
//       console.log('Fetched user:', data, 'Error:', error)
//       if (data?.user) {
//         setUserId(data.user.id)
//       }
//       const { data: { session } } = await supabase.auth.getSession()
//       setUserSession(session)
//       console.log('User session:', session)
//     }
    

//     fetchUser()
   
//   }, [])

//   return (
//     <UserContext.Provider value={{ userId, userSession }}>
//       {children}
//     </UserContext.Provider>
//   )
// }

// export const useUserId = () => useContext(UserContext)



'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

// Define the shape of your seller data for type safety
interface SellerDetails {
  id: number;
  user_id: string;
  name: string;
  address: string | null;
  email: string | null;
  gst_no: string | null;
  contact: string | null;
  sender_email: string | null;
  [key: string]: any; 
}

// Define the shape of the context value
interface UserContextType {
  userId: string | null;
  user: User | null;
  session: Session | null;
  sellerDetails: SellerDetails | null;
  setSellerDetails: (details: SellerDetails | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sellerDetails, setSellerDetails] = useState<SellerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const userId = user?.id ?? null;

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
        if (sellerDetails) setSellerDetails(null);
        return;
    };

    const fetchSellerDetails = async () => {
      const { data, error } = await supabase
        .from('sellers_record')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log("No seller details found for this user yet.");
        setSellerDetails(null);
      } else if (data) {
        setSellerDetails(data);
      }
    };

    fetchSellerDetails();
  }, [userId]);

  const value = {
    session,
    user,
    userId,
    sellerDetails,
    setSellerDetails,
  };

  return (
    <UserContext.Provider value={value}>
      {!loading && children}
    </UserContext.Provider>
  )
}

// The exported hook's name is kept as useUserId
export const useUserId = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserId must be used within a UserProvider');
  }
  return context;
}