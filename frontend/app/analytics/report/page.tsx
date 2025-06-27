"use client";

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
} from "recharts"
import { BarChart3 } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard-layout"
import dayjs from "dayjs"

export default function Reports() {
  const [year, setYear] = useState(dayjs().year())
  const [userId, setUserId] = useState<string | null>(null)
  const [monthlyData, setMonthlyData] = useState<{ month: string; sales: number; purchase: number }[]>([])
  const [dailyData, setDailyData] = useState<{ date: string; sales: number; purchase: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        setUserId(user.id)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    if (!userId) return

    const fetchAnalytics = async () => {
      setLoading(true)
      const { data: invoices, error } = await supabase
        .from("invoices_record")
        .select("id, invoice_date, user_id, items_record(item_rate, qty)")
        .eq("user_id", userId)
        .gte("invoice_date", `${year}-01-01`)
        .lte("invoice_date", `${year}-12-31`)

      if (error) {
        console.error("Error loading invoices:", error)
        setLoading(false)
        return
      }

      const monthlyMap: { [key: string]: { sales: number; purchase: number } } = {}
      const dailyMap: { [key: string]: { sales: number; purchase: number } } = {}

      invoices.forEach(invoice => {
        const date = dayjs(invoice.invoice_date)
        const month = date.format("MMM")
        const day = date.format("YYYY-MM-DD")

        if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, purchase: 0 }
        if (!dailyMap[day]) dailyMap[day] = { sales: 0, purchase: 0 }

        invoice.items_record.forEach(item => {
          const total = item.item_rate 
          monthlyMap[month].sales += total
          monthlyMap[month].purchase +=0 //further purchase handling logic is required

          dailyMap[day].sales += total
          dailyMap[day].purchase +=0
        })
      })

      setMonthlyData(
        Object.entries(monthlyMap).map(([month, val]) => ({ month, ...val }))
      )
      setDailyData(
        Object.entries(dailyMap).map(([date, val]) => ({ date, ...val })).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
      )

      setLoading(false)
    }

    fetchAnalytics()
  }, [userId, year])

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Analytics Dashboard - {year}</h1>
          </div>
          <p className="text-muted-foreground">Insights by month and day</p>
        </motion.div>

        {loading ? <p className="text-center">Loading...</p> : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* Monthly Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Sales vs Purchase</CardTitle>
                <CardDescription>{year} Year-wise analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} />
                      <Legend />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" name="Sales" />
                      <Area type="monotone" dataKey="purchase" stroke="#ef4444" fillOpacity={1} fill="url(#colorPurchase)" name="Purchase" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales & Purchase</CardTitle>
                <CardDescription>Detailed view of each day's transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%" >
                    <LineChart data={dailyData} margin={{left:32}}>
                      <XAxis dataKey="date" tickFormatter={(tick) => dayjs(tick).format("DD MMM")} />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} labelFormatter={(label) => `Date: ${label}`} />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales" />
                      <Line type="monotone" dataKey="purchase" stroke="#ef4444" name="Purchase" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  )
}
