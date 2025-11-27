"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, FileCheck2, Database, UploadCloud, Download, 
    Calendar as CalendarIcon, Building, Receipt, AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---
interface GstrItemDetail {
    txval: number; // Taxable Value
    rt: number;    // Rate
    camt?: number; // CGST
    samt?: number; // SGST
    iamt?: number; // IGST
    csamt?: number; // Cess
}

interface GstrInvoice {
    inum: string;  // Invoice Number
    idt: string;   // Invoice Date
    val: number;   // Invoice Value
    buyer_name?: string; 
    pos?: string;  // Place of Supply
    itms: { itm_det: GstrItemDetail }[];
}

interface GstrB2BEntry {
    ctin: string; // GSTIN
    inv: GstrInvoice[];
}

interface GstrReport {
    b2b: GstrB2BEntry[];
}

// --- Animation Variants ---
const fadeInUp = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function GSTRPage() {
    const { userSession } = useUserId();
    const { toast } = useToast();
    
    const [date, setDate] = useState<DateRange | undefined>({
        from: dayjs().startOf('month').toDate(),
        to: dayjs().endOf('month').toDate(),
    });

    const [reportJson, setReportJson] = useState<GstrReport | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [activeTab, setActiveTab] = useState("database");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // --- LOGIC: Filter Valid B2B Data ---
    const validB2BData = useMemo(() => {
        if (!reportJson?.b2b) return [];
        
        // LOGIC: Only include entries with a valid GSTIN (length >= 15 is a safe basic check for Indian GSTIN)
        return reportJson.b2b.filter(entry => 
            entry.ctin && entry.ctin.length >= 15
        );
    }, [reportJson]);

    const summaryStats = useMemo(() => {
        let totalTaxable = 0;
        let totalTax = 0;
        let totalInvoices = 0;

        validB2BData.forEach(entry => {
            entry.inv.forEach(inv => {
                totalInvoices++;
                inv.itms.forEach(item => {
                    totalTaxable += item.itm_det.txval || 0;
                    totalTax += (item.itm_det.iamt || 0) + (item.itm_det.camt || 0) + (item.itm_det.samt || 0);
                });
            });
        });

        return { totalTaxable, totalTax, totalInvoices };
    }, [validB2BData]);

    // --- SCROLL TO RESULTS ---
    useEffect(() => {
        if (reportJson && resultsRef.current) {
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [reportJson]);

    // --- HANDLERS ---
    const handleFileChange = (files: FileList | null) => { if (files) setSelectedFiles(prev => [...prev, ...Array.from(files)]); };
    const removeFile = (index: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));

    const generateReportFromDB = async () => {
        if (!date?.from || !date?.to) return toast({ title: "Date range required", variant: "destructive" });
        
        setIsProcessing(true);
        setReportJson(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/reports/gstr1-from-db`, {
                method: 'POST',
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
                body: JSON.stringify({ start_date: dayjs(date.from).format('YYYY-MM-DD'), end_date: dayjs(date.to).format('YYYY-MM-DD') }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.detail || `Failed to generate report.`);
            
            setReportJson(result.data);
            toast({ title: 'Report Generated', description: `Found ${result.data.b2b?.length || 0} B2B records.` });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const generateReportFromPDFs = async () => {
        if (selectedFiles.length === 0) return toast({ title: "No file selected", variant: "destructive" });
        
        setIsProcessing(true);
        setReportJson(null);
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr/gstr1-from-pdf`, { method: 'POST', body: formData });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Processing failed.');
            
            setReportJson(result.parsed_gstr1);
            toast({ title: 'Success', description: 'PDFs processed successfully.' });
        } catch (err: any) {
            toast({ title: `Error`, description: err.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadAsExcel = () => {
        if (validB2BData.length === 0) return toast({ title: "No Data", description: "No valid B2B records to export.", variant: "destructive" });
        
        const rows = validB2BData.flatMap(entry =>
            entry.inv.map(inv => {
                const item = inv.itms?.[0]?.itm_det || { txval: 0, rt: 0, camt: 0, samt: 0 };
                return {
                    "GSTIN/UIN of Recipient": entry.ctin,
                    "Receiver Name": inv.buyer_name || '',
                    "Invoice Number": inv.inum,
                    "Invoice Date": inv.idt,
                    "Invoice Value": inv.val,
                    "Place Of Supply": inv.pos || '',
                    "Reverse Charge": "N",
                    "Invoice Type": "Regular",
                    "E-Commerce GSTIN": "",
                    "Rate": item.rt,
                    "Taxable Value": item.txval,
                    "Cess Amount": item.csamt || 0
                };
            })
        );
        
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "B2B");
        XLSX.writeFile(workbook, `GSTR1_B2B_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-background/50 pb-32 w-full overflow-x-hidden">
                
                {/* Header */}
                <div className="w-full bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                            GSTR-1 Filing Helper
                        </h1>
                        <p className="text-muted-foreground mt-1">Generate B2B reports for tax filing.</p>
                    </div>
                </div>

                <div className="p-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 mt-6">
                    
                    {/* --- INPUT SECTION --- */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="database" className="flex items-center gap-2">
                                        <Database className="h-4 w-4" /> From Saved Data
                                    </TabsTrigger>
                                    <TabsTrigger value="pdf" className="flex items-center gap-2">
                                        <UploadCloud className="h-4 w-4" /> From PDFs
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent>
                            <AnimatePresence mode="wait">
                                {activeTab === 'database' ? (
                                    <motion.div 
                                        key="db" 
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <div className="grid gap-2">
                                            <span className="text-sm font-medium">Select Period</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {date?.from ? (
                                                            date.to ? <>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</> : format(date.from, "LLL dd, y")
                                                        ) : <span>Pick a date range</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="range" selected={date} onSelect={setDate} numberOfMonths={1} />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <Button className="w-full h-11 bg-primary" onClick={generateReportFromDB} disabled={isProcessing}>
                                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                                            Generate B2B JSON
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="pdf"
                                        initial={{ opacity: 0, y: 10 }} 
                                        animate={{ opacity: 1, y: 0 }} 
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <div 
                                            className="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors border-muted-foreground/25"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                                            <p className="text-sm text-center text-muted-foreground font-medium">
                                                Tap to upload Invoice PDFs
                                            </p>
                                            <Input type="file" ref={fileInputRef} multiple accept="application/pdf" className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
                                        </div>
                                        
                                        {selectedFiles.length > 0 && (
                                            <div className="space-y-2 max-h-40 overflow-y-auto p-1">
                                                {selectedFiles.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg text-sm border border-border/50">
                                                        <span className="truncate max-w-[200px]">{file.name}</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}><X className="w-4 h-4" /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <Button className="w-full h-11" onClick={generateReportFromPDFs} disabled={isProcessing || selectedFiles.length === 0}>
                                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Process Files'}
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    {/* --- RESULTS SECTION --- */}
                    {reportJson && (
                        <motion.div ref={resultsRef} variants={fadeInUp} initial="hidden" animate="visible" className="space-y-6">
                            
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50">
                                    <CardContent className="p-4">
                                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Taxable</p>
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">₹{summaryStats.totalTaxable.toLocaleString('en-IN')}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/50">
                                    <CardContent className="p-4">
                                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Total Tax</p>
                                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">₹{summaryStats.totalTax.toLocaleString('en-IN')}</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/50">
                                    <CardContent className="p-4">
                                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">B2B Invoices</p>
                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{summaryStats.totalInvoices}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* B2B List */}
                            <Card className="border-border/60 shadow-md">
                                <CardHeader className="pb-3 border-b border-border/40">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building className="h-5 w-5 text-primary" />
                                        B2B Transactions
                                    </CardTitle>
                                    <CardDescription>Only showing invoices for buyers with valid GSTINs.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {validB2BData.length > 0 ? (
                                        <Accordion type="multiple" className="w-full">
                                            {validB2BData.map((entry, idx) => (
                                                <AccordionItem value={`item-${idx}`} key={idx} className="border-b last:border-0 px-4">
                                                    <AccordionTrigger className="hover:no-underline py-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full text-left">
                                                            <span className="font-mono text-sm font-semibold bg-muted px-2 py-1 rounded border border-border/50">
                                                                {entry.ctin}
                                                            </span>
                                                            <span className="text-sm text-muted-foreground flex-1 truncate">
                                                                {entry.inv[0]?.buyer_name || "Unknown Buyer"}
                                                            </span>
                                                            <Badge variant="outline" className="mr-4 w-fit">
                                                                {entry.inv.length} Invoice{entry.inv.length > 1 ? 's' : ''}
                                                            </Badge>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-4">
                                                        <div className="space-y-3 pl-1 sm:pl-4 border-l-2 border-muted ml-2">
                                                            {entry.inv.map((inv) => (
                                                                <div key={inv.inum} className="bg-muted/30 rounded-lg p-3 text-sm border border-border/40">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div>
                                                                            <p className="font-bold flex items-center gap-1.5">
                                                                                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                #{inv.inum}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground mt-0.5">{inv.idt}</p>
                                                                        </div>
                                                                        <p className="font-bold text-base">₹{inv.val.toFixed(2)}</p>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2 text-xs bg-background/50 p-2 rounded border border-border/30">
                                                                        <div>
                                                                            <span className="text-muted-foreground block">Taxable Val</span>
                                                                            <span className="font-medium">₹{inv.itms?.[0]?.itm_det?.txval.toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-muted-foreground block">Total Tax</span>
                                                                            <span className="font-medium text-amber-600">
                                                                                ₹{((inv.itms?.[0]?.itm_det?.camt || 0) + (inv.itms?.[0]?.itm_det?.samt || 0) + (inv.itms?.[0]?.itm_det?.iamt || 0)).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>No B2B transactions found for this period.</p>
                                            <p className="text-xs mt-1">(Check if buyers have valid GST numbers)</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>

                {/* Sticky Bottom Action Bar */}
                {reportJson && validB2BData.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-t shadow-[0_-4px_10px_rgba(0,0,0,0.05)] p-4 md:px-8">
                        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                            <p className="text-sm font-medium text-muted-foreground hidden sm:block">
                                {validB2BData.length} GSTINs ready for export
                            </p>
                            <Button onClick={downloadAsExcel} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">
                                <Download className="mr-2 h-4 w-4" /> Download Excel
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}


// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useToast } from "@/hooks/use-toast";
// import { motion } from "framer-motion";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import { UploadCloud, Download, Loader2, FileText, X, FileCheck2, Database, User } from "lucide-react";
// import { DatePickerWithRange } from "@/components/ui/date-range-picker";
// import { DateRange } from 'react-day-picker';
// import dayjs from 'dayjs';
// import * as XLSX from 'xlsx';
// import { Label } from "@/components/ui/label";

// export default function GSTRPage() {
//   const { userId, userSession } = useUserId();
//   const { toast } = useToast();
  
//   const [date, setDate] = useState<DateRange | undefined>({
//     from: dayjs().startOf('month').toDate(),
//     to: dayjs().endOf('month').toDate(),
//   });

//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const resultsRef = useRef<HTMLDivElement>(null); // Ref for the results card
//   const [reportJson, setReportJson] = useState<any | null>(null);
//   const [isProcessing, setIsProcessing] = useState<boolean>(false);
//   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
//   const [isDragging, setIsDragging] = useState(false);

//   // --- ADDED: Auto-scroll functionality ---
//   useEffect(() => {
//     if (reportJson && resultsRef.current) {
//       resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
//     }
//   }, [reportJson]);

//   const handleFileChange = (files: FileList | null) => { if (files) setSelectedFiles(prev => [...prev, ...Array.from(files)]); };
//   const removeFile = (index: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));
//   const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(dragging); };
//   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e, false); if (e.dataTransfer.files) handleFileChange(e.dataTransfer.files); };

//   const generateReportFromDB = async () => {
//     if (!date?.from || !date?.to) {
//         toast({ title: "Date range required", variant: "destructive" });
//         return;
//     }
//     setIsProcessing(true);
//     setReportJson(null);
//     try {
//         const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/reports/gstr1-from-db`, {
//             method: 'POST',
//             credentials: "include",
//             headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
//             body: JSON.stringify({ start_date: dayjs(date.from).format('YYYY-MM-DD'), end_date: dayjs(date.to).format('YYYY-MM-DD') }),
//         });
//         const result = await res.json();
//         if (!res.ok) throw new Error(result.detail || `Failed to generate GSTR-1 report.`);
        
//         setReportJson(result.data);
//         toast({ title: '✅ Report Generated', description: `GSTR-1 report created from your saved data.` });
//     } catch (err: any) {
//         toast({ title: '❌ Error', description: err.message, variant: "destructive" });
//     } finally {
//         setIsProcessing(false);
//     }
//   };

//   const generateReportFromPDFs = async () => {
//     if (selectedFiles.length === 0) {
//       toast({ title: "No file selected", variant: "destructive" });
//       return;
//     }
//     setIsProcessing(true);
//     setReportJson(null);
//     const formData = new FormData();
//     selectedFiles.forEach(file => formData.append('files', file));

//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr/gstr1-from-pdf`, { method: 'POST', body: formData });
//       const result = await res.json();
//       if (!res.ok) throw new Error(result.error || 'An unknown error occurred.');
      
//       setReportJson(result.parsed_gstr1);
//       toast({ title: '✅ Success', description: 'Invoices processed successfully.' });
//     } catch (err: any) {
//       toast({ title: `❌ Error`, description: err.message, variant: "destructive" });
//     } finally {
//       setIsProcessing(false);
//     }
//   };
  
//   // --- MODIFIED & ENHANCED DOWNLOAD FUNCTIONS ---
//   const downloadAsJson = () => {
//     if (!reportJson) return;
//     // Create a deep copy to avoid modifying the state
//     const cleanJson = JSON.parse(JSON.stringify(reportJson));
    
//     // Remove the non-compliant 'buyer_name' field before downloading
//     if (cleanJson.b2b) {
//         cleanJson.b2b.forEach((entry: any) => {
//             entry.inv.forEach((inv: any) => {
//                 delete inv.buyer_name;
//             });
//         });
//     }

//     const blob = new Blob([JSON.stringify(cleanJson, null, 2)], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'gstr1_report.json';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const downloadAsExcel = () => {
//     if (!reportJson?.b2b) return;
//     const rows = reportJson.b2b.flatMap((entry: any) =>
//       entry.inv.map((inv: any) => {
//         const item = inv.itms?.[0]?.itm_det || {};
//         return {
//           "Buyer GSTIN": entry.ctin,
//           "Buyer Name": inv.buyer_name || 'N/A', // Include buyer name in Excel for review
//           "Invoice Number": inv.inum,
//           "Invoice Date": inv.idt,
//           "Invoice Value": inv.val,
//           "Taxable Value": item.txval,
//           "Rate (%)": item.rt,
//           "CGST": item.camt,
//           "SGST": item.samt,
//         };
//       })
//     );
//     const worksheet = XLSX.utils.json_to_sheet(rows);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "GSTR1-B2B");
//     XLSX.writeFile(workbook, "gstr1_report.xlsx");
//   };

//   return (
//     <DashboardLayout>
//       <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
//         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
//           <h1 className="text-3xl md:text-4xl font-bold mb-2">GSTR-1 Report Generator</h1>
//           <p className="text-muted-foreground text-lg">
//             Automatically generate GSTR-1 reports from your saved data or by uploading invoice PDFs.
//           </p>
//         </motion.div>

//         {/* --- MODIFIED: Removed Tabs for a focused UI --- */}
//         <Card className="shadow-lg rounded-xl">
//           <CardHeader>
//             <CardTitle>Generate GSTR-1 Report</CardTitle>
//             <CardDescription>Choose to generate from your saved data or by uploading new PDF documents.</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
//               <Label className="font-semibold">Option 1: Generate from Your Saved Invoices</Label>
//               <div className="flex flex-col sm:flex-row items-center gap-4">
//                 <DatePickerWithRange date={date} setDate={setDate} className="w-full sm:w-auto"/>
//                 <Button className="w-full sm:w-auto" onClick={generateReportFromDB} disabled={isProcessing}>
//                   {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
//                   Generate from Database
//                 </Button>
//               </div>
//             </div>
            
//             <div className="relative flex items-center"><div className="flex-grow border-t"></div><span className="flex-shrink mx-4 text-muted-foreground">OR</span><div className="flex-grow border-t"></div></div>

//             <div className="space-y-4">
//               <Label className="font-semibold">Option 2: Generate by Uploading PDFs</Label>
//               <div onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}>
//                 <UploadCloud className="w-12 h-12 text-slate-400 mb-4" /><p className="text-lg text-slate-600"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
//                 <Input type="file" ref={fileInputRef} multiple accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
//               </div>

//               {selectedFiles.length > 0 && (
//                 <div className="space-y-2">
//                   <h3 className="font-medium text-sm">Selected Files:</h3>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     {selectedFiles.map((file, index) => (
//                       <div key={index} className="flex items-center justify-between bg-slate-100 p-2 rounded-md text-sm">
//                         <div className="flex items-center gap-2 overflow-hidden"><FileText className="w-4 h-4 text-slate-500 flex-shrink-0" /><span className="truncate">{file.name}</span></div>
//                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}><X className="w-4 h-4" /></Button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               <Button className="w-full sm:w-auto" onClick={generateReportFromPDFs} disabled={isProcessing || selectedFiles.length === 0}>
//                 {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : '📤 Process PDFs'}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
        
//         {/* --- ADDED: ref is attached to this div for auto-scrolling --- */}
//         {reportJson && (
//           <motion.div ref={resultsRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
//             <Card className="rounded-xl shadow-lg">
//               <CardHeader className="flex flex-row items-center justify-between">
//                 <div><CardTitle className="flex items-center gap-2"><FileCheck2/> Extracted GSTR-1 Data</CardTitle><CardDescription>Review the data extracted from your documents.</CardDescription></div>
//                 <div className="flex gap-2">
//                   <Button onClick={downloadAsExcel} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Excel</Button>
//                   <Button onClick={downloadAsJson} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> JSON</Button>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
//                   {reportJson.b2b?.map((entry: any, idx: number) => (
//                     <div key={idx} className="border rounded-lg bg-slate-50 text-sm overflow-hidden">
//                       <div className="px-4 py-2 font-semibold bg-slate-100 border-b">GSTIN: {entry.ctin}</div>
//                       <div className="p-4 space-y-3">
//                         {entry.inv.map((inv: any) => {
//                           const item = inv.itms?.[0]?.itm_det || {};
//                           return ( 
//                             <div key={inv.inum} className="border-b last:border-b-0 pb-3 last:pb-0 space-y-1">
//                                 <div className="flex justify-between font-semibold"><span>Invoice: {inv.inum}</span><span>{inv.idt}</span></div>
//                                 <div className="flex items-center text-muted-foreground"><User className="h-3 w-3 mr-1.5"/>{inv.buyer_name || 'N/A'}</div>
//                                 <div className="flex justify-between"><span>Value:</span><span>₹{inv.val.toFixed(2)}</span></div>
//                                 <div className="flex justify-between"><span>Taxable:</span><span>₹{item.txval.toFixed(2)}</span></div>
//                                 <div className="flex justify-between"><span>CGST+SGST:</span><span>₹{(item.camt + item.samt).toFixed(2)}</span></div>
//                             </div> 
//                           );
//                         })}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           </motion.div>
//         )}
//       </div>
//     </DashboardLayout>
//   );
// }