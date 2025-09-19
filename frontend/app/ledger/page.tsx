"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar as CalendarIcon, Download, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces (Unchanged) ---
interface LedgerEntryItem {
  id: string | number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  tags: string[];
  date: string; // ISO 8601 string
}

const GeneralLedgerPage: React.FC = () => {
  const { userId } = useUserId();

  // --- State Management ---
  const [allEntries, setAllEntries] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [newEntry, setNewEntry] = useState({ type: 'credit' as 'credit' | 'debit', amount: '', description: '', tags: [] as string[] });
  const [tagInput, setTagInput] = useState('');
  
  // ✅ NEW: State to track mobile view for calendar
  const [isMobile, setIsMobile] = useState(false);

  // ✅ NEW: Effect to detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's 'md' breakpoint
    };
    // Initial check
    checkScreenSize();
    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);
    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);


  // --- Data Fetching ---
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
            description: `#${invoice.number}`, 
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

  // --- Memoized Filtering and Calculations (Unchanged) ---
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

  // --- Handlers (Unchanged) ---
  const handleAddTag = () => {
    if (tagInput && !newEntry.tags.includes(tagInput)) {
      setNewEntry({ ...newEntry, tags: [...newEntry.tags, tagInput] });
      setTagInput('');
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.amount || !newEntry.description) return;
    setIsSubmitting(true);
    const { data, error } = await supabase.from('ledger_entries').insert([{ user_id: userId, type: newEntry.type, amount: parseFloat(newEntry.amount), description: newEntry.description, tags: newEntry.tags }]).select().single();
    if (error) { console.error('Error saving entry:', error); } 
    else if (data) {
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
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-3xl font-bold tracking-tight">General Ledger</h1><p className="text-muted-foreground">A complete history of your debits and credits.</p></div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>All Time</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex-col space-y-2" align="end">
                <div className="p-2">
                  {/* ✅ MODIFIED: Calendar now responsive */}
                  <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={isMobile ? 1 : 2} />
                </div>
                {dateRange && <Button onClick={() => setDateRange(undefined)} variant="ghost" className="w-full justify-center">Show All Time</Button>}
              </PopoverContent>
            </Popover>
            <Button onClick={generatePdf} disabled={filteredEntries.length === 0} className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" /> PDF</Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Debit (Receivable)</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalDebit.toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Credit (Received)</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalCredit.toFixed(2)}</div></CardContent></Card>
          <Card className={`lg:col-span-1 md:col-span-2 ${netBalance < 0 ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}`}>
            <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance < 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>₹{Math.abs(netBalance).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{netBalance < 0 ? 'Net amount receivable' : 'Net surplus'}</p>
            </CardContent>
          </Card>
        </div>

        <Card><CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by description or tag..." className="pl-8 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Transactions</SelectItem><SelectItem value="debit">Debits Only</SelectItem><SelectItem value="credit">Credits Only</SelectItem></SelectContent></Select>
        </CardContent></Card>

        {loading ? <div className="space-y-4 pt-8">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
        : filteredEntries.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([dateGroup, entriesInGroup]) => (
              <div key={dateGroup}>
                <h2 className="text-lg font-semibold my-4 px-1">{dateGroup}</h2>
                <div className="space-y-3">{entriesInGroup.map(entry => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    {/* ✅ MODIFIED: This entire CardContent is now responsive */}
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`p-2 rounded-full flex-shrink-0 ${entry.type === 'debit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                        {entry.type === 'debit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                      </div>
                      <div className="flex-grow flex flex-col sm:flex-row sm:justify-between sm:items-start min-w-0">
                        <div className="min-w-0 pr-4"> {/* Added pr-4 for spacing */}
                          <p className="font-semibold truncate">{entry.description}</p>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {entry.tags.map((tag, j) => <Badge key={j} variant="secondary">{tag}</Badge>)}
                          </div>
                        </div>
                        <div className={`text-left sm:text-right font-bold text-lg mt-1 sm:mt-0 flex-shrink-0 ${entry.type === 'debit' ? 'text-red-600' : 'text-green-700'}`}>
                          {entry.type === 'credit' ? '+' : ''}₹{entry.amount.toFixed(2)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}</div>
              </div>
            ))}
          </div>
        ) : <Card className="text-center p-12 border-dashed"><h3 className="text-xl font-semibold">No Transactions Found</h3><p className="text-muted-foreground mt-2">{allEntries.length > 0 ? "Try adjusting your filters." : "Click '+' to add your first entry."}</p></Card>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogTrigger asChild><Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg" size="icon"><Plus size={24} /></Button></DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New Ledger Entry</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Type</Label><Select value={newEntry.type} onValueChange={(value: any) => setNewEntry({ ...newEntry, type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="credit">Credit (Payment Received)</SelectItem><SelectItem value="debit">Debit (Expense)</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="₹0.00" /></div>
            <div><Label htmlFor="description">Description</Label><Input id="description" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="e.g., Office Supplies" /></div>
            <div><Label>Tags</Label><div className="flex gap-2"><Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add tag & press Enter" /><Button variant="outline" onClick={handleAddTag}>Add</Button></div><div className="flex gap-2 mt-2 flex-wrap">{newEntry.tags.map((tag, i) => (<Badge key={i} variant="secondary" className="flex items-center gap-1.5">{tag} <X className="h-3 w-3 cursor-pointer" onClick={() => setNewEntry({ ...newEntry, tags: newEntry.tags.filter(t => t !== tag) })} /></Badge>))}</div></div>
          </div>
          <Button onClick={handleAddEntry} disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Entry</Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GeneralLedgerPage;



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

//   // --- State Management (Unchanged) ---
//   const [allEntries, setAllEntries] = useState<LedgerEntryItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [showForm, setShowForm] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
//   const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
//   const [newEntry, setNewEntry] = useState({ type: 'credit' as 'credit' | 'debit', amount: '', description: '', tags: [] as string[] });
//   const [tagInput, setTagInput] = useState('');

//   // --- Data Fetching (MODIFIED) ---
//   useEffect(() => {
//     const fetchEntries = async () => {
//       if (!userId) return;
//       setLoading(true);

//       // --- Query 1: Invoice Debits with correct schema columns ---
//       let invoiceQuery = supabase
//         .from('invoices_record')
//         .select(`id, number, date, buyers_record(name), items_record(rate, quantity, gst_rate)`)
//         .eq('user_id', userId);
      
//       if (dateRange?.from) invoiceQuery = invoiceQuery.gte('date', dateRange.from.toISOString());
//       if (dateRange?.to) invoiceQuery = invoiceQuery.lte('date', dateRange.to.toISOString());

//       const { data: invoiceData, error: invoiceError } = await invoiceQuery;
//       if (invoiceError) console.error('Error fetching invoice debits:', invoiceError);

//       const invoiceEntries: LedgerEntryItem[] = (invoiceData || []).map((invoice: any) => {
//         // --- FIXED: Invoice total calculation now correctly includes quantity ---
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

//       // --- Query 2: Manual Ledger Entries (Unchanged) ---
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

//   // --- Memoized Filtering and Calculations (Your original logic preserved) ---
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
//           acc.netBalance = acc.totalCredit - acc.totalDebit; // Credit - Debit
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

//   // --- Handlers (Your original logic preserved) ---
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

// const generatePdf = () => {
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

//     // 1. Prepare the main data rows
//     const tableBody = filteredEntries.map(e => [
//         format(parseISO(e.date), 'dd/MM/yyyy'),
//         e.description,
//         e.tags.join(', '),
//         e.type === 'debit' ? e.amount.toFixed(2) : '',
//         e.type === 'credit' ? e.amount.toFixed(2) : ''
//     ]);

//     // 2. Prepare the summary rows separately
//     const totalRow = ['', '', 'Total', totalDebit.toFixed(2), totalCredit.toFixed(2)];
//     const netBalanceRow = [{ 
//         content: `Net Balance: ${netBalance.toFixed(2)}`, 
//         colSpan: 5, 
//         styles: { halign: 'right' } 
//     }];

//     autoTable(doc, {
//         startY: 50,
//         head: [['Date', 'Description', 'Tags', 'Debit (INR)', 'Credit (INR)']],
//         // 3. Combine the main data and the summary rows here
//         body: [
//             ...tableBody,
//             totalRow,
//             netBalanceRow
//         ],
//         theme: 'grid',
//         headStyles: { fillColor: [45, 55, 72] }, // Dark Slate Gray
        
//         // 4. Use this hook to style ONLY the last two rows (the summary)
//         didParseCell: function (data) {
//             // Check if the current row is one of the last two rows in the entire table
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
//           <div className="flex items-center gap-2">
//             <Popover>
//               <PopoverTrigger asChild><Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>All Time</span>}</Button></PopoverTrigger>
//               <PopoverContent className="w-auto p-0 flex-col space-y-2" align="end"><div className="p-2"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></div>{dateRange && <Button onClick={() => setDateRange(undefined)} variant="ghost" className="w-full justify-center">Show All Time</Button>}</PopoverContent>
//             </Popover>
//             <Button onClick={generatePdf} disabled={filteredEntries.length === 0}><Download className="mr-2 h-4 w-4" /> PDF</Button>
//           </div>
//         </header>

//         <div className="grid gap-4 md:grid-cols-3">
//           <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Debit (Receivable)</CardTitle><ArrowUpRight className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalDebit.toFixed(2)}</div></CardContent></Card>
//           <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Credit (Received)</CardTitle><ArrowDownLeft className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">₹{totalCredit.toFixed(2)}</div></CardContent></Card>
//           <Card className={netBalance < 0 ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}>
//             <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
//             <CardContent>
//                 <div className={`text-2xl font-bold ${netBalance < 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>₹{Math.abs(netBalance).toFixed(2)}</div>
//                 <p className="text-xs text-muted-foreground">{netBalance < 0 ? 'Net amount receivable' : 'Net surplus'}</p>
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
//                   <Card key={entry.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4 grid grid-cols-[auto,1fr,auto] items-center gap-4">
//                     <div className={`p-2 rounded-full ${entry.type === 'debit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{entry.type === 'debit' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}</div>
//                     <div><p className="font-semibold line-clamp-1">{entry.description}</p><div className="flex gap-1.5 mt-1.5 flex-wrap">{entry.tags.map((tag, j) => <Badge key={j} variant="secondary">{tag}</Badge>)}</div></div>
//                     <div className={`text-right font-bold text-lg ${entry.type === 'debit' ? 'text-red-600' : 'text-green-700'}`}>{entry.type === 'credit' ? '+' : ''}₹{entry.amount.toFixed(2)}</div>
//                   </CardContent></Card>
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