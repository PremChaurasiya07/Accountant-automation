"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar as CalendarIcon, Download, FileText, X, FileCheck2, Database, UploadCloud, User } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useUserId } from '@/hooks/context/UserContext';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'framer-motion';
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';

// --- Interfaces ---
interface GstrB2BEntry {
    ctin: string; // GSTIN
    inv: GstrInvoice[];
}
interface GstrInvoice {
    inum: string;
    idt: string;
    val: number;
    buyer_name?: string; // This is for UI only
    itms?: { itm_det: GstrItemDetail }[];
}
interface GstrItemDetail {
    txval: number;
    rt: number;
    camt: number;
    samt: number;
}
interface GstrReport {
    b2b: GstrB2BEntry[];
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// --- Main Component ---
export default function GSTRPage() {
    const { userId, userSession } = useUserId();
    const { toast } = useToast();
    
    const [date, setDate] = useState<DateRange | undefined>({
        from: dayjs().startOf('month').toDate(),
        to: dayjs().endOf('month').toDate(),
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [reportJson, setReportJson] = useState<GstrReport | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (reportJson && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [reportJson]);

    const handleFileChange = (files: FileList | null) => { if (files) setSelectedFiles(prev => [...prev, ...Array.from(files)]); };
    const removeFile = (index: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => { e.preventDefault(); e.stopPropagation(); setIsDragging(dragging); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e, false); if (e.dataTransfer.files) handleFileChange(e.dataTransfer.files); };

    const generateReportFromDB = async () => {
    if (!date?.from || !date?.to) {
        toast({ title: "Date range required", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    setReportJson(null);
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/reports/gstr1-from-db`, {
            method: 'POST',
            credentials: "include",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
            body: JSON.stringify({ start_date: dayjs(date.from).format('YYYY-MM-DD'), end_date: dayjs(date.to).format('YYYY-MM-DD') }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || `Failed to generate GSTR-1 report.`);
        
        setReportJson(result.data);
        toast({ title: '✅ Report Generated', description: `GSTR-1 report created from your saved data.` });
    } catch (err: any) {
        toast({ title: '❌ Error', description: err.message, variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const generateReportFromPDFs = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setReportJson(null);
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr/gstr1-from-pdf`, { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'An unknown error occurred.');
      
      setReportJson(result.parsed_gstr1);
      toast({ title: '✅ Success', description: 'Invoices processed successfully.' });
    } catch (err: any) {
      toast({ title: `❌ Error`, description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // --- MODIFIED & ENHANCED DOWNLOAD FUNCTIONS ---
  const downloadAsJson = () => {
    if (!reportJson) return;
    // Create a deep copy to avoid modifying the state
    const cleanJson = JSON.parse(JSON.stringify(reportJson));
    
    // Remove the non-compliant 'buyer_name' field before downloading
    if (cleanJson.b2b) {
        cleanJson.b2b.forEach((entry: any) => {
            entry.inv.forEach((inv: any) => {
                delete inv.buyer_name;
            });
        });
    }

    const blob = new Blob([JSON.stringify(cleanJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gstr1_report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsExcel = () => {
    if (!reportJson?.b2b) return;
    const rows = reportJson.b2b.flatMap((entry: any) =>
      entry.inv.map((inv: any) => {
        const item = inv.itms?.[0]?.itm_det || {};
        return {
          "Buyer GSTIN": entry.ctin,
          "Buyer Name": inv.buyer_name || 'N/A', // Include buyer name in Excel for review
          "Invoice Number": inv.inum,
          "Invoice Date": inv.idt,
          "Invoice Value": inv.val,
          "Taxable Value": item.txval,
          "Rate (%)": item.rt,
          "CGST": item.camt,
          "SGST": item.samt,
        };
      })
    );
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GSTR1-B2B");
    XLSX.writeFile(workbook, "gstr1_report.xlsx");
  };


    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">GSTR-1 Report Generator</h1>
                    <p className="text-muted-foreground text-base md:text-lg">
                        Generate compliant GSTR-1 JSON files from your saved data or by uploading invoice PDFs.
                    </p>
                </motion.div>

                <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {/* --- Option 1: Generate from Database --- */}
                    <motion.div variants={itemVariants}>
                        <Card className="shadow-sm h-full">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Database className="h-6 w-6 text-blue-600 dark:text-blue-400"/></div>
                                    <div>
                                        <CardTitle>From Vyapari Data</CardTitle>
                                        <CardDescription>Use your saved invoices.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Date Range</Label>
                                    <DatePickerWithRange date={date} setDate={setDate} className="w-full"/>
                                </div>
                                <Button className="w-full" onClick={generateReportFromDB} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck2 className="mr-2 h-4 w-4"/>}
                                    Generate Report
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                    
                    {/* --- Option 2: Generate from PDFs --- */}
                    <motion.div variants={itemVariants}>
                        <Card className="shadow-sm h-full">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><FileText className="h-6 w-6 text-green-600 dark:text-green-400"/></div>
                                    <div>
                                        <CardTitle>From PDF Invoices</CardTitle>
                                        <CardDescription>Upload and process files.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-muted bg-muted/50 hover:border-muted-foreground/50"}`}>
                                    <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" /><p className="text-sm text-center text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                                    <Input type="file" ref={fileInputRef} multiple accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                </div>
                                
                                {selectedFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                                                    <div className="flex items-center gap-2 overflow-hidden"><FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{file.name}</span></div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(index)}><X className="w-4 h-4" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <Button className="w-full" onClick={generateReportFromPDFs} disabled={isProcessing || selectedFiles.length === 0}>
                                    {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : '📤 Process PDFs'}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
                
                {/* --- Results Section --- */}
                {reportJson && (
                    <motion.div ref={resultsRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="rounded-xl shadow-lg">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div><CardTitle className="flex items-center gap-2"><FileCheck2/> Extracted GSTR-1 Data</CardTitle><CardDescription>Review the B2B data extracted from your documents.</CardDescription></div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button onClick={downloadAsExcel} variant="outline" size="sm" className="w-1/2 sm:w-auto"><Download className="mr-2 h-4 w-4" /> Excel</Button>
                                    <Button onClick={downloadAsJson} variant="outline" size="sm" className="w-1/2 sm:w-auto"><Download className="mr-2 h-4 w-4" /> JSON</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="multiple" className="w-full">
                                    {reportJson.b2b?.map((entry, idx) => (
                                        <AccordionItem value={`item-${idx}`} key={idx}>
                                            <AccordionTrigger className="font-mono text-sm px-2">
                                                {entry.ctin}
                                                <Badge variant="secondary" className="ml-2">{entry.inv.length} Invoices</Badge>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2 space-y-2">
                                                {entry.inv.map((inv) => (
                                                    <div key={inv.inum} className="border rounded-md p-3 text-xs space-y-2">
                                                        <div className="flex justify-between font-semibold"><span>Invoice: {inv.inum}</span><span>{inv.idt}</span></div>
                                                        <div className="flex items-center text-muted-foreground"><User className="h-3 w-3 mr-1.5"/>{inv.buyer_name || 'N/A'}</div>
                                                        <div className="border-t pt-2 space-y-1">
                                                            <div className="flex justify-between"><span>Value:</span><span>₹{inv.val.toFixed(2)}</span></div>
                                                            <div className="flex justify-between"><span>Taxable:</span><span>₹{inv.itms?.[0]?.itm_det?.txval.toFixed(2) || '0.00'}</span></div>
                                                            <div className="flex justify-between"><span>Total Tax:</span><span>₹{((inv.itms?.[0]?.itm_det?.camt || 0) + (inv.itms?.[0]?.itm_det?.samt || 0)).toFixed(2)}</span></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    </motion.div>
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