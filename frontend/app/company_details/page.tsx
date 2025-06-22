'use client'

import { useEffect, useState } from 'react'
import { useUserId } from '../../hooks/context/UserContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CompanyInfoForm from '@/components/company_form'
import { DashboardLayout } from '@/components/dashboard-layout'

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

      if (data) {
        router.push('/billing/create')
      } else {
        setLoading(false)
      }
    }

    checkCompanyInfo()
  }, [userId, router])

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <DashboardLayout>
      <CompanyInfoForm />
    </DashboardLayout>
  )
}
