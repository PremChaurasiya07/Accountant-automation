



"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "../../../components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, FileText, IndianRupee, Crown, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useUserId } from "@/hooks/context/UserContext";
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
      // --- MODIFIED: Query uses correct schema names ---
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

      // --- MODIFIED: Data processing with correct calculations ---
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

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><Skeleton className="h-96 rounded-lg lg:col-span-2" /><Skeleton className="h-96 rounded-lg" /></div>
        </div>
      );
    }
    
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={`₹${analyticsData.totalRevenue.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} description="Total sales in the selected period" />
          <StatCard title="Total Invoices" value={analyticsData.invoiceCount.toLocaleString()} icon={<FileText className="h-4 w-4 text-muted-foreground" />} description="Total invoices generated" />
          <StatCard title="Average Sale" value={`₹${analyticsData.avgSale.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} description="Average value per invoice" />
          <StatCard title="Top Customer" value={analyticsData.topCustomers[0]?.[0] || 'N/A'} icon={<Crown className="h-4 w-4 text-muted-foreground" />} description="Customer with highest spending" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Revenue Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
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

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center"><Crown className="mr-2 h-5 w-5 text-yellow-500" /> Top Selling Products</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topProducts.map(([name, data]: [string, any]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <div><p className="font-medium truncate pr-2">{name}</p><p className="text-xs text-muted-foreground">{data.quantity} units sold</p></div>
                      <p className="font-bold whitespace-nowrap">₹{data.sales.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-blue-500" /> Top Customers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topCustomers.map(([name, sales]: [string, number]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <p className="font-medium truncate pr-2">{name}</p>
                      <p className="font-bold whitespace-nowrap">₹{sales.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 pt-6">
        <div className="flex flex-col items-start space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <div className="flex items-center space-x-2">
            <DatePickerWithRange date={date} setDate={setDate} />
          </div>
        </div>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}