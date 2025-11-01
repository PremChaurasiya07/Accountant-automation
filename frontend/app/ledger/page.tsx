// "use client";
// import React, { useState, useEffect, useMemo } from 'react';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Label } from '@/components/ui/label';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar as CalendarIcon, Download, FileText, X } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
// import { DashboardLayout } from '@/components/dashboard-layout';
// import { useUserId } from '@/hooks/context/UserContext';
// import { DateRange } from 'react-day-picker';
// import { Calendar } from '@/components/ui/calendar';
// import { format, isToday, isYesterday, parseISO } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

// // --- Interfaces (Unchanged) ---
// interface LedgerEntryItem {
//   id: string | number;
//   type: 'debit' | 'credit';
//   amount: number;
//   description: string;
//   tags: string[];
//   date: string; // ISO 8601 string
// }

// const GeneralLedgerPage: React.FC = () => {
//   const { userId } = useUserId();

//   // --- State Management ---
//   const [allEntries, setAllEntries] = useState<LedgerEntryItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [showForm, setShowForm] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
//   const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
//   const [newEntry, setNewEntry] = useState({ type: 'credit' as 'credit' | 'debit', amount: '', description: '', tags: [] as string[] });
//   const [tagInput, setTagInput] = useState('');
  
//   // ✅ NEW: State to track mobile view for calendar
//   const [isMobile, setIsMobile] = useState(false);

//   // ✅ NEW: Effect to detect screen size
//   useEffect(() => {
//     const checkScreenSize = () => {
//       setIsMobile(window.innerWidth < 768); // Tailwind's 'md' breakpoint
//     };
//     // Initial check
//     checkScreenSize();
//     // Listen for resize events
//     window.addEventListener('resize', checkScreenSize);
//     // Cleanup listener on component unmount
//     return () => window.removeEventListener('resize', checkScreenSize);
//   }, []);


//   // --- Data Fetching ---
//   useEffect(() => {
//     const fetchEntries = async () => {
//       if (!userId) return;
//       setLoading(true);

//       let invoiceQuery = supabase
//         .from('invoices_record')
//         .select(`id, number, date, buyers_record(name), items_record(rate, quantity, gst_rate)`)
//         .eq('user_id', userId);
      
//       if (dateRange?.from) invoiceQuery = invoiceQuery.gte('date', dateRange.from.toISOString());
//       if (dateRange?.to) invoiceQuery = invoiceQuery.lte('date', dateRange.to.toISOString());

//       const { data: invoiceData, error: invoiceError } = await invoiceQuery;
//       if (invoiceError) console.error('Error fetching invoice debits:', invoiceError);

//       const invoiceEntries: LedgerEntryItem[] = (invoiceData || []).map((invoice: any) => {
//         const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => {
//             const rate = Number(item.rate) || 0;
//             const quantity = Number(item.quantity) || 0;
//             const gst_rate = Number(item.gst_rate) || 0;
//             const taxableAmount = rate * quantity;
//             return sum + taxableAmount * (1 + (gst_rate / 100));
//         }, 0);
//         return { 
//             id: `inv-${invoice.id}`, 
//             type: 'debit', 
//             amount: totalAmount, 
//             description: `#${invoice.number}`, 
//             tags: [invoice.buyers_record?.name || 'Unknown Buyer'], 
//             date: invoice.date 
//         };
//       });

//       let manualQuery = supabase.from('ledger_entries').select(`id, type, amount, description, tags, created_at`).eq('user_id', userId);
//       if (dateRange?.from) manualQuery = manualQuery.gte('created_at', dateRange.from.toISOString());
//       if (dateRange?.to) manualQuery = manualQuery.lte('created_at', dateRange.to.toISOString());

//       const { data: manualEntries, error: manualError } = await manualQuery;
//       if (manualError) console.error('Error fetching manual entries:', manualError);
//       const formattedManualEntries: LedgerEntryItem[] = (manualEntries || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

//       setAllEntries([...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
//       setLoading(false);
//     };
//     fetchEntries();
//   }, [userId, dateRange]);

//   // --- Memoized Filtering and Calculations (Unchanged) ---
//   const filteredEntries = useMemo(() => allEntries.filter(entry => 
//     (filterType === 'all' || entry.type === filterType) &&
//     (searchTerm.trim() === '' || 
//       entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
//       entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
//   ), [allEntries, searchTerm, filterType]);

//   const { totalDebit, totalCredit, netBalance } = useMemo(() => {
//       return filteredEntries.reduce((acc, entry) => {
//           if (entry.type === 'debit') acc.totalDebit += entry.amount;
//           else acc.totalCredit += entry.amount;
//           acc.netBalance = acc.totalCredit - acc.totalDebit;
//           return acc;
//       }, { totalDebit: 0, totalCredit: 0, netBalance: 0 });
//   }, [filteredEntries]);

//   const groupedEntries = useMemo(() => filteredEntries.reduce((acc, entry) => {
//       const date = parseISO(entry.date);
//       const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
//       if (!acc[key]) acc[key] = [];
//       acc[key].push(entry);
//       return acc;
//   }, {} as Record<string, LedgerEntryItem[]>), [filteredEntries]);

//   // --- Handlers (Unchanged) ---
//   const handleAddTag = () => {
//     if (tagInput && !newEntry.tags.includes(tagInput)) {
//       setNewEntry({ ...newEntry, tags: [...newEntry.tags, tagInput] });
//       setTagInput('');
//     }
//   };

//   const handleAddEntry = async () => {
//     if (!newEntry.amount || !newEntry.description) return;
//     setIsSubmitting(true);
//     const { data, error } = await supabase.from('ledger_entries').insert([{ user_id: userId, type: newEntry.type, amount: parseFloat(newEntry.amount), description: newEntry.description, tags: newEntry.tags }]).select().single();
//     if (error) { console.error('Error saving entry:', error); } 
//     else if (data) {
//       const newEntryForState: LedgerEntryItem = { ...data, id: `man-${data.id}`, date: data.created_at };
//       setAllEntries([newEntryForState, ...allEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
//       setShowForm(false);
//       setNewEntry({ type: 'credit', amount: '', description: '', tags: [] });
//     }
//     setIsSubmitting(false);
//   };

//   const generatePdf = () => {
//     const doc = new jsPDF();
//     const title = "General Ledger Statement";
//     const dateStr = dateRange?.from 
//         ? `Period: ${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to || new Date(), 'dd/MM/yy')}` 
//         : "All Transactions";
    
//     doc.setFontSize(18);
//     doc.text(title, 14, 22);
//     doc.setFontSize(11);
//     doc.setTextColor(100);
//     doc.text(dateStr, 14, 29);

//     const tableBody = filteredEntries.map(e => [
//         format(parseISO(e.date), 'dd/MM/yyyy'),
//         e.description,
//         e.tags.join(', '),
//         e.type === 'debit' ? e.amount.toFixed(2) : '',
//         e.type === 'credit' ? e.amount.toFixed(2) : ''
//     ]);

//     const totalRow = ['', '', 'Total', totalDebit.toFixed(2), totalCredit.toFixed(2)];
//     const netBalanceRow = [{ 
//         content: `Net Balance: ${netBalance.toFixed(2)}`, 
//         colSpan: 5, 
//         styles: { halign: 'right' } 
//     }];

//     autoTable(doc, {
//         startY: 50,
//         head: [['Date', 'Description', 'Tags', 'Debit (INR)', 'Credit (INR)']],
//         body: [ ...tableBody, totalRow, netBalanceRow ],
//         theme: 'grid',
//         headStyles: { fillColor: [45, 55, 72] },
//         didParseCell: function (data) {
//             if (data.row.index >= tableBody.length) {
//                 data.cell.styles.fontStyle = 'bold';
//             }
//         }
//     });

//     doc.save(`General_Ledger_${format(new Date(), 'yyyyMMdd')}.pdf`);
//   };

//   return (
//     <DashboardLayout>
//       <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
//         <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//           <div><h1 className="text-3xl font-bold tracking-tight">General Ledger</h1><p className="text-muted-foreground">A complete history of your debits and credits.</p></div>
//           <div className="flex flex-col sm:flex-row items-center gap-2">
//             <Popover>
//               <PopoverTrigger asChild><Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>All Time</span>}</Button></PopoverTrigger>
//               <PopoverContent className="w-auto p-0 flex-col space-y-2" align="end">
//                 <div className="p-2">
//                   {/* ✅ MODIFIED: Calendar now responsive */}
//                   <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={isMobile ? 1 : 2} />
//                 </div>
//                 {dateRange && <Button onClick={() => setDateRange(undefined)} variant="ghost" className="w-full justify-center">Show All Time</Button>}
//               </PopoverContent>
//             </Popover>
//             <Button onClick={generatePdf} disabled={filteredEntries.length === 0} className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" /> PDF</Button>
//           </div>
//         </header>

//         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//           <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Debit (Receivable)</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalDebit.toFixed(2)}</div></CardContent></Card>
//           <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Credit (Received)</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalCredit.toFixed(2)}</div></CardContent></Card>
//           <Card className={`lg:col-span-1 md:col-span-2 ${netBalance < 0 ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}`}>
//             <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
//             <CardContent>
//               <div className={`text-2xl font-bold ${netBalance < 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>₹{Math.abs(netBalance).toFixed(2)}</div>
//               <p className="text-xs text-muted-foreground">{netBalance < 0 ? 'Net amount receivable' : 'Net surplus'}</p>
//             </CardContent>
//           </Card>
//         </div>

//         <Card><CardContent className="p-4 flex flex-col md:flex-row gap-3">
//           <div className="relative flex-grow"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by description or tag..." className="pl-8 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
//           <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Transactions</SelectItem><SelectItem value="debit">Debits Only</SelectItem><SelectItem value="credit">Credits Only</SelectItem></SelectContent></Select>
//         </CardContent></Card>

//         {loading ? <div className="space-y-4 pt-8">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
//         : filteredEntries.length > 0 ? (
//           <div className="space-y-6">
//             {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
//               <div key={dateGroup}>
//                 <h2 className="text-lg font-semibold my-4 px-1">{dateGroup}</h2>
//                 <div className="space-y-3">{entriesInGroup.map(entry => (
//                   <Card key={entry.id} className="hover:shadow-md transition-shadow">
//                     {/* ✅ MODIFIED: This entire CardContent is now responsive */}
//                     <CardContent className="p-4 flex items-start gap-4">
//                       <div className={`p-2 rounded-full flex-shrink-0 ${entry.type === 'debit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
//                         {entry.type === 'debit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
//                       </div>
//                       <div className="flex-grow flex flex-col sm:flex-row sm:justify-between sm:items-start min-w-0">
//                         <div className="min-w-0 pr-4"> {/* Added pr-4 for spacing */}
//                           <p className="font-semibold truncate">{entry.description}</p>
//                           <div className="flex gap-1.5 mt-1.5 flex-wrap">
//                             {entry.tags.map((tag, j) => <Badge key={j} variant="secondary">{tag}</Badge>)}
//                           </div>
//                         </div>
//                         <div className={`text-left sm:text-right font-bold text-lg mt-1 sm:mt-0 flex-shrink-0 ${entry.type === 'debit' ? 'text-red-600' : 'text-green-700'}`}>
//                           {entry.type === 'credit' ? '+' : ''}₹{entry.amount.toFixed(2)}
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}</div>
//               </div>
//             ))}
//           </div>
//         ) : <Card className="text-center p-12 border-dashed"><h3 className="text-xl font-semibold">No Transactions Found</h3><p className="text-muted-foreground mt-2">{allEntries.length > 0 ? "Try adjusting your filters." : "Click '+' to add your first entry."}</p></Card>}
//       </div>

//       <Dialog open={showForm} onOpenChange={setShowForm}>
//         <DialogTrigger asChild><Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg" size="icon"><Plus size={24} /></Button></DialogTrigger>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader><DialogTitle>Add New Ledger Entry</DialogTitle></DialogHeader>
//           <div className="grid gap-4 py-4">
//             <div><Label>Type</Label><Select value={newEntry.type} onValueChange={(value: any) => setNewEntry({ ...newEntry, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credit (Payment Received)</SelectItem><SelectItem value="debit">Debit (Expense)</SelectItem></SelectContent></Select></div>
//             <div><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="₹0.00" /></div>
//             <div><Label htmlFor="description">Description</Label><Input id="description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., Office Supplies" /></div>
//             <div><Label>Tags</Label><div className="flex gap-2"><Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add tag & press Enter" /><Button variant="outline" onClick={handleAddTag}>Add</Button></div><div className="flex gap-2 mt-2 flex-wrap">{newEntry.tags.map((tag, i) => (<Badge key={i} variant="secondary" className="flex items-center gap-1.5">{tag} <X className="h-3 w-3 cursor-pointer" onClick={() => setNewEntry({ ...newEntry, tags: newEntry.tags.filter(t => t !== tag) })} /></Badge>))}</div></div>
//           </div>
//           <Button onClick={handleAddEntry} disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Entry</Button>
//         </DialogContent>
//       </Dialog>
//     </DashboardLayout>
//   );
// };

// export default GeneralLedgerPage;

// "use client";

// import React, { useState, useMemo, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Label } from '@/components/ui/label';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar as CalendarIcon, Download, FileText, X, TrendingUp, TrendingDown } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
// import { DashboardLayout } from '@/components/dashboard-layout';
// import { useUserId } from '@/hooks/context/UserContext';
// import { DateRange } from 'react-day-picker';
// import { Calendar } from '@/components/ui/calendar';
// import { format, isToday, isYesterday, parseISO } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { motion } from 'framer-motion';

// // --- Interfaces ---
// interface LedgerEntryItem {
//     id: string | number;
//     type: 'debit' | 'credit';
//     amount: number;
//     description: string;
//     tags: string[];
//     date: string;
// }

// // --- Animation Variants ---
// const containerVariants = {
//   hidden: { opacity: 0 },
//   show: { opacity: 1, transition: { staggerChildren: 0.05 } }
// };

// const itemVariants = {
//   hidden: { opacity: 0, y: 20 },
//   show: { opacity: 1, y: 0 }
// };

// // --- Reusable Sub-Components ---
// const StatCard = ({ title, value, icon: Icon, colorClass, description }) => (
//     <motion.div variants={itemVariants}>
//         <Card className="shadow-sm hover:shadow-lg transition-shadow duration-300">
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//                 <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
//                 <Icon className={`h-5 w-5 ${colorClass}`} />
//             </CardHeader>
//             <CardContent>
//                 <div className="text-2xl font-bold">₹{value.toLocaleString('en-IN')}</div>
//                 <p className="text-xs text-muted-foreground">{description}</p>
//             </CardContent>
//         </Card>
//     </motion.div>
// );

// // --- RESPONSIVE FIX: Redesigned TransactionItem for all screen sizes ---
// const TransactionItem = ({ entry }: { entry: LedgerEntryItem }) => (
//     <motion.div variants={itemVariants} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
//         <div className={`p-2 rounded-full flex-shrink-0 ${entry.type === 'debit' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-green-100 dark:bg-green-900/30 text-green-700'}`}>
//             {entry.type === 'debit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
//         </div>
//         <div className="flex-grow min-w-0">
//             <p className="font-semibold truncate">{entry.description}</p>
//             <div className="flex gap-1.5 mt-1 flex-wrap">
//                 {entry.tags.slice(0, 3).map((tag, j) => <Badge key={j} variant="secondary">{tag}</Badge>)}
//             </div>
//         </div>
//         <div className={`text-right font-bold text-base ml-auto flex-shrink-0 ${entry.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
//             {entry.type === 'credit' ? '+' : '-'}{entry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
//         </div>
//     </motion.div>
// );

// // --- Main Ledger Component ---
// const GeneralLedgerPage: React.FC = () => {
//     const { userId } = useUserId();
//     const [allEntries, setAllEntries] = useState<LedgerEntryItem[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [showForm, setShowForm] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
//     const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
//     const [newEntry, setNewEntry] = useState({ type: 'credit' as 'credit' | 'debit', amount: '', description: '', tags: [] as string[] });
//     const [tagInput, setTagInput] = useState('');
//     const [isMobile, setIsMobile] = useState(false);

//     useEffect(() => {
//         const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
//         checkScreenSize();
//         window.addEventListener('resize', checkScreenSize);
//         return () => window.removeEventListener('resize', checkScreenSize);
//     }, []);

// useEffect(() => {
//     const fetchEntries = async () => {
//       if (!userId) return;
//       setLoading(true);

//       let invoiceQuery = supabase
//         .from('invoices_record')
//         .select(`id, number, date, buyers_record(name), items_record(rate, quantity, gst_rate)`)
//         .eq('user_id', userId);
      
//       if (dateRange?.from) invoiceQuery = invoiceQuery.gte('date', dateRange.from.toISOString());
//       if (dateRange?.to) invoiceQuery = invoiceQuery.lte('date', dateRange.to.toISOString());

//       const { data: invoiceData, error: invoiceError } = await invoiceQuery;
//       if (invoiceError) console.error('Error fetching invoice debits:', invoiceError);

//       const invoiceEntries: LedgerEntryItem[] = (invoiceData || []).map((invoice: any) => {
//         const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => {
//             const rate = Number(item.rate) || 0;
//             const quantity = Number(item.quantity) || 0;
//             const gst_rate = Number(item.gst_rate) || 0;
//             const taxableAmount = rate * quantity;
//             return sum + taxableAmount * (1 + (gst_rate / 100));
//         }, 0);
//         return { 
//             id: `inv-${invoice.id}`, 
//             type: 'debit', 
//             amount: totalAmount, 
//             description: `#${invoice.number}`, 
//             tags: [invoice.buyers_record?.name || 'Unknown Buyer'], 
//             date: invoice.date 
//         };
//       });

//       let manualQuery = supabase.from('ledger_entries').select(`id, type, amount, description, tags, created_at`).eq('user_id', userId);
//       if (dateRange?.from) manualQuery = manualQuery.gte('created_at', dateRange.from.toISOString());
//       if (dateRange?.to) manualQuery = manualQuery.lte('created_at', dateRange.to.toISOString());

//       const { data: manualEntries, error: manualError } = await manualQuery;
//       if (manualError) console.error('Error fetching manual entries:', manualError);
//       const formattedManualEntries: LedgerEntryItem[] = (manualEntries || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

//       setAllEntries([...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
//       setLoading(false);
//     };
//     fetchEntries();
//   }, [userId, dateRange]);

//   // --- Memoized Filtering and Calculations (Unchanged) ---
//   const filteredEntries = useMemo(() => allEntries.filter(entry => 
//     (filterType === 'all' || entry.type === filterType) &&
//     (searchTerm.trim() === '' || 
//       entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
//       entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
//   ), [allEntries, searchTerm, filterType]);


//     const { totalDebit, totalCredit, netBalance } = useMemo(() => {
//         return filteredEntries.reduce((acc, entry) => {
//             if (entry.type === 'debit') acc.totalDebit += entry.amount;
//             else acc.totalCredit += entry.amount;
//             acc.netBalance = acc.totalCredit - acc.totalDebit;
//             return acc;
//         }, { totalDebit: 0, totalCredit: 0, netBalance: 0 });
//     }, [filteredEntries]);

//     const groupedEntries = useMemo(() => filteredEntries.reduce((acc, entry) => {
//         const date = parseISO(entry.date);
//         const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
//         if (!acc[key]) acc[key] = [];
//         acc[key].push(entry);
//         return acc;
//     }, {} as Record<string, LedgerEntryItem[]>), [filteredEntries]);

//     const handleAddTag = () => {
//     if (tagInput && !newEntry.tags.includes(tagInput)) {
//       setNewEntry({ ...newEntry, tags: [...newEntry.tags, tagInput] });
//       setTagInput('');
//     }
//   };

//   const handleAddEntry = async () => {
//     if (!newEntry.amount || !newEntry.description) return;
//     setIsSubmitting(true);
//     const { data, error } = await supabase.from('ledger_entries').insert([{ user_id: userId, type: newEntry.type, amount: parseFloat(newEntry.amount), description: newEntry.description, tags: newEntry.tags }]).select().single();
//     if (error) { console.error('Error saving entry:', error); } 
//     else if (data) {
//       const newEntryForState: LedgerEntryItem = { ...data, id: `man-${data.id}`, date: data.created_at };
//       setAllEntries([newEntryForState, ...allEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
//       setShowForm(false);
//       setNewEntry({ type: 'credit', amount: '', description: '', tags: [] });
//     }
//     setIsSubmitting(false);
//   };

//   const generatePdf = () => {
//     const doc = new jsPDF();
//     const title = "General Ledger Statement";
//     const dateStr = dateRange?.from 
//         ? `Period: ${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to || new Date(), 'dd/MM/yy')}` 
//         : "All Transactions";
    
//     doc.setFontSize(18);
//     doc.text(title, 14, 22);
//     doc.setFontSize(11);
//     doc.setTextColor(100);
//     doc.text(dateStr, 14, 29);

//     const tableBody = filteredEntries.map(e => [
//         format(parseISO(e.date), 'dd/MM/yyyy'),
//         e.description,
//         e.tags.join(', '),
//         e.type === 'debit' ? e.amount.toFixed(2) : '',
//         e.type === 'credit' ? e.amount.toFixed(2) : ''
//     ]);

//     const totalRow = ['', '', 'Total', totalDebit.toFixed(2), totalCredit.toFixed(2)];
//     const netBalanceRow = [{ 
//         content: `Net Balance: ${netBalance.toFixed(2)}`, 
//         colSpan: 5, 
//         styles: { halign: 'right' } 
//     }];

//     autoTable(doc, {
//         startY: 50,
//         head: [['Date', 'Description', 'Tags', 'Debit (INR)', 'Credit (INR)']],
//         body: [ ...tableBody, totalRow, netBalanceRow ],
//         theme: 'grid',
//         headStyles: { fillColor: [45, 55, 72] },
//         didParseCell: function (data) {
//             if (data.row.index >= tableBody.length) {
//                 data.cell.styles.fontStyle = 'bold';
//             }
//         }
//     });

//     doc.save(`General_Ledger_${format(new Date(), 'yyyyMMdd')}.pdf`);
//   };


//     return (
//         <DashboardLayout>
//             <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
//                 <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//                     <div>
//                         <h1 className="text-2xl md:text-3xl font-bold tracking-tight">General Ledger</h1>
//                         <p className="text-muted-foreground">A complete history of your debits and credits.</p>
//                     </div>
//                     <Button onClick={generatePdf} disabled={filteredEntries.length === 0} className="w-full sm:w-auto">
//                         <Download className="mr-2 h-4 w-4" /> Download PDF
//                     </Button>
//                 </header>

//                 <motion.div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variants={containerVariants} initial="hidden" animate="show">
//                     <StatCard title="Total Credit (Received)" value={totalCredit} icon={TrendingUp} colorClass="text-green-500" description="All incoming funds" />
//                     <StatCard title="Total Debit (Paid/Payable)" value={totalDebit} icon={TrendingDown} colorClass="text-red-500" description="All outgoing funds & invoices" />
//                     <motion.div variants={itemVariants}>
//                         <Card className={`h-full ${netBalance < 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
//                             <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle></CardHeader>
//                             <CardContent>
//                                 <div className={`text-2xl font-bold ${netBalance < 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
//                                     ₹{Math.abs(netBalance).toLocaleString('en-IN')}
//                                 </div>
//                                 <p className="text-xs text-muted-foreground">{netBalance < 0 ? 'Net amount receivable' : 'Net surplus in hand'}</p>
//                             </CardContent>
//                         </Card>
//                     </motion.div>
//                 </motion.div>

//                 <Card>
//                     {/* RESPONSIVE FIX: Filters now stack vertically on mobile */}
//                     <CardContent className="p-3 flex flex-col md:flex-row gap-3">
//                         <div className="relative flex-grow">
//                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                             <Input placeholder="Search by description or tag..." className="pl-9 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
//                         </div>
//                         <div className="grid grid-cols-2 md:flex gap-3">
//                             <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
//                                 <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
//                                 <SelectContent>
//                                     <SelectItem value="all">All Types</SelectItem>
//                                     <SelectItem value="credit">Credits</SelectItem>
//                                     <SelectItem value="debit">Debits</SelectItem>
//                                 </SelectContent>
//                             </Select>
//                             <Popover>
//                                 <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}` : format(dateRange.from, "LLL dd, y")) : <span>All Time</span>}</Button></PopoverTrigger>
//                                 <PopoverContent className="w-auto p-0 flex-col space-y-2" align="end">
//                                     <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={isMobile ? 1 : 2} />
//                                     {dateRange && <Button onClick={() => setDateRange(undefined)} variant="ghost" className="w-full justify-center">Clear</Button>}
//                                 </PopoverContent>
//                             </Popover>
//                         </div>
//                     </CardContent>
//                 </Card>

//                 {loading ? <div className="space-y-4 pt-8">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
//                     : filteredEntries.length > 0 ? (
//                         <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="show">
//                             {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
//                                 <div key={dateGroup}>
//                                     <h2 className="text-sm font-semibold my-4 px-1 text-muted-foreground">{dateGroup}</h2>
//                                     <Card>
//                                         <CardContent className="p-2 divide-y dark:divide-gray-800">
//                                             {entriesInGroup.map(entry => <TransactionItem key={entry.id} entry={entry} />)}
//                                         </CardContent>
//                                     </Card>
//                                 </div>
//                             ))}
//                         </motion.div>
//                     ) : <Card className="text-center p-12 border-dashed"><h3 className="text-xl font-semibold">No Transactions Found</h3><p className="text-muted-foreground mt-2">{allEntries.length > 0 ? "Try adjusting your filters." : "Click the '+' button to add your first entry."}</p></Card>}
//             </div>

//            <Dialog open={showForm} onOpenChange={setShowForm}>
//          <DialogTrigger asChild><Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg" size="icon"><Plus size={24} /></Button></DialogTrigger>
//          <DialogContent className="sm:max-w-md">
//            <DialogHeader><DialogTitle>Add New Ledger Entry</DialogTitle></DialogHeader>
//            <div className="grid gap-4 py-4">
//              <div><Label>Type</Label><Select value={newEntry.type} onValueChange={(value: any) => setNewEntry({ ...newEntry, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credit (Payment Received)</SelectItem><SelectItem value="debit">Debit (Expense)</SelectItem></SelectContent></Select></div>
//              <div><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="₹0.00" /></div>
//              <div><Label htmlFor="description">Description</Label><Input id="description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., Office Supplies" /></div>
//              <div><Label>Tags</Label><div className="flex gap-2"><Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add tag & press Enter" /><Button variant="outline" onClick={handleAddTag}>Add</Button></div><div className="flex gap-2 mt-2 flex-wrap">{newEntry.tags.map((tag, i) => (<Badge key={i} variant="secondary" className="flex items-center gap-1.5">{tag} <X className="h-3 w-3 cursor-pointer" onClick={() => setNewEntry({ ...newEntry, tags: newEntry.tags.filter(t => t !== tag) })} /></Badge>))}</div></div>
//            </div>
//            <Button onClick={handleAddEntry} disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Entry</Button>
//          </DialogContent>
//        </Dialog>
//         </DashboardLayout>
//     );
// };

// export default GeneralLedgerPage;


"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar as CalendarIcon, Download, X, TrendingUp, TrendingDown, Sparkles, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface LedgerEntryItem {
    id: string | number;
    type: 'debit' | 'credit';
    amount: number;
    description: string;
    tags: string[];
    date: string;
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, type: "spring", stiffness: 100 } }
};

const cardHoverVariants = {
  initial: { y: 0 },
  hover: { y: -4, transition: { duration: 0.2 } }
};

// --- Reusable Sub-Components ---
const StatCard = ({ title, value, icon: Icon, colorClass, description, trend }) => (
    <motion.div variants={itemVariants} whileHover="hover" initial="initial">
        <motion.div variants={cardHoverVariants}>
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${colorClass.replace('text-', 'bg-')}`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorClass.includes('green') ? 'from-green-500/20 to-green-500/10' : 'from-red-500/20 to-red-500/10'}`}>
                        <Icon className={`h-5 w-5 ${colorClass}`} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight">₹{value.toLocaleString('en-IN')}</div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">{description}</p>
                        {trend && (
                            <Badge variant="secondary" className={`${colorClass.includes('green') ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                {trend}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    </motion.div>
);

// --- Enhanced TransactionItem ---
const TransactionItem = ({ entry }: { entry: LedgerEntryItem }) => (
    <motion.div 
        variants={itemVariants} 
        whileHover={{ scale: 1.01, x: 4 }}
        className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent transition-all duration-300 group cursor-pointer border border-transparent hover:border-border/30"
    >
        <motion.div 
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className={`p-3 rounded-2xl flex-shrink-0 shadow-lg ${
                entry.type === 'debit' 
                    ? 'bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/20 text-red-600 shadow-red-500/20' 
                    : 'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/20 text-green-700 shadow-green-500/20'
            }`}
        >
            {entry.type === 'debit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
        </motion.div>
        
        <div className="flex-grow min-w-0">
            <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">{entry.description}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
                {entry.tags.slice(0, 3).map((tag, j) => (
                    <Badge key={j} variant="secondary" className="text-xs bg-muted/60 hover:bg-muted transition-colors">
                        {tag}
                    </Badge>
                ))}
                {entry.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-muted/60">
                        +{entry.tags.length - 3} more
                    </Badge>
                )}
            </div>
        </div>
        
        <div className="text-right ml-auto flex-shrink-0">
            <div className={`text-xl font-bold ${entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
                {format(parseISO(entry.date), 'h:mm a')}
            </div>
        </div>
    </motion.div>
);

// --- Main Ledger Component ---
const GeneralLedgerPage: React.FC = () => {
    const { userId } = useUserId();
    const [allEntries, setAllEntries] = useState<LedgerEntryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [newEntry, setNewEntry] = useState({ type: 'credit' as 'credit' | 'debit', amount: '', description: '', tags: [] as string[] });
    const [tagInput, setTagInput] = useState('');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        const fetchEntries = async () => {
            if (!userId) return;
            setLoading(true);

            let invoiceQuery = supabase
                .from('invoices_record')
                .select(`id, number, date, buyers_record(name), items_record(rate, quantity, gst_rate)`)
                .eq('user_id', userId);
            
            if (dateRange?.from) invoiceQuery = invoiceQuery.gte('date', dateRange.from.toISOString());
            if (dateRange?.to) invoiceQuery = invoiceQuery.lte('date', dateRange.to.toISOString());

            const { data: invoiceData, error: invoiceError } = await invoiceQuery;
            if (invoiceError) console.error('Error fetching invoice debits:', invoiceError);

            const invoiceEntries: LedgerEntryItem[] = (invoiceData || []).map((invoice: any) => {
                const totalAmount = (invoice.items_record || []).reduce((sum: number, item: any) => {
                    const rate = Number(item.rate) || 0;
                    const quantity = Number(item.quantity) || 0;
                    const gst_rate = Number(item.gst_rate) || 0;
                    const taxableAmount = rate * quantity;
                    return sum + taxableAmount * (1 + (gst_rate / 100));
                }, 0);
                return { 
                    id: `inv-${invoice.id}`, 
                    type: 'debit', 
                    amount: totalAmount, 
                    description: `Invoice #${invoice.number}`, 
                    tags: [invoice.buyers_record?.name || 'Unknown Buyer'], 
                    date: invoice.date 
                };
            });

            let manualQuery = supabase.from('ledger_entries').select(`id, type, amount, description, tags, created_at`).eq('user_id', userId);
            if (dateRange?.from) manualQuery = manualQuery.gte('created_at', dateRange.from.toISOString());
            if (dateRange?.to) manualQuery = manualQuery.lte('created_at', dateRange.to.toISOString());

            const { data: manualEntries, error: manualError } = await manualQuery;
            if (manualError) console.error('Error fetching manual entries:', manualError);
            const formattedManualEntries: LedgerEntryItem[] = (manualEntries || []).map((entry: any) => ({ ...entry, id: `man-${entry.id}`, date: entry.created_at }));

            setAllEntries([...invoiceEntries, ...formattedManualEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setLoading(false);
        };
        fetchEntries();
    }, [userId, dateRange]);

    const filteredEntries = useMemo(() => allEntries.filter(entry => 
        (filterType === 'all' || entry.type === filterType) &&
        (searchTerm.trim() === '' || 
            entry.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
            entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    ), [allEntries, searchTerm, filterType]);

    const { totalDebit, totalCredit, netBalance } = useMemo(() => {
        return filteredEntries.reduce((acc, entry) => {
            if (entry.type === 'debit') acc.totalDebit += entry.amount;
            else acc.totalCredit += entry.amount;
            acc.netBalance = acc.totalCredit - acc.totalDebit;
            return acc;
        }, { totalDebit: 0, totalCredit: 0, netBalance: 0 });
    }, [filteredEntries]);

    const groupedEntries = useMemo(() => filteredEntries.reduce((acc, entry) => {
        const date = parseISO(entry.date);
        const key = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy');
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {} as Record<string, LedgerEntryItem[]>), [filteredEntries]);

    const handleAddTag = () => {
        if (tagInput && !newEntry.tags.includes(tagInput)) {
            setNewEntry({ ...newEntry, tags: [...newEntry.tags, tagInput] });
            setTagInput('');
        }
    };

    const handleAddEntry = async () => {
        if (!newEntry.amount || !newEntry.description) return;
        setIsSubmitting(true);
        const { data, error } = await supabase.from('ledger_entries').insert([{ 
            user_id: userId, 
            type: newEntry.type, 
            amount: parseFloat(newEntry.amount), 
            description: newEntry.description, 
            tags: newEntry.tags 
        }]).select().single();
        
        if (error) { 
            console.error('Error saving entry:', error); 
        } else if (data) {
            const newEntryForState: LedgerEntryItem = { ...data, id: `man-${data.id}`, date: data.created_at };
            setAllEntries([newEntryForState, ...allEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setShowForm(false);
            setNewEntry({ type: 'credit', amount: '', description: '', tags: [] });
        }
        setIsSubmitting(false);
    };

    const generatePdf = () => {
        const doc = new jsPDF();
        const title = "General Ledger Statement";
        const dateStr = dateRange?.from 
            ? `Period: ${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to || new Date(), 'dd/MM/yy')}` 
            : "All Transactions";
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(dateStr, 14, 29);

        const tableBody = filteredEntries.map(e => [
            format(parseISO(e.date), 'dd/MM/yyyy'),
            e.description,
            e.tags.join(', '),
            e.type === 'debit' ? e.amount.toFixed(2) : '',
            e.type === 'credit' ? e.amount.toFixed(2) : ''
        ]);

        const totalRow = ['', '', 'Total', totalDebit.toFixed(2), totalCredit.toFixed(2)];
        const netBalanceRow = [{ 
            content: `Net Balance: ${netBalance.toFixed(2)}`, 
            colSpan: 5, 
            styles: { halign: 'right' } 
        }];

        autoTable(doc, {
            startY: 50,
            head: [['Date', 'Description', 'Tags', 'Debit (INR)', 'Credit (INR)']],
            body: [ ...tableBody, totalRow, netBalanceRow ],
            theme: 'grid',
            headStyles: { fillColor: [45, 55, 72] },
            didParseCell: function (data) {
                if (data.row.index >= tableBody.length) {
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save(`General_Ledger_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <motion.header 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                            General Ledger
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">Track every transaction with precision and clarity</p>
                    </div>
                    <Button 
                        onClick={generatePdf} 
                        disabled={filteredEntries.length === 0} 
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                    >
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </motion.header>

                {/* Stats Cards */}
                <motion.div 
                    className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                    variants={containerVariants} 
                    initial="hidden" 
                    animate="show"
                >
                    <StatCard 
                        title="Total Credit (Received)" 
                        value={totalCredit} 
                        icon={TrendingUp} 
                        colorClass="text-green-500" 
                        description="All incoming funds" 
                        trend="+12.5%"
                    />
                    <StatCard 
                        title="Total Debit (Paid/Payable)" 
                        value={totalDebit} 
                        icon={TrendingDown} 
                        colorClass="text-red-500" 
                        description="All outgoing funds" 
                        trend="-8.3%"
                    />
                    <motion.div variants={itemVariants} whileHover="hover" initial="initial">
                        <motion.div variants={cardHoverVariants}>
                            <Card className={`relative overflow-hidden h-full border-border/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ${
                                netBalance < 0 
                                    ? "bg-gradient-to-br from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10" 
                                    : "bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/20 dark:to-green-900/10"
                            }`}>
                                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${
                                    netBalance < 0 ? 'bg-red-500' : 'bg-green-500'
                                }`} />
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Net Cash Flow
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-3xl font-bold tracking-tight ${
                                        netBalance < 0 
                                            ? 'text-red-700 dark:text-red-400' 
                                            : 'text-green-700 dark:text-green-400'
                                    }`}>
                                        ₹{Math.abs(netBalance).toLocaleString('en-IN')}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {netBalance < 0 ? 'Net amount receivable' : 'Net surplus in hand'}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
                            <div className="relative flex-grow group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                    placeholder="Search by description or tag..." 
                                    className="pl-10 h-11 border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background transition-all" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <div className="grid grid-cols-2 md:flex gap-3">
                                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                                    <SelectTrigger className="w-full h-11 border-border/50 bg-background/50 backdrop-blur-sm">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="credit">Credits</SelectItem>
                                        <SelectItem value="debit">Debits</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-11 justify-start text-left font-normal border-border/50 bg-background/50 backdrop-blur-sm">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to 
                                                    ? `${format(dateRange.from, "LLL dd")} - ${format(dateRange.to, "LLL dd")}` 
                                                    : format(dateRange.from, "LLL dd, y")
                                            ) : <span>All Time</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 flex-col space-y-2 bg-background/95 backdrop-blur-xl border-border/50" align="end">
                                        <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={isMobile ? 1 : 2} />
                                        {dateRange && (
                                            <Button onClick={() => setDateRange(undefined)} variant="ghost" className="w-full justify-center">
                                                Clear Filter
                                            </Button>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Transactions List */}
                {loading ? (
                    <div className="space-y-4 pt-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : filteredEntries.length > 0 ? (
                    <motion.div 
                        className="space-y-6" 
                        variants={containerVariants} 
                        initial="hidden" 
                        animate="show"
                    >
                        <AnimatePresence mode="popLayout">
                            {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
                                <motion.div 
                                    key={dateGroup}
                                    variants={itemVariants}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
                                            {dateGroup}
                                        </h2>
                                        <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                                        <Badge variant="secondary" className="text-xs">
                                            {entriesInGroup.length} {entriesInGroup.length === 1 ? 'transaction' : 'transactions'}
                                        </Badge>
                                    </div>
                                    <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                                        <CardContent className="p-2 divide-y divide-border/30">
                                            {entriesInGroup.map(entry => (
                                                <TransactionItem key={entry.id} entry={entry} />
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="text-center p-16 border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/20 to-transparent">
                            <div className="p-4 rounded-full bg-muted/30 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                                <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">No Transactions Found</h3>
                            <p className="text-muted-foreground text-lg">
                                {allEntries.length > 0 
                                    ? "Try adjusting your filters to see more results" 
                                    : "Click the '+' button to add your first entry"}
                            </p>
                        </Card>
                    </motion.div>
                )}
            </div>

            {/* Floating Action Button */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogTrigger asChild>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="fixed bottom-8 right-8 z-50"
                    >
                        <Button 
                            className="h-16 w-16 rounded-full shadow-2xl bg-gradient-to-r from-primary to-primary/90 hover:shadow-primary/50" 
                            size="icon"
                        >
                            <Plus size={28} />
                        </Button>
                    </motion.div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Add New Entry
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Transaction Type</Label>
                            <Select value={newEntry.type} onValueChange={(value: any) => setNewEntry({ ...newEntry, type: value })}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="credit">
                                        <div className="flex items-center gap-2">
                                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                            Credit (Payment Received)
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="debit">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                                            Debit (Expense)
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-sm font-semibold">Amount</Label>
                            <Input 
                                id="amount" 
                                type="number" 
                                value={newEntry.amount} 
                                onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} 
                                placeholder="₹0.00"
                                className="h-11 text-lg"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <Input 
                                id="description" 
                                value={newEntry.description} 
                                onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} 
                                placeholder="e.g., Office Supplies"
                                className="h-11"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Tags</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={tagInput} 
                                    onChange={e => setTagInput(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} 
                                    placeholder="Add tag & press Enter"
                                    className="h-11"
                                />
                                <Button variant="outline" onClick={handleAddTag} className="h-11 px-6">
                                    Add
                                </Button>
                            </div>
                            <div className="flex gap-2 mt-3 flex-wrap min-h-[32px]">
                                <AnimatePresence mode="popLayout">
                                    {newEntry.tags.map((tag, i) => (
                                        <motion.div
                                            key={tag}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Badge 
                                                variant="secondary" 
                                                className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors"
                                            >
                                                {tag}
                                                <X 
                                                    className="h-3 w-3 hover:text-destructive transition-colors" 
                                                    onClick={() => setNewEntry({ ...newEntry, tags: newEntry.tags.filter(t => t !== tag) })} 
                                                />
                                            </Badge>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                    <Button 
                        onClick={handleAddEntry} 
                        disabled={isSubmitting || !newEntry.amount || !newEntry.description} 
                        className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Saving Entry...' : 'Save Entry'}
                    </Button>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default GeneralLedgerPage;