



// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { supabase } from "@/lib/supabase";
// import { motion } from "framer-motion";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { DateRange } from "react-day-picker";
// import { DatePickerWithRange } from "../../../components/ui/date-range-picker";
// import { Skeleton } from "@/components/ui/skeleton";
// import {
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
// } from "recharts";
// import { TrendingUp, FileText, IndianRupee, Crown, Users } from "lucide-react";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { useUserId } from "@/hooks/context/UserContext";
// import dayjs from "dayjs";

// // --- Helper Components ---

// const StatCard = ({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) => (
//   <Card>
//     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//       <CardTitle className="text-sm font-medium">{title}</CardTitle>
//       {icon}
//     </CardHeader>
//     <CardContent>
//       <div className="text-2xl font-bold">{value}</div>
//       <p className="text-xs text-muted-foreground">{description}</p>
//     </CardContent>
//   </Card>
// );

// const CustomTooltip = ({ active, payload, label }: any) => {
//   if (active && payload && payload.length) {
//     return (
//       <div className="rounded-lg border bg-background p-2 shadow-sm">
//         <div className="grid grid-cols-2 gap-2">
//           <div className="flex flex-col">
//             <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
//             <span className="font-bold text-muted-foreground">{label}</span>
//           </div>
//           <div className="flex flex-col">
//             <span className="text-[0.70rem] uppercase text-muted-foreground">Revenue</span>
//             <span className="font-bold text-primary">₹{payload[0].value.toLocaleString()}</span>
//           </div>
//         </div>
//       </div>
//     );
//   }
//   return null;
// };

// // --- Main Dashboard Component ---

// export default function Reports() {
//   const { userId } = useUserId();
//   const [date, setDate] = useState<DateRange | undefined>({
//     from: dayjs().startOf('month').toDate(),
//     to: dayjs().endOf('month').toDate(),
//   });
//   const [analyticsData, setAnalyticsData] = useState<any | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!userId || !date?.from || !date?.to) return;

//     const fetchAnalytics = async () => {
//       setLoading(true);
//       // --- MODIFIED: Query uses correct schema names ---
//       const { data: invoices, error } = await supabase
//         .from("invoices_record")
//         .select("date, number, items_record(name, quantity, rate, gst_rate), buyers_record(name)")
//         .eq("user_id", userId)
//         .gte("date", dayjs(date.from).format('YYYY-MM-DD'))
//         .lte("date", dayjs(date.to).format('YYYY-MM-DD'));

//       if (error) {
//         console.error("Error loading invoices:", error);
//         setLoading(false);
//         return;
//       }

//       // --- MODIFIED: Data processing with correct calculations ---
//       let totalRevenue = 0;
//       const salesByDate: { [key: string]: number } = {};
//       const topProducts: { [key: string]: { sales: number, quantity: number } } = {};
//       const topCustomers: { [key: string]: number } = {};
      
//       invoices.forEach(invoice => {
//         let invoiceTotal = 0;
//         invoice.items_record.forEach((item: any) => {
//           const rate = Number(item.rate) || 0;
//           const quantity = Number(item.quantity) || 0;
//           const gst_rate = Number(item.gst_rate) || 0;
//           const itemTotal = rate * quantity * (1 + gst_rate / 100);
          
//           invoiceTotal += itemTotal;
          
//           if (!topProducts[item.name]) topProducts[item.name] = { sales: 0, quantity: 0 };
//           topProducts[item.name].sales += itemTotal;
//           topProducts[item.name].quantity += quantity;
//         });

//         totalRevenue += invoiceTotal;

//         const formattedDate = dayjs(invoice.date).format('YYYY-MM-DD');
//         if (!salesByDate[formattedDate]) salesByDate[formattedDate] = 0;
//         salesByDate[formattedDate] += invoiceTotal;

//         const customerName = invoice.buyers_record?.name || "Unknown Customer";
//         if(!topCustomers[customerName]) topCustomers[customerName] = 0;
//         topCustomers[customerName] += invoiceTotal;
//       });

//       const sortedTopProducts = Object.entries(topProducts).sort(([,a],[,b]) => b.sales - a.sales).slice(0, 5);
//       const sortedTopCustomers = Object.entries(topCustomers).sort(([,a],[,b]) => b - a).slice(0, 5);

//       setAnalyticsData({
//         totalRevenue,
//         invoiceCount: invoices.length,
//         avgSale: invoices.length > 0 ? totalRevenue / invoices.length : 0,
//         salesByDate,
//         topProducts: sortedTopProducts,
//         topCustomers: sortedTopCustomers,
//       });

//       setLoading(false);
//     };

//     fetchAnalytics();
//   }, [userId, date]);

//   const chartData = useMemo(() => {
//     if (!analyticsData?.salesByDate) return [];
//     const diffDays = dayjs(date?.to).diff(dayjs(date?.from), 'day');
//     if (diffDays > 60) {
//       const monthlyMap: { [key: string]: number } = {};
//       Object.entries(analyticsData.salesByDate).forEach(([day, sales]) => {
//         const month = dayjs(day).format('MMM YYYY');
//         if (!monthlyMap[month]) monthlyMap[month] = 0;
//         monthlyMap[month] += sales as number;
//       });
//       return Object.entries(monthlyMap).map(([date, sales]) => ({ date, sales }));
//     }
//     return Object.entries(analyticsData.salesByDate).map(([date, sales]) => ({ date, sales })).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
//   }, [analyticsData, date]);

//   const renderContent = () => {
//     if (loading) {
//       return (
//         <div className="space-y-6">
//           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton className="h-96 rounded-lg lg:col-span-2" /><Skeleton className="h-96 rounded-lg" /></div>
//         </div>
//       );
//     }
    
//     return (
//       <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
//         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           <StatCard title="Total Revenue" value={`₹${analyticsData.totalRevenue.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} description="Total sales in the selected period" />
//           <StatCard title="Total Invoices" value={analyticsData.invoiceCount.toLocaleString()} icon={<FileText className="h-4 w-4 text-muted-foreground" />} description="Total invoices generated" />
//           <StatCard title="Average Sale" value={`₹${analyticsData.avgSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} description="Average value per invoice" />
//           <StatCard title="Top Customer" value={analyticsData.topCustomers[0]?.[0] || 'N/A'} icon={<Crown className="h-4 w-4 text-muted-foreground" />} description="Customer with highest spending" />
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <Card className="lg:col-span-2">
//             <CardHeader><CardTitle>Revenue Overview</CardTitle></CardHeader>
//             <CardContent>
//               <div className="h-72 md:h-80">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
//                     <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
//                     <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
//                     <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
//                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>
//             </CardContent>
//           </Card>

//           <div className="space-y-6">
//             <Card>
//               <CardHeader><CardTitle className="flex items-center"><Crown className="mr-2 h-5 w-5 text-yellow-500" /> Top Selling Products</CardTitle></CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   {analyticsData.topProducts.map(([name, data]: [string, any]) => (
//                     <div
//                       key={name}
//                       className="flex flex-wrap justify-between items-start text-sm gap-y-1 border-b border-muted/30 pb-2 last:border-0"
//                     >
//                       <div className="flex-1 min-w-0">
//                         <p className="font-medium break-words text-sm leading-snug">{name}</p>
//                         <p className="text-xs text-muted-foreground">{data.quantity} units sold</p>
//                       </div>
//                       <p className="font-bold text-right mt-1 sm:mt-0 w-full sm:w-auto">
//                         ₹{data.sales.toLocaleString()}
//                       </p>
//                     </div>

//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-blue-500" /> Top Customers</CardTitle></CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   {analyticsData.topCustomers.map(([name, sales]: [string, number]) => (
//                     <div key={name} className="flex justify-between items-center text-sm">
//                       <p className="font-medium truncate pr-2">{name}</p>
//                       <p className="font-bold whitespace-nowrap">₹{sales.toLocaleString()}</p>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </motion.div>
//     );
//   };

//   return (
//     <DashboardLayout>
//       <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-6">
//         <div className="flex flex-col items-start space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
//           <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
//           <div className="flex items-center space-x-2">
//             <DatePickerWithRange date={date} setDate={setDate} />
//           </div>
//         </div>
//         {renderContent()}
//       </div>
//     </DashboardLayout>
//   );
// }



"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "../../../components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, TrendingDown, FileText, IndianRupee, Crown, Users, Package, Sparkles, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useUserId } from "@/hooks/context/UserContext";
import dayjs from "dayjs";

// --- Constants ---
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// --- Helper Components ---

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  trendValue 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  description: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
  >
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && trendValue && (
            <Badge variant="secondary" className={`flex items-center gap-1 ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span className="text-xs font-semibold">{trendValue}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-4 shadow-2xl"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground font-semibold tracking-wide">Date</span>
            <span className="font-bold text-foreground mt-1">{label}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground font-semibold tracking-wide">Revenue</span>
            <span className="font-bold text-primary mt-1">₹{payload[0].value.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

const EmptyState = ({ message }: { message: string }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center h-64 text-center"
  >
    <div className="p-4 rounded-full bg-muted/30 mb-4">
      <FileText className="w-12 h-12 text-muted-foreground/50" />
    </div>
    <p className="text-muted-foreground text-lg font-medium">{message}</p>
    <p className="text-muted-foreground/60 text-sm mt-2">Try adjusting your date range</p>
  </motion.div>
);

// --- Main Dashboard Component ---

export default function Reports() {
  const { userId } = useUserId();
  const [date, setDate] = useState<DateRange | undefined>({
    from: dayjs().startOf('month').toDate(),
    to: dayjs().endOf('month').toDate(),
  });
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !date?.from || !date?.to) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      const { data: invoices, error } = await supabase
        .from("invoices_record")
        .select("date, number, items_record(name, quantity, rate, gst_rate), buyers_record(name)")
        .eq("user_id", userId)
        .gte("date", dayjs(date.from).format('YYYY-MM-DD'))
        .lte("date", dayjs(date.to).format('YYYY-MM-DD'));

      if (error) {
        console.error("Error loading invoices:", error);
        setLoading(false);
        return;
      }

      let totalRevenue = 0;
      const salesByDate: { [key: string]: number } = {};
      const topProducts: { [key: string]: { sales: number, quantity: number } } = {};
      const topCustomers: { [key: string]: number } = {};
      
      invoices.forEach(invoice => {
        let invoiceTotal = 0;
        invoice.items_record.forEach((item: any) => {
          const rate = Number(item.rate) || 0;
          const quantity = Number(item.quantity) || 0;
          const gst_rate = Number(item.gst_rate) || 0;
          const itemTotal = rate * quantity * (1 + gst_rate / 100);
          
          invoiceTotal += itemTotal;
          
          if (!topProducts[item.name]) topProducts[item.name] = { sales: 0, quantity: 0 };
          topProducts[item.name].sales += itemTotal;
          topProducts[item.name].quantity += quantity;
        });

        totalRevenue += invoiceTotal;

        const formattedDate = dayjs(invoice.date).format('YYYY-MM-DD');
        if (!salesByDate[formattedDate]) salesByDate[formattedDate] = 0;
        salesByDate[formattedDate] += invoiceTotal;

        const customerName = invoice.buyers_record?.name || "Unknown Customer";
        if(!topCustomers[customerName]) topCustomers[customerName] = 0;
        topCustomers[customerName] += invoiceTotal;
      });

      const sortedTopProducts = Object.entries(topProducts).sort(([,a],[,b]) => b.sales - a.sales).slice(0, 5);
      const sortedTopCustomers = Object.entries(topCustomers).sort(([,a],[,b]) => b - a).slice(0, 5);

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
    if (diffDays > 60) {
      const monthlyMap: { [key: string]: number } = {};
      Object.entries(analyticsData.salesByDate).forEach(([day, sales]) => {
        const month = dayjs(day).format('MMM YYYY');
        if (!monthlyMap[month]) monthlyMap[month] = 0;
        monthlyMap[month] += sales as number;
      });
      return Object.entries(monthlyMap).map(([date, sales]) => ({ date, sales }));
    }
    return Object.entries(analyticsData.salesByDate).map(([date, sales]) => ({ date, sales })).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [analyticsData, date]);

  const productPieData = useMemo(() => {
    if (!analyticsData?.topProducts) return [];
    return analyticsData.topProducts.map(([name, data]: [string, any]) => ({
      name,
      value: data.sales
    }));
  }, [analyticsData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      );
    }

    const hasData = analyticsData && analyticsData.invoiceCount > 0;
    
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Revenue" 
            value={`₹${analyticsData.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} 
            icon={<TrendingUp className="h-5 w-5" />} 
            description="Total sales revenue"
            trend="up"
            trendValue="+12.5%"
          />
          <StatCard 
            title="Total Invoices" 
            value={analyticsData.invoiceCount.toLocaleString()} 
            icon={<FileText className="h-5 w-5" />} 
            description="Invoices generated"
            trend="up"
            trendValue="+8.2%"
          />
          <StatCard 
            title="Average Sale" 
            value={`₹${analyticsData.avgSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} 
            icon={<IndianRupee className="h-5 w-5" />} 
            description="Per invoice value"
            trend="up"
            trendValue="+5.1%"
          />
          <StatCard 
            title="Top Customer" 
            value={analyticsData.topCustomers[0]?.[0]?.split(' ').slice(0, 2).join(' ') || 'N/A'} 
            icon={<Crown className="h-5 w-5" />} 
            description="Highest spending"
            trend="up"
            trendValue="Featured"
          />
        </div>

        {!hasData ? (
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardContent className="pt-6">
              <EmptyState message="No data available for the selected period" />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Revenue Overview
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Track your sales performance</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <Calendar className="w-3 h-3 mr-1" />
                      {dayjs(date?.from).format('MMM D')} - {dayjs(date?.to).format('MMM D')}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                            dx={-10}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorSales)"
                            animationDuration={1000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Product Distribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-500" />
                      Product Distribution
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Revenue by product</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={productPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            animationDuration={1000}
                          >
                            {productPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => `₹${value.toLocaleString()}`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '0.75rem',
                              padding: '0.75rem'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Top Products & Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Top Selling Products
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Best performers this period</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <AnimatePresence>
                        {analyticsData.topProducts.map(([name, data]: [string, any], index: number) => (
                          <motion.div
                            key={name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="group relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent hover:from-muted hover:to-muted/50 transition-all duration-300 border border-border/30 hover:border-border/50"
                          >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">{name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {data.quantity} units • 
                                <span className="ml-1 font-medium" style={{ color: COLORS[index % COLORS.length] }}>
                                  {((data.sales / analyticsData.totalRevenue) * 100).toFixed(1)}%
                                </span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-lg">₹{(data.sales).toFixed(1)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Top Customers */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Top Customers
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Highest value customers</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <AnimatePresence>
                        {analyticsData.topCustomers.map(([name, sales]: [string, number], index: number) => (
                          <motion.div
                            key={name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="group relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent hover:from-muted hover:to-muted/50 transition-all duration-300 border border-border/30 hover:border-border/50"
                          >
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/10 text-blue-500 font-bold text-lg shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">{name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium text-blue-500">
                                  {((sales / analyticsData.totalRevenue) * 100).toFixed(1)}% of revenue
                                </span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-lg">₹{(sales).toFixed(1)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-start space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Monitor your business performance and insights</p>
          </div>
          <div className="flex items-center space-x-2">
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
        </motion.div>
        
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}