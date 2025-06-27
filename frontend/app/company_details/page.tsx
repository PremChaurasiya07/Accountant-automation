'use client'

import { useEffect, useState } from 'react'
import { useUserId } from '../../hooks/context/UserContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CompanyInfoForm from '@/components/company_form'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Loader2 } from 'lucide-react'

export default function CompanyDetailsPage() {
  const { userId } = useUserId()
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkCompanyInfo = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from('sellers_record')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.log(error)
      }

      setLoading(false)
    }

    checkCompanyInfo()
  }, [userId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Checking company info...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <CompanyInfoForm />
    </DashboardLayout>
  )
}
