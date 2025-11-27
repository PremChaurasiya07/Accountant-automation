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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar as CalendarIcon, 
  Download, X, TrendingUp, TrendingDown, Sparkles, Filter, Receipt, Tag, Clock, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
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
    referenceId?: string;
}

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
                {/* Responsive text sizing to prevent overflow of large numbers */}
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                    ₹{value.toLocaleString('en-IN')}
                </h3>
            </div>
        </CardContent>
    </Card>
);

const TransactionItem = ({ entry, onClick }: { entry: LedgerEntryItem; onClick: (entry: LedgerEntryItem) => void }) => (
    <motion.div 
        variants={itemVariants}
        onClick={() => onClick(entry)}
        className="group relative flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer active:scale-[0.98] w-full overflow-hidden"
    >
        {/* Icon Box */}
        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-colors ${
            entry.type === 'debit' 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        }`}>
            {entry.type === 'debit' ? <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6" /> : <ArrowDownLeft className="h-5 w-5 sm:h-6 sm:w-6" />}
        </div>

        {/* Content - min-w-0 prevents flex child from expanding parent width */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                    {entry.description}
                </p>
                <span className={`text-sm sm:text-base font-bold whitespace-nowrap shrink-0 ${
                    entry.type === 'debit' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                    {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                </span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 overflow-hidden h-5 sm:h-auto min-w-0">
                    {entry.tags.slice(0, 2).map((tag, j) => (
                        <span key={j} className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-muted-foreground ring-1 ring-inset ring-gray-500/10 truncate max-w-[80px] sm:max-w-[120px]">
                            {tag}
                        </span>
                    ))}
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
export default function GeneralLedgerPage() {
    const { userId } = useUserId();
    const router = useRouter();
    const [allEntries, setAllEntries] = useState<LedgerEntryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<LedgerEntryItem | null>(null);
    
    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    
    // Form State
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

            const { data: invoiceData } = await invoiceQuery;

            const invoiceEntries: LedgerEntryItem[] = (invoiceData || []).map((invoice: any) => {
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
                    tags: [invoice.buyers_record?.name || 'Unknown Buyer', 'Invoice'], 
                    date: invoice.date 
                };
            });

            let manualQuery = supabase.from('ledger_entries').select(`id, type, amount, description, tags, created_at`).eq('user_id', userId);
            if (dateRange?.from) manualQuery = manualQuery.gte('created_at', dateRange.from.toISOString());
            if (dateRange?.to) manualQuery = manualQuery.lte('created_at', dateRange.to.toISOString());

            const { data: manualEntries } = await manualQuery;
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
        
        if (data) {
            const newEntryForState: LedgerEntryItem = { ...data, id: `man-${data.id}`, date: data.created_at };
            setAllEntries([newEntryForState, ...allEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setShowForm(false);
            setNewEntry({ type: 'credit', amount: '', description: '', tags: [] });
        }
        setIsSubmitting(false);
    };

    const generatePdf = () => {
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text("General Ledger", 14, 22);
        const tableBody = filteredEntries.map(e => [
            format(parseISO(e.date), 'dd/MM/yyyy'),
            e.description, e.tags.join(', '),
            e.type === 'debit' ? e.amount.toFixed(2) : '',
            e.type === 'credit' ? e.amount.toFixed(2) : ''
        ]);
        autoTable(doc, { startY: 30, head: [['Date', 'Description', 'Tags', 'Debit', 'Credit']], body: tableBody });
        doc.save(`Ledger_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-background/50 pb-24 w-full overflow-x-hidden"> {/* Ensure page doesn't scroll horizontally */}
                {/* Sticky Header */}
                <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">General Ledger</h1>
                            <p className="text-sm text-muted-foreground hidden sm:block">Track your income and expenses</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search transactions..." 
                                    className="pl-9 h-10 bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <Button size="icon" variant="outline" className="shrink-0" onClick={generatePdf}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 mt-6">
                    
                    {/* Stats Overview */}
                    <motion.div 
                        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
                        variants={containerVariants} 
                        initial="hidden" 
                        animate="show"
                    >
                        <StatCard 
                            title="Total Credit" 
                            value={totalCredit} 
                            icon={TrendingUp} 
                            colorClass="text-emerald-500" 
                            trend="+ Income"
                        />
                        <StatCard 
                            title="Total Debit" 
                            value={totalDebit} 
                            icon={TrendingDown} 
                            colorClass="text-red-500" 
                            trend="- Expense"
                        />
                        <Card className={`relative overflow-hidden border-border/60 shadow-sm transition-all w-full ${netBalance < 0 ? 'bg-red-500/5 border-red-200/50' : 'bg-emerald-500/5 border-emerald-200/50'}`}>
                            <CardContent className="p-4 sm:p-5 flex flex-col justify-center h-full">
                                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Net Balance</p>
                                <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight truncate ${netBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {netBalance < 0 ? '-' : '+'}₹{Math.abs(netBalance).toLocaleString('en-IN')}
                                </h3>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                        <Button 
                            variant={filterType === 'all' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setFilterType('all')}
                            className="rounded-full h-8 text-xs sm:text-sm"
                        >
                            All
                        </Button>
                        <Button 
                            variant={filterType === 'credit' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setFilterType('credit')}
                            className="rounded-full h-8 text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white border-transparent data-[variant=outline]:bg-transparent data-[variant=outline]:text-emerald-600 data-[variant=outline]:border-emerald-200"
                        >
                            Credit
                        </Button>
                        <Button 
                            variant={filterType === 'debit' ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setFilterType('debit')}
                            className="rounded-full h-8 text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white border-transparent data-[variant=outline]:bg-transparent data-[variant=outline]:text-red-600 data-[variant=outline]:border-red-200"
                        >
                            Debit
                        </Button>
                        
                        <div className="ml-auto">
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 border-dashed text-xs sm:text-sm">
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {dateRange?.from ? "Filtered" : "All Dates"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={1} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Transactions List */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                        </div>
                    ) : filteredEntries.length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(groupedEntries).map(([dateGroup, entries]) => (
                                <motion.div key={dateGroup} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 ml-1">{dateGroup}</h3>
                                    <div className="space-y-2 sm:space-y-3">
                                        {entries.map(entry => (
                                            <TransactionItem key={entry.id} entry={entry} onClick={setSelectedEntry} />
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <div className="bg-muted/50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                <Filter className="h-6 w-6 opacity-50" />
                            </div>
                            <p className="text-sm">No transactions found.</p>
                        </div>
                    )}
                </div>

                {/* Floating Add Button */}
                <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogTrigger asChild>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="fixed bottom-6 right-6 h-12 w-12 sm:h-14 sm:w-14 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/25 flex items-center justify-center z-50"
                        >
                            <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                        </motion.button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-xl">
                        <DialogHeader>
                            <DialogTitle>New Transaction</DialogTitle>
                            <DialogDescription>Record a manual income or expense.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-all ${newEntry.type === 'credit' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-border hover:border-emerald-200'}`} onClick={() => setNewEntry({...newEntry, type: 'credit'})}>
                                    <ArrowDownLeft className={`h-5 w-5 mx-auto mb-1 ${newEntry.type === 'credit' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                                    <span className="text-xs font-medium">Income</span>
                                </div>
                                <div className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-all ${newEntry.type === 'debit' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-border hover:border-red-200'}`} onClick={() => setNewEntry({...newEntry, type: 'debit'})}>
                                    <ArrowUpRight className={`h-5 w-5 mx-auto mb-1 ${newEntry.type === 'debit' ? 'text-red-600' : 'text-muted-foreground'}`} />
                                    <span className="text-xs font-medium">Expense</span>
                                </div>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                                <Input className="pl-7 text-lg font-semibold h-11" placeholder="0.00" type="number" inputMode="decimal" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} />
                            </div>
                            <Input className="h-11" placeholder="Description (e.g. Office Rent)" value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} />
                            <div>
                                <div className="flex gap-2 mb-2">
                                    <Input className="h-9 text-sm" placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} />
                                    <Button type="button" size="sm" variant="outline" className="h-9" onClick={handleAddTag}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {newEntry.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive/10 hover:text-destructive" onClick={() => setNewEntry({...newEntry, tags: newEntry.tags.filter(t => t !== tag)})}>
                                            {tag} ×
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddEntry} disabled={isSubmitting || !newEntry.amount} className="w-full h-11">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Entry
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Transaction Details Popup (Responsive Modal) */}
                <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                    <DialogContent className="sm:max-w-[400px] w-[90vw] p-0 overflow-hidden rounded-2xl">
                        {selectedEntry && (
                            <>
                                <div className={`p-6 text-center ${selectedEntry.type === 'debit' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                                    <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-3 shadow-sm ${selectedEntry.type === 'debit' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {selectedEntry.type === 'debit' ? <ArrowUpRight className="h-8 w-8" /> : <ArrowDownLeft className="h-8 w-8" />}
                                    </div>
                                    <h2 className={`text-3xl font-bold ${selectedEntry.type === 'debit' ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {selectedEntry.type === 'credit' ? '+' : '-'}₹{selectedEntry.amount.toLocaleString('en-IN')}
                                    </h2>
                                    <p className="text-xs font-bold opacity-70 mt-1 uppercase tracking-widest">{selectedEntry.type}</p>
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
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 font-bold"><Clock className="h-3 w-3" /> Time</Label>
                                            <p className="text-sm font-medium">{format(parseISO(selectedEntry.date), 'h:mm a')}</p>
                                        </div>
                                    </div>
                                    {selectedEntry.tags.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedEntry.tags.map(tag => (
                                                    <Badge key={tag} variant="outline" className="bg-background text-xs font-normal">{tag}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {selectedEntry.id.startsWith('inv-') && selectedEntry.referenceId && (
                                        <Button 
                                            className="w-full gap-2 h-11 shadow-lg shadow-primary/10" 
                                            onClick={() => router.push(`/billing/edit/${selectedEntry.referenceId}`)}
                                        >
                                            <Receipt className="h-4 w-4" /> View Invoice Details
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
}