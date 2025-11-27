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



// "use client";
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
// import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, HandCoins, Calendar as CalendarIcon, Download, FileText, Search, X } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';
// import { DashboardLayout } from '@/components/dashboard-layout';
// import { useUserId } from '@/hooks/context/UserContext';
// import { DateRange } from 'react-day-picker';
// import { Calendar } from '@/components/ui/calendar';
// import { format, isToday, isYesterday, parseISO, startOfMonth } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

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
//     observer.current = new IntersectionObserver(observerEntries => {
//       if (observerEntries[0].isIntersecting && hasMore) {
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
//       const { data, error } = await supabase.from('buyers_record').select('id, name').eq('user_id', userId);

//       if (error) {
//         console.error('Error fetching buyers:', error);
//       } else if (data) {
//         const buyerGroupMap = new Map<string, BuyerGroup>();
//         data.forEach(buyer => {
//           if (buyer && buyer.name) {
//             if (!buyerGroupMap.has(buyer.name)) {
//               buyerGroupMap.set(buyer.name, { name: buyer.name, ids: [] });
//             }
//             buyerGroupMap.get(buyer.name)!.ids.push(buyer.id);
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
// useEffect(() => {
//     if (!userId || !selectedBuyerName || !hasMore) return;

//     const fetchEntries = async () => {
//       if (page === 0) setLoadingEntries(true);
//       else setIsFetchingMore(true);

//       const selectedGroup = buyerGroups.find(b => b.name === selectedBuyerName);
//       if (!selectedGroup) {
//         setLoadingEntries(false);
//         setIsFetchingMore(false);
//         return;
//       }

//       const buyerIds = selectedGroup.ids;
//       const rangeFrom = page * PAGE_SIZE;
//       const rangeTo = rangeFrom + PAGE_SIZE - 1;

//       // Fetch both invoices and manual entries in parallel for efficiency
//       const [invoiceRes, manualRes] = await Promise.all([
//         supabase
//           .from('invoices_record')
//           .select(`id, number, date, items_record(quantity, rate, gst_rate)`)
//           .in('buyer_id', buyerIds)
//           .gte('date', dateRange?.from?.toISOString() || '1970-01-01')
//           .lte('date', dateRange?.to?.toISOString() || new Date().toISOString())
//           .order('date', { ascending: false })
//           .range(rangeFrom, rangeTo),
//         supabase
//           .from('ledger_entries')
//           .select(`id, type, amount, description, tags, created_at`)
//           .eq('user_id', userId)
//           .eq('type', 'credit')
//           .contains('tags', [selectedGroup.name])
//           .gte('created_at', dateRange?.from?.toISOString() || '1970-01-01')
//           .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
//           .order('created_at', { ascending: false })
//           .range(rangeFrom, rangeTo)
//       ]);

//       const invoiceEntries: LedgerEntryItem[] = (invoiceRes.data || []).map((invoice: any) => {
//         const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => {
//             const rate = Number(item.rate) || 0;
//             const quantity = Number(item.quantity) || 0;
//             const gst_rate = Number(item.gst_rate) || 0;
//             const taxableAmount = rate * quantity;
//             return sum + taxableAmount * (1 + (gst_rate / 100));
//         }, 0);
//         return { id: `inv-${invoice.id}`, type: 'debit', amount: totalAmount, description: `Invoice #${invoice.number}`, tags: [selectedGroup.name], date: invoice.date };
//       });
      
//       const formattedManualEntries: LedgerEntryItem[] = (manualRes.data || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

//       const combinedNewEntries = [...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
//       // --- FIX IS HERE ---
//       setEntries(prev => page === 0 ? combinedNewEntries : [...prev, ...combinedNewEntries]);
      
//       setHasMore(combinedNewEntries.length > 0);

//       if (page === 0) setLoadingEntries(false);
//       else setIsFetchingMore(false);
//     };
    
//     fetchEntries();
//   }, [userId, selectedBuyerName, buyerGroups, page, dateRange, hasMore]);


//   // --- Calculations and Grouping ---
//   const groupedEntries = useMemo(() => {
//     return entries.reduce((acc, entry) => {
//       if (!entry.date) return acc;
//       try {
//         const date = parseISO(entry.date);
//         if (isNaN(date.getTime())) return acc;
//         const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
//         if (!acc[key]) acc[key] = [];
//         acc[key].push(entry);
//       } catch (error) { console.error("Failed to parse date for entry:", entry, error); }
//       return acc;
//     }, {} as Record<string, LedgerEntryItem[]>);
//   }, [entries]);

//   const { totalSales, totalPayments, balanceDue } = useMemo(() => {
//     return entries.reduce((acc, entry) => {
//       if (entry.type === 'debit') acc.totalSales += entry.amount;
//       else acc.totalPayments += entry.amount;
//       acc.balanceDue = acc.totalSales - acc.totalPayments;
//       return acc;
//     }, { totalSales: 0, totalPayments: 0, balanceDue: 0 });
//   }, [entries]);

//   // --- Handlers ---
//  const handleAddPayment = async () => {
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

// // src/components/BuyerLedgerPage.tsx

//   const generatePdf = () => {
//     const doc = new jsPDF();
//     const title = `Ledger Statement for ${selectedBuyerName}`;
//     const dateStr = `Period: ${format(dateRange?.from || new Date(), 'dd/MM/yy')} - ${format(dateRange?.to || new Date(), 'dd/MM/yy')}`;
    
//     doc.setFontSize(18);
//     doc.text(title, 14, 22);
//     doc.setFontSize(11);
//     doc.setTextColor(100);
//     doc.text(dateStr, 14, 29);

//     // 1. Prepare the main data rows
//     const tableBody = entries.map(e => [
//         format(parseISO(e.date), 'dd/MM/yyyy'),
//         e.description,
//         e.type === 'debit' ? e.amount.toFixed(2) : '',
//         e.type === 'credit' ? e.amount.toFixed(2) : ''
//     ]);

//     // 2. Prepare the summary rows separately
//     const totalRow = ['', 'Total', totalSales.toFixed(2), totalPayments.toFixed(2)];
//     const balanceDueRow = [{ 
//         content: `Balance Due: ${balanceDue.toFixed(2)}`, 
//         colSpan: 4, 
//         styles: { halign: 'right' } 
//     }];

//     autoTable(doc, {
//         startY: 50,
//         head: [['Date', 'Description', 'Debit (INR)', 'Credit (INR)']],
//         // 3. Combine the main data and the summary rows here
//         body: [
//             ...tableBody,
//             totalRow,
//             balanceDueRow
//         ],
//         theme: 'grid',
//         headStyles: { fillColor: [22, 163, 74] }, // A modern green
        
//         // 4. Use this hook to style ONLY the last two summary rows
//         didParseCell: function (data) {
//             // Check if the current row is one of the last two rows in the entire table
//             if (data.row.index >= tableBody.length) {
//                 data.cell.styles.fontStyle = 'bold';
//             }
//         }
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
//           <CardHeader><CardTitle className="text-lg">Controls</CardTitle><CardDescription>Select a buyer and date range to view their ledger.</CardDescription></CardHeader>
//           <CardContent className="grid md:grid-cols-3 gap-4">
//             <div className="flex flex-col space-y-1.5"><Label htmlFor="buyer-select">Buyer</Label>
//               {loadingBuyers ? <Skeleton className="h-10 w-full" /> : (
//                 <Select onValueChange={setSelectedBuyerName} value={selectedBuyerName ?? undefined}>
//                   <SelectTrigger id="buyer-select"><SelectValue placeholder="Select a buyer..." /></SelectTrigger>
//                   <SelectContent>{buyerGroups.map(group => <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>)}</SelectContent>
//                 </Select>
//               )}
//             </div>
//             <div className="flex flex-col space-y-1.5"><Label>Date Range</Label>
//               <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent></Popover>
//             </div>
//             <div className="flex flex-col space-y-1.5 justify-end"><Button onClick={generatePdf} disabled={!selectedBuyerName || entries.length === 0}><Download className="mr-2 h-4 w-4" /> Download PDF</Button></div>
//           </CardContent>
//         </Card>

//         {selectedBuyerName && (
//           <>
//             <div className="grid gap-4 md:grid-cols-3">
//               <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Sales (Debit)</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div><p className="text-xs text-muted-foreground">for loaded entries</p></CardContent></Card>
//               <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Payments Received (Credit)</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalPayments.toFixed(2)}</div><p className="text-xs text-muted-foreground">for loaded entries</p></CardContent></Card>
//               <Card className={balanceDue > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Balance Due</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{balanceDue.toFixed(2)}</div><p className="text-xs text-muted-foreground">{balanceDue > 0 ? 'Amount to be received' : 'Amount paid in excess'}</p></CardContent></Card>
//             </div>
            
//             <div className="flex justify-end"><Dialog open={showForm} onOpenChange={setShowForm}><DialogTrigger asChild><Button><Plus size={16} className="mr-2"/> Add Payment</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add Payment from {selectedBuyerName}</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="₹0.00" /></div><div><Label htmlFor="description">Description</Label><Input id="description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., UPI Payment Ref #123" /></div></div><Button onClick={handleAddPayment} disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Payment</Button></DialogContent></Dialog></div>

//             {loadingEntries ? (<div className="space-y-4"><Skeleton className="h-8 w-1/4" />{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
//             ) : entries.length > 0 ? (
//               <div className="space-y-6">
//                 {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
//                   <div key={dateGroup}>
//                     <h2 className="text-lg font-semibold my-3 px-1">{dateGroup}</h2>
//                     <div className="space-y-3">{entriesInGroup.map((entry, index) => (
//                       <Card key={entry.id} ref={index === entries.length - 1 ? lastEntryRef : null}><CardContent className="p-4 grid grid-cols-[auto,1fr,auto] items-center gap-4">
//                         <div className={`p-2 rounded-full bg-muted ${entry.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>{entry.type === 'debit' ? <ArrowUpRight size={20} /> : <HandCoins size={20} />}</div>
//                         <div><p className="font-semibold line-clamp-1">{entry.description}</p><p className="text-sm text-muted-foreground">{entry.type === 'debit' ? "Sale" : "Payment Received"}</p></div>
//                         <div className={`text-right font-bold text-lg ${entry.type === 'debit' ? 'text-red-500' : 'text-green-600'}`}>{entry.type === 'credit' ? '+' : ''}₹{entry.amount.toFixed(2)}</div>
//                       </CardContent></Card>
//                     ))}</div>
//                   </div>
//                 ))}
//                 {isFetchingMore && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
//               </div>
//             ) : ( <Card className="text-center p-12 border-dashed"><h3 className="text-xl font-semibold">No Transactions Found</h3><p className="text-muted-foreground mt-2">No records for {selectedBuyerName} in this date range.</p></Card> )}
//           </>
//         )}
//       </div>
//     </DashboardLayout>
//   );
// };

// export default BuyerLedgerPage;



// "use client";
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
// import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, HandCoins, Calendar as CalendarIcon, Download, FileText, User, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
// import { supabase } from '../../../lib/supabase';
// import { DashboardLayout } from '@/components/dashboard-layout';
// import { useUserId } from '@/hooks/context/UserContext';
// import { DateRange } from 'react-day-picker';
// import { Calendar } from '@/components/ui/calendar';
// import { format, isToday, isYesterday, parseISO, startOfMonth } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { motion, AnimatePresence } from 'framer-motion';

// // --- Interfaces ---
// interface LedgerEntryItem {
//   id: string | number;
//   type: 'debit' | 'credit';
//   amount: number;
//   description: string;
//   tags: string[];
//   date: string;
// }

// interface BuyerGroup {
//   name: string;
//   ids: (string | number)[];
// }

// // --- Constants ---
// const PAGE_SIZE = 30;

// // --- Animation Variants ---
// const containerVariants = {
//   hidden: { opacity: 0 },
//   show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 20 },
//   show: { opacity: 1, y: 0, transition: { duration: 0.4, type: "spring", stiffness: 100 } }
// };

// // --- Stat Card Component ---
// const StatCard = ({ title, value, icon: Icon, colorClass, description, trend }) => (
//   <motion.div variants={itemVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
//     <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
//       <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${colorClass.replace('text-', 'bg-')}`} />
//       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
//         <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
//         <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClass.includes('red') ? 'from-red-500/20 to-red-500/10' : colorClass.includes('green') ? 'from-green-500/20 to-green-500/10' : 'from-primary/20 to-primary/10'}`}>
//           <Icon className={`h-5 w-5 ${colorClass}`} />
//         </div>
//       </CardHeader>
//       <CardContent>
//         <div className="text-3xl font-bold tracking-tight">₹{value.toLocaleString('en-IN')}</div>
//         <div className="flex items-center justify-between mt-2">
//           <p className="text-xs text-muted-foreground">{description}</p>
//           {trend && (
//             <Badge variant="secondary" className={colorClass.includes('red') ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}>
//               {trend}
//             </Badge>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   </motion.div>
// );

// // --- Transaction Item Component ---
// const TransactionItem = ({ entry, isLast, lastEntryRef }) => (
//   <motion.div
//     variants={itemVariants}
//     ref={isLast ? lastEntryRef : null}
//     whileHover={{ scale: 1.01, x: 4 }}
//     className="cursor-pointer"
//   >
//     <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-lg hover:border-border transition-all duration-300 group">
//       <CardContent className="p-5 flex items-center gap-4">
//         <motion.div
//           whileHover={{ rotate: 360, scale: 1.1 }}
//           transition={{ duration: 0.5 }}
//           className={`p-3 rounded-2xl flex-shrink-0 shadow-lg ${
//             entry.type === 'debit'
//               ? 'bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/20 text-red-600 shadow-red-500/20'
//               : 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/20 text-green-600 shadow-green-500/20'
//           }`}
//         >
//           {entry.type === 'debit' ? <ArrowUpRight size={20} /> : <HandCoins size={20} />}
//         </motion.div>

//         <div className="flex-grow min-w-0">
//           <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">{entry.description}</p>
//           <div className="flex items-center gap-2 mt-1">
//             <Badge variant="secondary" className="text-xs bg-muted/60">
//               {entry.type === 'debit' ? 'Sale' : 'Payment Received'}
//             </Badge>
//             <span className="text-xs text-muted-foreground">
//               {format(parseISO(entry.date), 'h:mm a')}
//             </span>
//           </div>
//         </div>

//         <div className="text-right flex-shrink-0">
//           <div className={`text-2xl font-bold ${entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
//             {entry.type === 'credit' ? '+' : ''}₹{entry.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   </motion.div>
// );

// // --- Main Component ---
// const BuyerLedgerPage: React.FC = () => {
//   const { userId } = useUserId();

//   const [buyerGroups, setBuyerGroups] = useState<BuyerGroup[]>([]);
//   const [selectedBuyerName, setSelectedBuyerName] = useState<string | null>(null);
  
//   const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
//   const [page, setPage] = useState(0);
//   const [hasMore, setHasMore] = useState(true);
  
//   const [dateRange, setDateRange] = useState<DateRange | undefined>({
//     from: startOfMonth(new Date()),
//     to: new Date(),
//   });

//   const [loadingBuyers, setLoadingBuyers] = useState(true);
//   const [loadingEntries, setLoadingEntries] = useState(false);
//   const [isFetchingMore, setIsFetchingMore] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
  
//   const [showForm, setShowForm] = useState(false);
//   const [newEntry, setNewEntry] = useState({ amount: '', description: '' });

//   const observer = useRef<IntersectionObserver>();
//   const lastEntryRef = useCallback((node: HTMLDivElement) => {
//     if (loadingEntries || isFetchingMore) return;
//     if (observer.current) observer.current.disconnect();
//     observer.current = new IntersectionObserver(observerEntries => {
//       if (observerEntries[0].isIntersecting && hasMore) {
//         setPage(prevPage => prevPage + 1);
//       }
//     });
//     if (node) observer.current.observe(node);
//   }, [loadingEntries, isFetchingMore, hasMore]);

//   useEffect(() => {
//     const fetchAndGroupBuyers = async () => {
//       if (!userId) return;
//       setLoadingBuyers(true);
//       const { data, error } = await supabase.from('buyers_record').select('id, name').eq('user_id', userId);

//       if (error) {
//         console.error('Error fetching buyers:', error);
//       } else if (data) {
//         const buyerGroupMap = new Map<string, BuyerGroup>();
//         data.forEach(buyer => {
//           if (buyer && buyer.name) {
//             if (!buyerGroupMap.has(buyer.name)) {
//               buyerGroupMap.set(buyer.name, { name: buyer.name, ids: [] });
//             }
//             buyerGroupMap.get(buyer.name)!.ids.push(buyer.id);
//           }
//         });
//         const uniqueBuyerGroups = Array.from(buyerGroupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
//         setBuyerGroups(uniqueBuyerGroups);
//       }
//       setLoadingBuyers(false);
//     };
//     fetchAndGroupBuyers();
//   }, [userId]);

//   useEffect(() => {
//     setEntries([]);
//     setPage(0);
//     setHasMore(true);
//   }, [selectedBuyerName, dateRange]);

//   useEffect(() => {
//     if (!userId || !selectedBuyerName || !hasMore) return;

//     const fetchEntries = async () => {
//       if (page === 0) setLoadingEntries(true);
//       else setIsFetchingMore(true);

//       const selectedGroup = buyerGroups.find(b => b.name === selectedBuyerName);
//       if (!selectedGroup) {
//         setLoadingEntries(false);
//         setIsFetchingMore(false);
//         return;
//       }

//       const buyerIds = selectedGroup.ids;
//       const rangeFrom = page * PAGE_SIZE;
//       const rangeTo = rangeFrom + PAGE_SIZE - 1;

//       const [invoiceRes, manualRes] = await Promise.all([
//         supabase
//           .from('invoices_record')
//           .select(`id, number, date, items_record(quantity, rate, gst_rate)`)
//           .in('buyer_id', buyerIds)
//           .gte('date', dateRange?.from?.toISOString() || '1970-01-01')
//           .lte('date', dateRange?.to?.toISOString() || new Date().toISOString())
//           .order('date', { ascending: false })
//           .range(rangeFrom, rangeTo),
//         supabase
//           .from('ledger_entries')
//           .select(`id, type, amount, description, tags, created_at`)
//           .eq('user_id', userId)
//           .eq('type', 'credit')
//           .contains('tags', [selectedGroup.name])
//           .gte('created_at', dateRange?.from?.toISOString() || '1970-01-01')
//           .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
//           .order('created_at', { ascending: false })
//           .range(rangeFrom, rangeTo)
//       ]);

//       const invoiceEntries: LedgerEntryItem[] = (invoiceRes.data || []).map((invoice: any) => {
//         const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => {
//             const rate = Number(item.rate) || 0;
//             const quantity = Number(item.quantity) || 0;
//             const gst_rate = Number(item.gst_rate) || 0;
//             const taxableAmount = rate * quantity;
//             return sum + taxableAmount * (1 + (gst_rate / 100));
//         }, 0);
//         return { id: `inv-${invoice.id}`, type: 'debit', amount: totalAmount, description: `Invoice #${invoice.number}`, tags: [selectedGroup.name], date: invoice.date };
//       });
      
//       const formattedManualEntries: LedgerEntryItem[] = (manualRes.data || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

//       const combinedNewEntries = [...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
//       setEntries(prev => page === 0 ? combinedNewEntries : [...prev, ...combinedNewEntries]);
//       setHasMore(combinedNewEntries.length > 0);

//       if (page === 0) setLoadingEntries(false);
//       else setIsFetchingMore(false);
//     };
    
//     fetchEntries();
//   }, [userId, selectedBuyerName, buyerGroups, page, dateRange, hasMore]);

//   const groupedEntries = useMemo(() => {
//     return entries.reduce((acc, entry) => {
//       if (!entry.date) return acc;
//       try {
//         const date = parseISO(entry.date);
//         if (isNaN(date.getTime())) return acc;
//         const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
//         if (!acc[key]) acc[key] = [];
//         acc[key].push(entry);
//       } catch (error) { console.error("Failed to parse date for entry:", entry, error); }
//       return acc;
//     }, {} as Record<string, LedgerEntryItem[]>);
//   }, [entries]);

//   const { totalSales, totalPayments, balanceDue } = useMemo(() => {
//     return entries.reduce((acc, entry) => {
//       if (entry.type === 'debit') acc.totalSales += entry.amount;
//       else acc.totalPayments += entry.amount;
//       acc.balanceDue = acc.totalSales - acc.totalPayments;
//       return acc;
//     }, { totalSales: 0, totalPayments: 0, balanceDue: 0 });
//   }, [entries]);

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
//     const doc = new jsPDF();
//     const title = `Ledger Statement for ${selectedBuyerName}`;
//     const dateStr = `Period: ${format(dateRange?.from || new Date(), 'dd/MM/yy')} - ${format(dateRange?.to || new Date(), 'dd/MM/yy')}`;
    
//     doc.setFontSize(18);
//     doc.text(title, 14, 22);
//     doc.setFontSize(11);
//     doc.setTextColor(100);
//     doc.text(dateStr, 14, 29);

//     const tableBody = entries.map(e => [
//         format(parseISO(e.date), 'dd/MM/yyyy'),
//         e.description,
//         e.type === 'debit' ? e.amount.toFixed(2) : '',
//         e.type === 'credit' ? e.amount.toFixed(2) : ''
//     ]);

//     const totalRow = ['', 'Total', totalSales.toFixed(2), totalPayments.toFixed(2)];
//     const balanceDueRow = [{ 
//         content: `Balance Due: ${balanceDue.toFixed(2)}`, 
//         colSpan: 4, 
//         styles: { halign: 'right' } 
//     }];

//     autoTable(doc, {
//         startY: 50,
//         head: [['Date', 'Description', 'Debit (INR)', 'Credit (INR)']],
//         body: [...tableBody, totalRow, balanceDueRow],
//         theme: 'grid',
//         headStyles: { fillColor: [22, 163, 74] },
//         didParseCell: function (data) {
//             if (data.row.index >= tableBody.length) {
//                 data.cell.styles.fontStyle = 'bold';
//             }
//         }
//     });

//     doc.save(`Ledger_${selectedBuyerName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
//   };

//   return (
//     <DashboardLayout>
//       <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
//         {/* Header */}
//         <motion.header
//           initial={{ opacity: 0, y: -20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//         >
//           <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
//             Buyer Ledger
//           </h1>
//           <p className="text-muted-foreground mt-2 text-lg">Track sales and payments for individual buyers with precision</p>
//         </motion.header>

//         {/* Controls Card */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5, delay: 0.1 }}
//         >
//           <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
//             <CardHeader>
//               <CardTitle className="text-xl flex items-center gap-2">
//                 <Sparkles className="h-5 w-5 text-primary" />
//                 Ledger Controls
//               </CardTitle>
//               <CardDescription>Select a buyer and date range to view their complete transaction history</CardDescription>
//             </CardHeader>
//             <CardContent className="grid md:grid-cols-3 gap-4">
//               <div className="flex flex-col space-y-2">
//                 <Label htmlFor="buyer-select" className="text-sm font-semibold flex items-center gap-2">
//                   <User className="h-4 w-4" />
//                   Buyer
//                 </Label>
//                 {loadingBuyers ? (
//                   <Skeleton className="h-11 w-full rounded-lg" />
//                 ) : (
//                   <Select onValueChange={setSelectedBuyerName} value={selectedBuyerName ?? undefined}>
//                     <SelectTrigger id="buyer-select" className="h-11 border-border/50 bg-background/50 backdrop-blur-sm">
//                       <SelectValue placeholder="Select a buyer..." />
//                     </SelectTrigger>
//                     <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
//                       {buyerGroups.map(group => (
//                         <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 )}
//               </div>

//               <div className="flex flex-col space-y-2">
//                 <Label className="text-sm font-semibold flex items-center gap-2">
//                   <CalendarIcon className="h-4 w-4" />
//                   Date Range
//                 </Label>
//                 <Popover>
//                   <PopoverTrigger asChild>
//                     <Button variant="outline" className="h-11 justify-start text-left font-normal border-border/50 bg-background/50 backdrop-blur-sm">
//                       <CalendarIcon className="mr-2 h-4 w-4" />
//                       {dateRange?.from ? (
//                         dateRange.to
//                           ? `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}`
//                           : format(dateRange.from, "LLL dd, y")
//                       ) : <span>Pick a date</span>}
//                     </Button>
//                   </PopoverTrigger>
//                   <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl border-border/50" align="start">
//                     <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
//                   </PopoverContent>
//                 </Popover>
//               </div>

//               <div className="flex flex-col space-y-2 justify-end">
//                 <Button
//                   onClick={generatePdf}
//                   disabled={!selectedBuyerName || entries.length === 0}
//                   className="h-11 bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
//                 >
//                   <Download className="mr-2 h-4 w-4" /> Download PDF
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         </motion.div>

//         {selectedBuyerName && (
//           <>
//             {/* Stats Cards */}
//             <motion.div
//               className="grid gap-4 md:grid-cols-3"
//               variants={containerVariants}
//               initial="hidden"
//               animate="show"
//             >
//               <StatCard
//                 title="Total Sales (Debit)"
//                 value={totalSales}
//                 icon={TrendingUp}
//                 colorClass="text-red-500"
//                 description="Total amount billed"
//                 trend={null}
//               />
//               <StatCard
//                 title="Payments Received (Credit)"
//                 value={totalPayments}
//                 icon={TrendingDown}
//                 colorClass="text-green-600"
//                 description="Total amount collected"
//                 trend={null}
//               />
//               <motion.div variants={itemVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
//                 <Card className={`relative overflow-hidden h-full border-border/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ${
//                   balanceDue > 0
//                     ? "bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10"
//                     : "bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10"
//                 }`}>
//                   <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${balanceDue > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
//                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
//                     <CardTitle className="text-sm font-medium text-muted-foreground">Balance Due</CardTitle>
//                     <div className={`p-2.5 rounded-xl ${balanceDue > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
//                       <FileText className={`h-5 w-5 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`} />
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <div className={`text-3xl font-bold tracking-tight ${balanceDue > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
//                       ₹{Math.abs(balanceDue).toLocaleString('en-IN')}
//                     </div>
//                     <p className="text-xs text-muted-foreground mt-2">
//                       {balanceDue > 0 ? 'Amount to be received' : 'Overpayment / Advance'}
//                     </p>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             </motion.div>

//             {/* Add Payment Button */}
//             <motion.div
//               className="flex justify-end"
//               initial={{ opacity: 0, x: 20 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ duration: 0.5, delay: 0.3 }}
//             >
//               <Dialog open={showForm} onOpenChange={setShowForm}>
//                 <DialogTrigger asChild>
//                   <Button className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300">
//                     <Plus size={16} className="mr-2" />
//                     Add Payment
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50">
//                   <DialogHeader>
//                     <DialogTitle className="text-2xl font-bold flex items-center gap-2">
//                       <HandCoins className="h-5 w-5 text-green-500" />
//                       Add Payment from {selectedBuyerName}
//                     </DialogTitle>
//                   </DialogHeader>
//                   <div className="grid gap-5 py-4">
//                     <div className="space-y-2">
//                       <Label htmlFor="amount" className="text-sm font-semibold">Amount</Label>
//                       <Input
//                         id="amount"
//                         type="number"
//                         value={newEntry.amount}
//                         onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })}
//                         placeholder="₹0.00"
//                         className="h-11 text-lg"
//                       />
//                     </div>
//                     <div className="space-y-2">
//                       <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
//                       <Input
//                         id="description"
//                         value={newEntry.description}
//                         onChange={e => setNewEntry({ ...newEntry, description: e.target.value })}
//                         placeholder="e.g., UPI Payment Ref #123"
//                         className="h-11"
//                       />
//                     </div>
//                   </div>
//                   <Button
//                     onClick={handleAddPayment}
//                     disabled={isSubmitting || !newEntry.amount || !newEntry.description}
//                     className="w-full h-11 bg-gradient-to-r from-green-600 to-green-500 hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300"
//                   >
//                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//                     {isSubmitting ? 'Saving Payment...' : 'Save Payment'}
//                   </Button>
//                 </DialogContent>
//               </Dialog>
//             </motion.div>

//             {/* Transactions List */}
//             {loadingEntries ? (
//               <div className="space-y-4 pt-4">
//                 {Array.from({ length: 5 }).map((_, i) => (
//                   <Skeleton key={i} className="h-24 w-full rounded-2xl" />
//                 ))}
//               </div>
//             ) : entries.length > 0 ? (
//               <motion.div
//                 className="space-y-6"
//                 variants={containerVariants}
//                 initial="hidden"
//                 animate="show"
//               >
//                 <AnimatePresence mode="popLayout">
//                   {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
//                     <motion.div key={dateGroup} variants={itemVariants}>
//                       <div className="flex items-center gap-3 mb-4">
//                         <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
//                           {dateGroup}
//                         </h2>
//                         <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
//                         <Badge variant="secondary" className="text-xs">
//                           {entriesInGroup.length} {entriesInGroup.length === 1 ? 'transaction' : 'transactions'}
//                         </Badge>
//                       </div>
//                       <div className="space-y-3">
//                         {entriesInGroup.map((entry, index) => (
//                           <TransactionItem
//                             key={entry.id}
//                             entry={entry}
//                             isLast={index === entries.length - 1}
//                             lastEntryRef={lastEntryRef}
//                           />
//                         ))}
//                       </div>
//                     </motion.div>
//                   ))}
//                 </AnimatePresence>

//                 {isFetchingMore && (
//                   <div className="flex justify-center py-6">
//                     <div className="flex items-center gap-3 text-muted-foreground">
//                       <Loader2 className="h-6 w-6 animate-spin" />
//                       <span className="text-sm font-medium">Loading more transactions...</span>
//                     </div>
//                   </div>
//                 )}
//               </motion.div>
//             ) : (
//               <motion.div
//                 initial={{ opacity: 0, scale: 0.95 }}
//                 animate={{ opacity: 1, scale: 1 }}
//               >
//                 <Card className="text-center p-16 border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/20 to-transparent">
//                   <div className="p-4 rounded-full bg-muted/30 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
//                     <FileText className="h-10 w-10 text-muted-foreground/50" />
//                   </div>
//                   <h3 className="text-2xl font-bold mb-2">No Transactions Found</h3>
//                   <p className="text-muted-foreground text-lg">
//                     No records found for {selectedBuyerName} in this date range
//                   </p>
//                   <p className="text-sm text-muted-foreground mt-2">
//                     Try adjusting the date range or add a new payment
//                   </p>
//                 </Card>
//               </motion.div>
//             )}
//           </>
//         )}

//         {!selectedBuyerName && !loadingBuyers && (
//           <motion.div
//             initial={{ opacity: 0, scale: 0.95 }}
//             animate={{ opacity: 1, scale: 1 }}
//             transition={{ delay: 0.3 }}
//           >
//             <Card className="text-center p-16 border-dashed border-2 border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
//               <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
//                 <User className="h-10 w-10 text-primary/50" />
//               </div>
//               <h3 className="text-2xl font-bold mb-2">Select a Buyer</h3>
//               <p className="text-muted-foreground text-lg">
//                 Choose a buyer from the dropdown above to view their ledger
//               </p>
//             </Card>
//           </motion.div>
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, Plus, ArrowUpRight, ArrowDownLeft, HandCoins, Calendar as CalendarIcon, 
  Download, FileText, User, Sparkles, TrendingUp, TrendingDown, Filter, Receipt, Clock, Tag, ChevronRight 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isYesterday, parseISO, startOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
interface LedgerEntryItem {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  tags: string[];
  date: string;
  referenceId?: string; // To link back to invoice
}

interface BuyerGroup {
  name: string;
  ids: (string | number)[];
}

// --- Constants ---
const PAGE_SIZE = 30;

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

// --- Reusable Sub-Components ---
const StatCard = ({ title, value, icon: Icon, colorClass, trend }: any) => (
    <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 group w-full">
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${colorClass.includes('green') ? 'from-emerald-500/20' : 'from-red-500/20'} to-transparent blur-2xl transition-all group-hover:scale-110`} />
        <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-2.5 rounded-xl ${colorClass.includes('green') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                {trend && (
                    <Badge variant="outline" className={`text-[10px] sm:text-xs px-1.5 py-0.5 ${colorClass.includes('green') ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                        {trend}
                    </Badge>
                )}
            </div>
            <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{title}</p>
                {/* Responsive Text Size */}
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                    ₹{value.toLocaleString('en-IN')}
                </h3>
            </div>
        </CardContent>
    </Card>
);

const TransactionItem = ({ entry, onClick, isLast, lastEntryRef }: { entry: LedgerEntryItem, onClick: (e: LedgerEntryItem) => void, isLast?: boolean, lastEntryRef?: any }) => (
  <motion.div
    variants={itemVariants}
    ref={isLast ? lastEntryRef : null}
    onClick={() => onClick(entry)}
    className="group relative flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer active:scale-[0.98] w-full overflow-hidden"
  >
     {/* Icon Box */}
     <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-colors ${
        entry.type === 'debit' 
            ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
    }`}>
        {entry.type === 'debit' ? <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6" /> : <HandCoins className="h-5 w-5 sm:h-6 sm:w-6" />}
    </div>

    {/* Content - min-w-0 is crucial for flex containers on mobile to allow truncation */}
    <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                {entry.description}
            </p>
            <span className={`text-sm sm:text-base font-bold whitespace-nowrap shrink-0 ${
                entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
                {entry.type === 'credit' ? '+' : ''}₹{entry.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 overflow-hidden h-5 sm:h-auto min-w-0">
                {entry.type === 'debit' ? (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 h-5 bg-red-50 text-red-700 border-red-100 truncate">Sale</Badge>
                ) : (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 h-5 bg-emerald-50 text-emerald-700 border-emerald-100 truncate">Received</Badge>
                )}
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline-block truncate max-w-[100px]">
                   {entry.tags.join(', ')}
                </span>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                {format(parseISO(entry.date), 'h:mm a')}
            </span>
        </div>
    </div>
    
    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors hidden sm:block shrink-0" />
  </motion.div>
);

// --- Main Component ---
const BuyerLedgerPage: React.FC = () => {
  const { userId } = useUserId();
  const router = useRouter();

  const [buyerGroups, setBuyerGroups] = useState<BuyerGroup[]>([]);
  const [selectedBuyerName, setSelectedBuyerName] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntryItem | null>(null);
  
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

  useEffect(() => {
    setEntries([]);
    setPage(0);
    setHasMore(true);
  }, [selectedBuyerName, dateRange]);

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
            return sum + (rate * quantity) * (1 + (gst_rate / 100));
        }, 0);
        return { 
            id: `inv-${invoice.id}`, 
            referenceId: invoice.id,
            type: 'debit', 
            amount: totalAmount, 
            description: `Invoice #${invoice.number}`, 
            tags: [selectedGroup.name], 
            date: invoice.date 
        };
      });
      
      const formattedManualEntries: LedgerEntryItem[] = (manualRes.data || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

      const combinedNewEntries = [...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setEntries(prev => page === 0 ? combinedNewEntries : [...prev, ...combinedNewEntries]);
      setHasMore(combinedNewEntries.length > 0);

      if (page === 0) setLoadingEntries(false);
      else setIsFetchingMore(false);
    };
    
    fetchEntries();
  }, [userId, selectedBuyerName, buyerGroups, page, dateRange, hasMore]);

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

  const generatePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`Ledger - ${selectedBuyerName}`, 14, 22);
    const tableBody = entries.map(e => [
        format(parseISO(e.date), 'dd/MM/yyyy'),
        e.description,
        e.type === 'debit' ? e.amount.toFixed(2) : '',
        e.type === 'credit' ? e.amount.toFixed(2) : ''
    ]);
    autoTable(doc, { startY: 30, head: [['Date', 'Desc', 'Debit', 'Credit']], body: tableBody });
    doc.save(`Ledger_${selectedBuyerName}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background/50 pb-24 w-full overflow-x-hidden">
        
        {/* Sticky Controls Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 sm:px-6 lg:px-8 shadow-sm">
           <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3">
               {/* Buyer Select - Full Width on Mobile */}
               <div className="flex-grow">
                 {loadingBuyers ? (
                    <Skeleton className="h-10 w-full rounded-lg" />
                 ) : (
                    <Select onValueChange={setSelectedBuyerName} value={selectedBuyerName ?? undefined}>
                        <SelectTrigger className="h-10 w-full border-border/50 bg-background/50 backdrop-blur-sm focus:ring-primary/20">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Select a Buyer" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {buyerGroups.map(group => <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 )}
               </div>

               {/* Date & Download - Flex row on mobile */}
               <div className="flex gap-2 shrink-0">
                   <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1 sm:flex-none h-10 border-dashed text-xs sm:text-sm px-3">
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {dateRange?.from ? "Filtered" : "Date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={1} />
                        </PopoverContent>
                   </Popover>
                   
                   <Button 
                     onClick={generatePdf} 
                     disabled={!selectedBuyerName || entries.length === 0} 
                     variant="outline" 
                     size="icon"
                     className="h-10 w-10"
                   >
                      <Download className="h-4 w-4" />
                   </Button>
               </div>
           </div>
        </div>

        <div className="p-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 mt-4">
            
            {selectedBuyerName ? (
             <>
                {/* Stats Overview */}
                <motion.div 
                    className="grid gap-3 grid-cols-1 sm:grid-cols-3" 
                    variants={containerVariants} 
                    initial="hidden" 
                    animate="show"
                >
                    <StatCard 
                        title="Sales (Debit)" 
                        value={totalSales} 
                        icon={TrendingUp} 
                        colorClass="text-red-500" 
                        trend="Billed"
                    />
                    <StatCard 
                        title="Received (Credit)" 
                        value={totalPayments} 
                        icon={HandCoins} 
                        colorClass="text-emerald-500" 
                        trend="Collected"
                    />
                    <Card className={`relative overflow-hidden border-border/60 shadow-sm w-full ${balanceDue > 0 ? 'bg-red-500/5 border-red-200/50' : 'bg-emerald-500/5 border-emerald-200/50'}`}>
                        <CardContent className="p-4 flex flex-col justify-center h-full">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Balance Due</p>
                            <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight truncate ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                ₹{Math.abs(balanceDue).toLocaleString('en-IN')}
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-1">{balanceDue > 0 ? 'To Receive' : 'Advance/Clear'}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* List */}
                {loadingEntries ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                    </div>
                ) : entries.length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
                            <motion.div key={dateGroup} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 ml-1">{dateGroup}</h3>
                                <div className="space-y-2 sm:space-y-3">
                                    {entriesInGroup.map((entry, index) => (
                                        <TransactionItem 
                                            key={entry.id} 
                                            entry={entry} 
                                            onClick={setSelectedEntry}
                                            isLast={index === entries.length - 1}
                                            lastEntryRef={lastEntryRef}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                        {isFetchingMore && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p className="text-sm">No transactions found for this period.</p>
                    </div>
                )}
             </>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                     <div className="bg-muted/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <User className="h-8 w-8 opacity-40" />
                     </div>
                     <h3 className="text-lg font-semibold">Select a Buyer</h3>
                     <p className="text-sm text-muted-foreground mt-1">Choose a buyer from the top menu to view their ledger.</p>
                </motion.div>
            )}
        </div>

        {/* Floating Add Payment Button (Only if buyer selected) */}
        {selectedBuyerName && (
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="fixed bottom-6 right-6 h-12 w-12 sm:h-14 sm:w-14 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/25 flex items-center justify-center z-50"
                    >
                        <Plus className="h-6 w-6" />
                    </motion.button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                        <DialogDescription>Record a payment from {selectedBuyerName}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                            <Input className="pl-7 text-lg font-semibold h-11" placeholder="0.00" type="number" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} />
                        </div>
                        <Input className="h-11" placeholder="Description (e.g. UPI/Cash)" value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddPayment} disabled={isSubmitting || !newEntry.amount} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700">
                            {isSubmitting ? 'Saving...' : 'Save Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {/* Transaction Details Modal */}
        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
            <DialogContent className="sm:max-w-[400px] w-[90vw] p-0 overflow-hidden rounded-2xl">
                {selectedEntry && (
                    <>
                        <div className={`p-6 text-center ${selectedEntry.type === 'debit' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                            <div className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center mb-3 shadow-sm ${selectedEntry.type === 'debit' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {selectedEntry.type === 'debit' ? <ArrowUpRight className="h-7 w-7" /> : <HandCoins className="h-7 w-7" />}
                            </div>
                            <h2 className={`text-3xl font-bold ${selectedEntry.type === 'debit' ? 'text-red-700' : 'text-emerald-700'}`}>
                                {selectedEntry.type === 'credit' ? '+' : ''}₹{selectedEntry.amount.toLocaleString('en-IN')}
                            </h2>
                            <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">{selectedEntry.type === 'debit' ? 'Invoice' : 'Payment'}</p>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Description</Label>
                                <p className="font-medium text-lg leading-snug">{selectedEntry.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 font-bold"><Clock className="h-3 w-3" /> Date</Label>
                                    <p className="text-sm font-medium">{format(parseISO(selectedEntry.date), 'PPP')}</p>
                                </div>
                            </div>
                            
                            {/* Link to Invoice */}
                            {selectedEntry.id.startsWith('inv-') && selectedEntry.referenceId && (
                                <Button 
                                    className="w-full gap-2 h-11 shadow-lg shadow-primary/10" 
                                    variant="outline"
                                    onClick={() => router.push(`/dashboard/invoices/edit/${selectedEntry.referenceId}`)}
                                >
                                    <Receipt className="h-4 w-4" /> View Invoice
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
};

export default BuyerLedgerPage;