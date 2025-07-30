// "use client";

// import { useEffect, useState } from "react"
// import { supabase } from "@/lib/supabase";
// import { motion } from "framer-motion"
// import {
//   Card, CardContent, CardDescription, CardHeader, CardTitle
// } from "@/components/ui/card"
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area
// } from "recharts"
// import { BarChart3 } from "lucide-react"
// import { DashboardLayout } from "@/components/dashboard-layout"
// import dayjs from "dayjs"

// export default function Reports() {
//   const [year, setYear] = useState(dayjs().year())
//   const [userId, setUserId] = useState<string | null>(null)
//   const [monthlyData, setMonthlyData] = useState<{ month: string; sales: number; purchase: number }[]>([])
//   const [dailyData, setDailyData] = useState<{ date: string; sales: number; purchase: number }[]>([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     const fetchUser = async () => {
//       const { data: { user } } = await supabase.auth.getUser()
//       if (user?.id) {
//         setUserId(user.id)
//       }
//     }
//     fetchUser()
//   }, [])

//   useEffect(() => {
//     if (!userId) return

//     const fetchAnalytics = async () => {
//       setLoading(true)
//       const { data: invoices, error } = await supabase
//         .from("invoices_record")
//         .select("id, invoice_date, user_id, items_record(item_rate, qty)")
//         .eq("user_id", userId)
//         .gte("invoice_date", `${year}-01-01`)
//         .lte("invoice_date", `${year}-12-31`)

//       if (error) {
//         console.error("Error loading invoices:", error)
//         setLoading(false)
//         return
//       }

//       const monthlyMap: { [key: string]: { sales: number; purchase: number } } = {}
//       const dailyMap: { [key: string]: { sales: number; purchase: number } } = {}

//       invoices.forEach(invoice => {
//         const date = dayjs(invoice.invoice_date)
//         const month = date.format("MMM")
//         const day = date.format("YYYY-MM-DD")

//         if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, purchase: 0 }
//         if (!dailyMap[day]) dailyMap[day] = { sales: 0, purchase: 0 }

//         invoice.items_record.forEach(item => {
//           const total = item.item_rate 
//           monthlyMap[month].sales += total
//           monthlyMap[month].purchase +=0 //further purchase handling logic is required

//           dailyMap[day].sales += total
//           dailyMap[day].purchase +=0
//         })
//       })

//       setMonthlyData(
//         Object.entries(monthlyMap).map(([month, val]) => ({ month, ...val }))
//       )
//       setDailyData(
//         Object.entries(dailyMap).map(([date, val]) => ({ date, ...val })).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)))
//       )

//       setLoading(false)
//     }

//     fetchAnalytics()
//   }, [userId, year])

//   return (
//     <DashboardLayout>
//       <div className="container mx-auto px-4">
//         <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
//           <div className="flex items-center space-x-3 mb-2">
//             <BarChart3 className="w-8 h-8 text-primary" />
//             <h1 className="text-3xl font-bold">Analytics Dashboard - {year}</h1>
//           </div>
//           <p className="text-muted-foreground">Insights by month and day</p>
//         </motion.div>

//         {loading ? <p className="text-center">Loading...</p> : (
//           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

//             {/* Monthly Chart */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Monthly Sales vs Purchase</CardTitle>
//                 <CardDescription>{year} Year-wise analysis</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="h-80">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
//                       <defs>
//                         <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
//                           <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
//                           <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
//                         </linearGradient>
//                         <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
//                           <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
//                           <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
//                         </linearGradient>
//                       </defs>
//                       <XAxis dataKey="month" />
//                       <YAxis />
//                       <CartesianGrid strokeDasharray="3 3" />
//                       <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} />
//                       <Legend />
//                       <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" name="Sales" />
//                       <Area type="monotone" dataKey="purchase" stroke="#ef4444" fillOpacity={1} fill="url(#colorPurchase)" name="Purchase" />
//                     </AreaChart>
//                   </ResponsiveContainer>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Daily Chart */}
//             <Card>
//               <CardHeader>
//                 <CardTitle>Daily Sales & Purchase</CardTitle>
//                 <CardDescription>Detailed view of each day's transactions</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="h-80">
//                   <ResponsiveContainer width="100%" height="100%" >
//                     <LineChart data={dailyData} margin={{left:32}}>
//                       <XAxis dataKey="date" tickFormatter={(tick) => dayjs(tick).format("DD MMM")} />
//                       <YAxis />
//                       <Tooltip formatter={(value: any) => [`₹${value.toLocaleString()}`, '']} labelFormatter={(label) => `Date: ${label}`} />
//                       <Legend />
//                       <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales" />
//                       <Line type="monotone" dataKey="purchase" stroke="#ef4444" name="Purchase" />
//                     </LineChart>
//                   </ResponsiveContainer>
//                 </div>
//               </CardContent>
//             </Card>
//           </motion.div>
//         )}
//       </div>
//     </DashboardLayout>
//   )
// }



"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "../../../components/ui/date-range-picker"; // Assuming you have this component from shadcn/ui examples
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { BarChart3, TrendingUp, FileText, IndianRupee, Crown, User, Star } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import dayjs from "dayjs";

// --- Helper Components ---

const StatCard = ({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
            <span className="font-bold text-muted-foreground">{label}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">Revenue</span>
            <span className="font-bold text-primary">₹{payload[0].value.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// --- Main Dashboard Component ---

export default function Reports() {
  const [userId, setUserId] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({
    from: dayjs().startOf('month').toDate(),
    to: dayjs().endOf('month').toDate(),
  });
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId || !date?.from || !date?.to) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      const { data: invoices, error } = await supabase
        .from("invoices_record")
        .select("*, items_record(*), buyers_record(name)")
        .eq("user_id", userId)
        .gte("invoice_date", dayjs(date.from).format('YYYY-MM-DD'))
        .lte("invoice_date", dayjs(date.to).format('YYYY-MM-DD'));

      if (error) {
        console.error("Error loading invoices:", error);
        setLoading(false);
        return;
      }

      // Process Data
      let totalRevenue = 0;
      const salesByDate: { [key: string]: number } = {};
      const topProducts: { [key: string]: { sales: number, quantity: number } } = {};
      const topCustomers: { [key: string]: number } = {};
      
      invoices.forEach(invoice => {
        let invoiceTotal = 0;
        invoice.items_record.forEach((item: any) => {
          const itemTotal = (item.item_rate || 0) * (item.qty || 0);
          invoiceTotal += itemTotal;
          // Aggregate product sales
          if (!topProducts[item.item_name]) topProducts[item.item_name] = { sales: 0, quantity: 0 };
          topProducts[item.item_name].sales += itemTotal;
          topProducts[item.item_name].quantity += (item.qty || 0);
        });

        totalRevenue += invoiceTotal;

        // Aggregate sales by date
        const formattedDate = dayjs(invoice.invoice_date).format('YYYY-MM-DD');
        if (!salesByDate[formattedDate]) salesByDate[formattedDate] = 0;
        salesByDate[formattedDate] += invoiceTotal;

        // Aggregate customer sales
        const customerName = invoice.buyers_record?.name || "Unknown Customer";
        if(!topCustomers[customerName]) topCustomers[customerName] = 0;
        topCustomers[customerName] += invoiceTotal;
      });

      const sortedTopProducts = Object.entries(topProducts)
        .sort(([,a],[,b]) => b.sales - a.sales)
        .slice(0, 5);

      const sortedTopCustomers = Object.entries(topCustomers)
        .sort(([,a],[,b]) => b - a)
        .slice(0, 5);

      setAnalyticsData({
        totalRevenue,
        invoiceCount: invoices.length,
        avgSale: invoices.length > 0 ? totalRevenue / invoices.length : 0,
        salesByDate,
        topProducts: sortedTopProducts,
        topCustomers: sortedTopCustomers,
      });

      setLoading(false);
    };

    fetchAnalytics();
  }, [userId, date]);

  const chartData = useMemo(() => {
    if (!analyticsData?.salesByDate) return [];
    
    const diffDays = dayjs(date?.to).diff(dayjs(date?.from), 'day');
    
    // Switch to monthly view if range is > 60 days
    if (diffDays > 60) {
      const monthlyMap: { [key: string]: number } = {};
      Object.entries(analyticsData.salesByDate).forEach(([day, sales]) => {
        const month = dayjs(day).format('MMM YYYY');
        if (!monthlyMap[month]) monthlyMap[month] = 0;
        monthlyMap[month] += sales as number;
      });
      return Object.entries(monthlyMap).map(([date, sales]) => ({ date, sales }));
    }
    
    // Daily view
    return Object.entries(analyticsData.salesByDate)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [analyticsData, date]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      );
    }
    
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={`₹${analyticsData.totalRevenue.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} description="Total sales in the selected period" />
          <StatCard title="Total Invoices" value={analyticsData.invoiceCount.toLocaleString()} icon={<FileText className="h-4 w-4 text-muted-foreground" />} description="Total invoices generated" />
          <StatCard title="Average Sale" value={`₹${analyticsData.avgSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} description="Average value per invoice" />
          <StatCard title="Top Customer" value={analyticsData.topCustomers[0]?.[0] || 'N/A'} icon={<Crown className="h-4 w-4 text-muted-foreground" />} description="Customer with highest spending" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Star className="mr-2 h-5 w-5 text-yellow-500" /> Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topProducts.map(([name, data]: [string, any]) => (
                  <div key={name} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{data.quantity} units sold</p>
                    </div>
                    <p className="font-bold">₹{data.sales.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <div className="flex items-center space-x-2">
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
        </div>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}