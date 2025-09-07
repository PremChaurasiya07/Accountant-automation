// 'use client';
// import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Label } from '@/components/ui/label';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Users, HandCoins, Calendar as CalendarIcon, Download, FileText, Search } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';
// import { DashboardLayout } from '@/components/dashboard-layout';
// import { useUserId } from '@/hooks/context/UserContext';
// import { DateRange } from 'react-day-picker';
// import { Calendar } from '@/components/ui/calendar';
// import { format, isToday, isYesterday, parseISO, startOfMonth } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable'; // Corrected import

// // --- Interfaces ---
// interface LedgerEntryItem {
//   id: string | number;
//   type: 'debit' | 'credit';
//   amount: number;
//   description: string;
//   tags: string[];
//   date: string; // ISO 8601 string
// }

// interface BuyerGroup {
//   name: string;
//   ids: (string | number)[];
// }

// const PAGE_SIZE = 30;

// const BuyerLedgerPage: React.FC = () => {
//   const { userId } = useUserId();

//   // --- State Management ---
//   const [buyerGroups, setBuyerGroups] = useState<BuyerGroup[]>([]);
//   const [selectedBuyerName, setSelectedBuyerName] = useState<string | null>(null);
  
//   const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
//   const [page, setPage] = useState(0);
//   const [hasMore, setHasMore] = useState(true);
  
//   const [dateRange, setDateRange] = useState<DateRange | undefined>({
//     from: startOfMonth(new Date()),
//     to: new Date(),
//   });

//   // Loading states
//   const [loadingBuyers, setLoadingBuyers] = useState(true);
//   const [loadingEntries, setLoadingEntries] = useState(false);
//   const [isFetchingMore, setIsFetchingMore] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
  
//   const [showForm, setShowForm] = useState(false);
//   const [newEntry, setNewEntry] = useState({ amount: '', description: '' });

//   // --- Refs and Observers for Infinite Scroll ---
//   const observer = useRef<IntersectionObserver>();
//   const lastEntryRef = useCallback((node: HTMLDivElement) => {
//     if (loadingEntries || isFetchingMore) return;
//     if (observer.current) observer.current.disconnect();
//     observer.current = new IntersectionObserver(entries => {
//       if (entries[0].isIntersecting && hasMore) {
//         setPage(prevPage => prevPage + 1);
//       }
//     });
//     if (node) observer.current.observe(node);
//   }, [loadingEntries, isFetchingMore, hasMore]);

//   // --- Data Fetching ---

//   // Effect to fetch and group buyers by name
//   useEffect(() => {
//     const fetchAndGroupBuyers = async () => {
//       if (!userId) return;
//       setLoadingBuyers(true);
//       const { data, error } = await supabase
//         .from('invoices_record')
//         .select('buyers_record(id, name)')
//         .eq('user_id', userId);

//       if (error) {
//         console.error('Error fetching buyers:', error);
//       } else if (data) {
//         const buyerGroupMap = new Map<string, BuyerGroup>();
//         data.forEach(invoice => {
//           const buyer = invoice.buyers_record;
//           if (buyer && buyer.name) {
//             if (!buyerGroupMap.has(buyer.name)) {
//               buyerGroupMap.set(buyer.name, { name: buyer.name, ids: [] });
//             }
//             const group = buyerGroupMap.get(buyer.name)!;
//             if (!group.ids.includes(buyer.id)) group.ids.push(buyer.id);
//           }
//         });
//         const uniqueBuyerGroups = Array.from(buyerGroupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
//         setBuyerGroups(uniqueBuyerGroups);
//       }
//       setLoadingBuyers(false);
//     };
//     fetchAndGroupBuyers();
//   }, [userId]);

//   // Reset entries when buyer or date range changes
//   useEffect(() => {
//     setEntries([]);
//     setPage(0);
//     setHasMore(true);
//   }, [selectedBuyerName, dateRange]);


//   // Effect for fetching entries (handles initial load and pagination)
//   useEffect(() => {
//     if (!userId || !selectedBuyerName) return;

//     const fetchEntries = async () => {
//       if (page === 0) setLoadingEntries(true);
//       else setIsFetchingMore(true);

//       const selectedGroup = buyerGroups.find(b => b.name === selectedBuyerName);
//       if (!selectedGroup) {
//           setLoadingEntries(false);
//           setIsFetchingMore(false);
//           return;
//       }

//       const buyerIds = selectedGroup.ids;

//       // This is a simplified approach for pagination across two tables.
//       // For extremely large datasets, a more complex server-side solution (like a database function) would be needed.
//       // Here, we fetch all IDs within the date range, sort them, then paginate the result on the client.
      
//       // Query 1: Invoices (Debits)
//       let invoiceQuery = supabase
//         .from('invoices_record')
//         .select(`id, invoice_no, invoice_date, items_record(item_rate, qty, gst_rate)`)
//         .eq('user_id', userId)
//         .in('buyer_id', buyerIds);
      
//       if (dateRange?.from) invoiceQuery = invoiceQuery.gte('invoice_date', dateRange.from.toISOString());
//       if (dateRange?.to) invoiceQuery = invoiceQuery.lte('invoice_date', dateRange.to.toISOString());

//       const { data: invoiceData } = await invoiceQuery;

//       const invoiceEntries: LedgerEntryItem[] = (invoiceData || []).map((invoice: any) => {
//         const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => sum + (Number(item.item_rate) || 0) * (1 + (Number(item.gst_rate) / 100 || 0)), 0);
//         return { id: `inv-${invoice.id}`, type: 'debit', amount: totalAmount, description: `Invoice No: ${invoice.invoice_no}`, tags: [selectedGroup.name], date: invoice.invoice_date };
//       });

//       // Query 2: Manual Entries (Credits)
//       let creditQuery = supabase
//         .from('ledger_entries')
//         .select(`id, type, amount, description, tags, created_at`)
//         .eq('user_id', userId)
//         .eq('type', 'credit')
//         .contains('tags', [selectedGroup.name]);

//       if (dateRange?.from) creditQuery = creditQuery.gte('created_at', dateRange.from.toISOString());
//       if (dateRange?.to) creditQuery = creditQuery.lte('created_at', dateRange.to.toISOString());

//       const { data: manualEntries } = await creditQuery;
      
//       const formattedManualEntries: LedgerEntryItem[] = (manualEntries || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

//       const allFetchedEntries = [...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
//       const paginatedEntries = allFetchedEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

//       setEntries(prev => page === 0 ? paginatedEntries : [...prev, ...paginatedEntries]);
//       setHasMore(allFetchedEntries.length > (page + 1) * PAGE_SIZE);

//       if (page === 0) setLoadingEntries(false);
//       else setIsFetchingMore(false);
//     };

//     if(hasMore) {
//         fetchEntries();
//     }
//   }, [userId, selectedBuyerName, buyerGroups, page, dateRange]);


//   // --- Calculations and Grouping ---
//   const groupedEntries = useMemo(() => {
//     return entries.reduce((acc, entry) => {
//       const date = parseISO(entry.date);
//       const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
//       if (!acc[key]) acc[key] = [];
//       acc[key].push(entry);
//       return acc;
//     }, {} as Record<string, LedgerEntryItem[]>);
//   }, [entries]);

//   const { totalSales, totalPayments, balanceDue } = useMemo(() => {
//     // Note: This calculates totals for currently loaded entries. For a full balance, you'd need to query all entries.
//     return entries.reduce((acc, entry) => {
//         if (entry.type === 'debit') acc.totalSales += entry.amount;
//         else acc.totalPayments += entry.amount;
//         acc.balanceDue = acc.totalSales - acc.totalPayments;
//         return acc;
//     }, { totalSales: 0, totalPayments: 0, balanceDue: 0 });
//   }, [entries]);

//   // --- Handlers ---
//   const handleAddPayment = async () => {
//     if (!newEntry.amount || !newEntry.description || !selectedBuyerName) return;
//     setIsSubmitting(true);
//     const { data, error } = await supabase
//       .from('ledger_entries')
//       .insert([{ user_id: userId, type: 'credit', amount: parseFloat(newEntry.amount), description: newEntry.description, tags: [selectedBuyerName] }])
//       .select().single();
//     if (error) {
//       console.error('Error saving payment:', error);
//     } else if (data) {
//       const newEntryForState: LedgerEntryItem = { ...data, id: `man-${data.id}`, date: data.created_at };
//       setEntries([newEntryForState, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
//       setShowForm(false);
//       setNewEntry({ amount: '', description: '' });
//     }
//     setIsSubmitting(false);
//   };

//   const generatePdf = () => {
//     const doc = new jsPDF(); // No type casting needed
//     const title = `Ledger Statement for ${selectedBuyerName}`;
//     const dateStr = `Period: ${format(dateRange?.from || new Date(), 'dd/MM/yy')} - ${format(dateRange?.to || new Date(), 'dd/MM/yy')}`;
    
//     doc.setFontSize(18);
//     doc.text(title, 14, 22);
//     doc.setFontSize(11);
//     doc.setTextColor(100);
//     doc.text(dateStr, 14, 29);

//     // Corrected function call
//     autoTable(doc, {
//         startY: 50,
//         head: [['Date', 'Description', 'Debit (INR)', 'Credit (INR)']],
//         body: entries.map(e => [
//             format(parseISO(e.date), 'dd/MM/yyyy'),
//             e.description,
//             e.type === 'debit' ? e.amount.toFixed(2) : '',
//             e.type === 'credit' ? e.amount.toFixed(2) : ''
//         ]),
//         theme: 'grid',
//         headStyles: { fillColor: [22, 163, 74] }, // A modern green
//         foot: [
//             ['', 'Total for loaded entries', totalSales.toFixed(2), totalPayments.toFixed(2)],
//             [{ content: `Balance for loaded entries: ${balanceDue.toFixed(2)}`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }]
//         ],
//         footStyles: { fontStyle: 'bold' },
//     });

//     doc.save(`Ledger_${selectedBuyerName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
//   };

//   // --- JSX ---
//   return (
//     <DashboardLayout>
//       <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
//         <header>
//           <h1 className="text-3xl font-bold tracking-tight">Buyer Ledger</h1>
//           <p className="text-muted-foreground">Track sales and payments for individual buyers.</p>
//         </header>

//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg">Controls</CardTitle>
//             <CardDescription>Select a buyer and date range to view their ledger.</CardDescription>
//           </CardHeader>
//           <CardContent className="grid md:grid-cols-3 gap-4">
//             <div className="flex flex-col space-y-1.5">
//               <Label htmlFor="buyer-select">Buyer</Label>
//               {loadingBuyers ? <Skeleton className="h-10 w-full" /> : (
//                 <Select onValueChange={setSelectedBuyerName} value={selectedBuyerName ?? undefined}>
//                   <SelectTrigger id="buyer-select"><SelectValue placeholder="Select a buyer..." /></SelectTrigger>
//                   <SelectContent>
//                     {buyerGroups.map(group => <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>)}
//                   </SelectContent>
//                 </Select>
//               )}
//             </div>
//             <div className="flex flex-col space-y-1.5">
//               <Label>Date Range</Label>
//               <Popover>
//                 <PopoverTrigger asChild>
//                   <Button variant="outline" className="justify-start text-left font-normal">
//                     <CalendarIcon className="mr-2 h-4 w-4" />
//                     {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}
//                   </Button>
//                 </PopoverTrigger>
//                 <PopoverContent className="w-auto p-0" align="start">
//                   <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
//                 </PopoverContent>
//               </Popover>
//             </div>
//             <div className="flex flex-col space-y-1.5 justify-end">
//                 <Button onClick={generatePdf} disabled={!selectedBuyerName || entries.length === 0}>
//                     <Download className="mr-2 h-4 w-4" /> Download PDF
//                 </Button>
//             </div>
//           </CardContent>
//         </Card>

//         {selectedBuyerName && (
//           <>
//             <div className="grid gap-4 md:grid-cols-3">
//               <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Sales</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div><p className="text-xs text-muted-foreground">in selected range</p></CardContent></Card>
//               <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Payments Received</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalPayments.toFixed(2)}</div><p className="text-xs text-muted-foreground">in selected range</p></CardContent></Card>
//               <Card className={balanceDue > 0 ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Balance Due</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{balanceDue.toFixed(2)}</div><p className="text-xs text-muted-foreground">for loaded entries</p></CardContent></Card>
//             </div>
            
//             <div className="flex justify-end">
//                 <Dialog open={showForm} onOpenChange={setShowForm}>
//                     <DialogTrigger asChild>
//                         <Button><Plus size={16} className="mr-2"/> Add Payment</Button>
//                     </DialogTrigger>
//                     <DialogContent className="sm:max-w-md">
//                         <DialogHeader><DialogTitle>Add Payment from {selectedBuyerName}</DialogTitle></DialogHeader>
//                         <div className="grid gap-4 py-4">
//                             <div><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="₹0.00" /></div>
//                             <div><Label htmlFor="description">Description</Label><Input id="description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., UPI Payment Ref #123" /></div>
//                         </div>
//                         <Button onClick={handleAddPayment} disabled={isSubmitting} className="w-full">
//                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Payment
//                         </Button>
//                     </DialogContent>
//                 </Dialog>
//             </div>

//             {loadingEntries ? (
//                 <div className="space-y-4">
//                     <Skeleton className="h-8 w-1/4" />
//                     {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
//                 </div>
//             ) : entries.length > 0 ? (
//                 <div className="space-y-6">
//                     {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
//                         <div key={dateGroup}>
//                             <h2 className="text-lg font-semibold my-3 px-1">{dateGroup}</h2>
//                             <div className="space-y-3">
//                                 {entriesInGroup.map((entry, index) => (
//                                     <Card key={entry.id} ref={index === entriesInGroup.length - 1 ? lastEntryRef : null}>
//                                         <CardContent className="p-4 grid grid-cols-[auto,1fr,auto] items-center gap-4">
//                                             <div className={`p-2 rounded-full bg-muted ${entry.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
//                                                 {entry.type === 'debit' ? <ArrowUpRight size={20} /> : <HandCoins size={20} />}
//                                             </div>
//                                             <div>
//                                                 <p className="font-semibold line-clamp-1">{entry.description}</p>
//                                                 <p className="text-sm text-muted-foreground">{entry.type === 'debit' ? "Sale" : "Payment Received"}</p>
//                                             </div>
//                                             <div className={`text-right font-bold text-lg ${entry.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
//                                                 {entry.type === 'credit' ? '+' : ''}₹{entry.amount.toFixed(2)}
//                                             </div>
//                                         </CardContent>
//                                     </Card>
//                                 ))}
//                             </div>
//                         </div>
//                     ))}
//                     {isFetchingMore && (
//                         <div className="flex justify-center items-center py-4">
//                             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
//                         </div>
//                     )}
//                 </div>
//             ) : (
//                 <Card className="text-center p-12 border-dashed">
//                     <h3 className="text-xl font-semibold">No Transactions Found</h3>
//                     <p className="text-muted-foreground mt-2">No records for {selectedBuyerName} in this date range.</p>
//                 </Card>
//             )}
//           </>
//         )}
//       </div>
//     </DashboardLayout>
//   );
// };

// export default BuyerLedgerPage;



"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, HandCoins, Calendar as CalendarIcon, Download, FileText, Search, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isYesterday, parseISO, startOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
interface LedgerEntryItem {
  id: string | number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  tags: string[];
  date: string; // ISO 8601 string
}

interface BuyerGroup {
  name: string;
  ids: (string | number)[];
}

const PAGE_SIZE = 30;

const BuyerLedgerPage: React.FC = () => {
  const { userId } = useUserId();

  // --- State Management ---
  const [buyerGroups, setBuyerGroups] = useState<BuyerGroup[]>([]);
  const [selectedBuyerName, setSelectedBuyerName] = useState<string | null>(null);
  
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [loadingBuyers, setLoadingBuyers] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ amount: '', description: '' });

  // --- Refs and Observers for Infinite Scroll ---
  const observer = useRef<IntersectionObserver>();
  const lastEntryRef = useCallback((node: HTMLDivElement) => {
    if (loadingEntries || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(observerEntries => {
      if (observerEntries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingEntries, isFetchingMore, hasMore]);

  // --- Data Fetching ---

  // Effect to fetch and group buyers by name
  useEffect(() => {
    const fetchAndGroupBuyers = async () => {
      if (!userId) return;
      setLoadingBuyers(true);
      const { data, error } = await supabase.from('buyers_record').select('id, name').eq('user_id', userId);

      if (error) {
        console.error('Error fetching buyers:', error);
      } else if (data) {
        const buyerGroupMap = new Map<string, BuyerGroup>();
        data.forEach(buyer => {
          if (buyer && buyer.name) {
            if (!buyerGroupMap.has(buyer.name)) {
              buyerGroupMap.set(buyer.name, { name: buyer.name, ids: [] });
            }
            buyerGroupMap.get(buyer.name)!.ids.push(buyer.id);
          }
        });
        const uniqueBuyerGroups = Array.from(buyerGroupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setBuyerGroups(uniqueBuyerGroups);
      }
      setLoadingBuyers(false);
    };
    fetchAndGroupBuyers();
  }, [userId]);

  // Reset entries when buyer or date range changes
  useEffect(() => {
    setEntries([]);
    setPage(0);
    setHasMore(true);
  }, [selectedBuyerName, dateRange]);


  // Effect for fetching entries (handles initial load and pagination)
useEffect(() => {
    if (!userId || !selectedBuyerName || !hasMore) return;

    const fetchEntries = async () => {
      if (page === 0) setLoadingEntries(true);
      else setIsFetchingMore(true);

      const selectedGroup = buyerGroups.find(b => b.name === selectedBuyerName);
      if (!selectedGroup) {
        setLoadingEntries(false);
        setIsFetchingMore(false);
        return;
      }

      const buyerIds = selectedGroup.ids;
      const rangeFrom = page * PAGE_SIZE;
      const rangeTo = rangeFrom + PAGE_SIZE - 1;

      // Fetch both invoices and manual entries in parallel for efficiency
      const [invoiceRes, manualRes] = await Promise.all([
        supabase
          .from('invoices_record')
          .select(`id, number, date, items_record(quantity, rate, gst_rate)`)
          .in('buyer_id', buyerIds)
          .gte('date', dateRange?.from?.toISOString() || '1970-01-01')
          .lte('date', dateRange?.to?.toISOString() || new Date().toISOString())
          .order('date', { ascending: false })
          .range(rangeFrom, rangeTo),
        supabase
          .from('ledger_entries')
          .select(`id, type, amount, description, tags, created_at`)
          .eq('user_id', userId)
          .eq('type', 'credit')
          .contains('tags', [selectedGroup.name])
          .gte('created_at', dateRange?.from?.toISOString() || '1970-01-01')
          .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
          .order('created_at', { ascending: false })
          .range(rangeFrom, rangeTo)
      ]);

      const invoiceEntries: LedgerEntryItem[] = (invoiceRes.data || []).map((invoice: any) => {
        const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => {
            const rate = Number(item.rate) || 0;
            const quantity = Number(item.quantity) || 0;
            const gst_rate = Number(item.gst_rate) || 0;
            const taxableAmount = rate * quantity;
            return sum + taxableAmount * (1 + (gst_rate / 100));
        }, 0);
        return { id: `inv-${invoice.id}`, type: 'debit', amount: totalAmount, description: `Invoice #${invoice.number}`, tags: [selectedGroup.name], date: invoice.date };
      });
      
      const formattedManualEntries: LedgerEntryItem[] = (manualRes.data || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

      const combinedNewEntries = [...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // --- FIX IS HERE ---
      setEntries(prev => page === 0 ? combinedNewEntries : [...prev, ...combinedNewEntries]);
      
      setHasMore(combinedNewEntries.length > 0);

      if (page === 0) setLoadingEntries(false);
      else setIsFetchingMore(false);
    };
    
    fetchEntries();
  }, [userId, selectedBuyerName, buyerGroups, page, dateRange, hasMore]);


  // --- Calculations and Grouping ---
  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (!entry.date) return acc;
      try {
        const date = parseISO(entry.date);
        if (isNaN(date.getTime())) return acc;
        const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
      } catch (error) { console.error("Failed to parse date for entry:", entry, error); }
      return acc;
    }, {} as Record<string, LedgerEntryItem[]>);
  }, [entries]);

  const { totalSales, totalPayments, balanceDue } = useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (entry.type === 'debit') acc.totalSales += entry.amount;
      else acc.totalPayments += entry.amount;
      acc.balanceDue = acc.totalSales - acc.totalPayments;
      return acc;
    }, { totalSales: 0, totalPayments: 0, balanceDue: 0 });
  }, [entries]);

  // --- Handlers ---
 const handleAddPayment = async () => {
    if (!newEntry.amount || !newEntry.description || !selectedBuyerName) return;
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([{ user_id: userId, type: 'credit', amount: parseFloat(newEntry.amount), description: newEntry.description, tags: [selectedBuyerName] }])
      .select().single();
    if (error) {
      console.error('Error saving payment:', error);
    } else if (data) {
      const newEntryForState: LedgerEntryItem = { ...data, id: `man-${data.id}`, date: data.created_at };
      setEntries([newEntryForState, ...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setShowForm(false);
      setNewEntry({ amount: '', description: '' });
    }
    setIsSubmitting(false);
  };

// src/components/BuyerLedgerPage.tsx

  const generatePdf = () => {
    const doc = new jsPDF();
    const title = `Ledger Statement for ${selectedBuyerName}`;
    const dateStr = `Period: ${format(dateRange?.from || new Date(), 'dd/MM/yy')} - ${format(dateRange?.to || new Date(), 'dd/MM/yy')}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(dateStr, 14, 29);

    // 1. Prepare the main data rows
    const tableBody = entries.map(e => [
        format(parseISO(e.date), 'dd/MM/yyyy'),
        e.description,
        e.type === 'debit' ? e.amount.toFixed(2) : '',
        e.type === 'credit' ? e.amount.toFixed(2) : ''
    ]);

    // 2. Prepare the summary rows separately
    const totalRow = ['', 'Total', totalSales.toFixed(2), totalPayments.toFixed(2)];
    const balanceDueRow = [{ 
        content: `Balance Due: ${balanceDue.toFixed(2)}`, 
        colSpan: 4, 
        styles: { halign: 'right' } 
    }];

    autoTable(doc, {
        startY: 50,
        head: [['Date', 'Description', 'Debit (INR)', 'Credit (INR)']],
        // 3. Combine the main data and the summary rows here
        body: [
            ...tableBody,
            totalRow,
            balanceDueRow
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] }, // A modern green
        
        // 4. Use this hook to style ONLY the last two summary rows
        didParseCell: function (data) {
            // Check if the current row is one of the last two rows in the entire table
            if (data.row.index >= tableBody.length) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    doc.save(`Ledger_${selectedBuyerName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  // --- JSX ---
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Ledger</h1>
          <p className="text-muted-foreground">Track sales and payments for individual buyers.</p>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-lg">Controls</CardTitle><CardDescription>Select a buyer and date range to view their ledger.</CardDescription></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1.5"><Label htmlFor="buyer-select">Buyer</Label>
              {loadingBuyers ? <Skeleton className="h-10 w-full" /> : (
                <Select onValueChange={setSelectedBuyerName} value={selectedBuyerName ?? undefined}>
                  <SelectTrigger id="buyer-select"><SelectValue placeholder="Select a buyer..." /></SelectTrigger>
                  <SelectContent>{buyerGroups.map(group => <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div className="flex flex-col space-y-1.5"><Label>Date Range</Label>
              <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent></Popover>
            </div>
            <div className="flex flex-col space-y-1.5 justify-end"><Button onClick={generatePdf} disabled={!selectedBuyerName || entries.length === 0}><Download className="mr-2 h-4 w-4" /> Download PDF</Button></div>
          </CardContent>
        </Card>

        {selectedBuyerName && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Sales (Debit)</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div><p className="text-xs text-muted-foreground">for loaded entries</p></CardContent></Card>
              <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Payments Received (Credit)</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalPayments.toFixed(2)}</div><p className="text-xs text-muted-foreground">for loaded entries</p></CardContent></Card>
              <Card className={balanceDue > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Balance Due</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{balanceDue.toFixed(2)}</div><p className="text-xs text-muted-foreground">{balanceDue > 0 ? 'Amount to be received' : 'Amount paid in excess'}</p></CardContent></Card>
            </div>
            
            <div className="flex justify-end"><Dialog open={showForm} onOpenChange={setShowForm}><DialogTrigger asChild><Button><Plus size={16} className="mr-2"/> Add Payment</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add Payment from {selectedBuyerName}</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="₹0.00" /></div><div><Label htmlFor="description">Description</Label><Input id="description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., UPI Payment Ref #123" /></div></div><Button onClick={handleAddPayment} disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Payment</Button></DialogContent></Dialog></div>

            {loadingEntries ? (<div className="space-y-4"><Skeleton className="h-8 w-1/4" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
            ) : entries.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
                  <div key={dateGroup}>
                    <h2 className="text-lg font-semibold my-3 px-1">{dateGroup}</h2>
                    <div className="space-y-3">{entriesInGroup.map((entry, index) => (
                      <Card key={entry.id} ref={index === entries.length - 1 ? lastEntryRef : null}><CardContent className="p-4 grid grid-cols-[auto,1fr,auto] items-center gap-4">
                        <div className={`p-2 rounded-full bg-muted ${entry.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>{entry.type === 'debit' ? <ArrowUpRight size={20} /> : <HandCoins size={20} />}</div>
                        <div><p className="font-semibold line-clamp-1">{entry.description}</p><p className="text-sm text-muted-foreground">{entry.type === 'debit' ? "Sale" : "Payment Received"}</p></div>
                        <div className={`text-right font-bold text-lg ${entry.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>{entry.type === 'credit' ? '+' : ''}₹{entry.amount.toFixed(2)}</div>
                      </CardContent></Card>
                    ))}</div>
                  </div>
                ))}
                {isFetchingMore && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
              </div>
            ) : ( <Card className="text-center p-12 border-dashed"><h3 className="text-xl font-semibold">No Transactions Found</h3><p className="text-muted-foreground mt-2">No records for {selectedBuyerName} in this date range.</p></Card> )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BuyerLedgerPage;