


// "use client";

// import { useEffect, useState, Suspense, useRef } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast";
// import Image from "next/image";
// import { useUserId } from "@/hooks/context/UserContext";
// import { motion } from "framer-motion";
// import { supabase } from "@/lib/supabase";
// import { UploadCloud, Package, Info, DollarSign, Warehouse, AlertTriangle, Ruler, Download, Loader, FileText, X, FileCheck2 } from "lucide-react";
// import { format } from 'date-fns';
// import { Calendar as CalendarIcon } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Calendar } from '@/components/ui/calendar';
// import { cn } from '@/lib/utils';
// import { DateRange } from 'react-day-picker';

// // Re-defining the component with the new modern UI/UX
// export default function ITRPage() {
//   const [date, setDate] = useState<DateRange | undefined>({
//     from: new Date(new Date().getFullYear(), 0, 1),
//     to: new Date(),
//   });
//   const [type, setType] = useState('sales');
//   const [customDuration, setCustomDuration] = useState(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [gstr1Json, setGstr1Json] = useState<any | null>(null);
//   const [processing, setProcessing] = useState<boolean>(false);
//   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
//   const [isDragging, setIsDragging] = useState(false);
//   const { toast } = useToast();

//   const handleFileChange = (files: FileList | null) => {
//     if (files) {
//       const newFiles = Array.from(files);
//       setSelectedFiles(prev => [...prev, ...newFiles]);
//     }
//   };
  
//   const removeFile = (index: number) => {
//     setSelectedFiles(prev => prev.filter((_, i) => i !== index));
//   };

//   const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsDragging(dragging);
//   };

//   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//     handleDragEvents(e, false);
//     const files = e.dataTransfer.files;
//     if (files && files.length > 0) {
//       handleFileChange(files);
//     }
//   };

//   const getparsedreport = async () => {
//     if (selectedFiles.length === 0) {
//       toast({
//         title: "No file selected",
//         description: `Please select or drop at least one PDF file.`,
//         variant: "destructive"
//       });
//       return;
//     }
//     setProcessing(true);
//     setGstr1Json(null); // Clear previous results

//     const formData = new FormData();
//     selectedFiles.forEach(file => formData.append('files', file));
//     formData.append('fp', '062024'); // Example static data
//     formData.append('cur_gt', '100000'); // Example static data

//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr`, {
//         method: 'POST',
//         body: formData,
//       });

//       const result = await res.json();
//       if (res.ok && result?.parsed_gstr1) {
//         setGstr1Json(result.parsed_gstr1);
//         toast({ title: '✅ Success', description: 'Invoices processed successfully.' });
//       } else {
//         throw new Error(result.error || 'An unknown error occurred during processing.');
//       }
//     } catch (err: any) {
//       toast({ title: `❌ Error`, description: err.message, variant: "destructive" });
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const downloadAsJson = () => {
//     if (!gstr1Json) return;
//     const blob = new Blob([JSON.stringify(gstr1Json, null, 2)], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'gstr1_export.json';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const downloadAsCSV = () => {
//     if (!gstr1Json?.b2b) return;
//     const header = ['Invoice No', 'Date', 'Value', 'GSTIN', 'CGST', 'SGST', 'Rate'];
//     const rows = gstr1Json.b2b.flatMap((entry: any) =>
//       entry.inv.map((inv: any) => {
//         const item = inv.itms?.[0]?.itm_det || {};
//         return [
//           inv.inum, inv.idt, inv.val, entry.ctin,
//           item.camt, item.samt, item.rt
//         ].map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`); // Sanitize cells
//       })
//     );
//     const csv = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
//     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'gstr1_export.csv';
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   return (
//     <DashboardLayout>
//       <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
//         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">GSTR-1 Report Generator</h1>
//           <p className="text-muted-foreground text-lg">
//             Automatically extract invoice data from PDFs to generate GSTR-1 reports.
//           </p>
//         </motion.div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
//           {/* Left Column: Instructions */}
//           <motion.div className="lg:col-span-1 space-y-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
//             <Card className="sticky top-24">
//               <CardHeader>
//                 <CardTitle>How It Works</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4 text-sm text-muted-foreground">
//                 <div className="flex items-start gap-4">
//                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
//                   <div>
//                     <h3 className="font-semibold text-slate-800">Upload Invoices</h3>
//                     <p>Drag and drop your invoice PDFs into the upload area, or click to select them from your device.</p>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-4">
//                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
//                   <div>
//                     <h3 className="font-semibold text-slate-800">Process with AI</h3>
//                     <p>Our AI will scan and extract all the necessary GSTR-1 data from your documents.</p>
//                   </div>
//                 </div>
//                 <div className="flex items-start gap-4">
//                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
//                   <div>
//                     <h3 className="font-semibold text-slate-800">Review & Download</h3>
//                     <p>Review the extracted data and download your report in either JSON or CSV format.</p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </motion.div>

//           {/* Right Column: Main Content */}
//           <motion.div className="lg:col-span-2 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
//             <Card className="shadow-lg rounded-xl">
//               <CardHeader>
//                 <CardTitle>Upload & Process</CardTitle>
//                 <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded-md text-sm mt-2">
//                   <strong>Note:</strong> Data is AI-generated. Please review carefully and edit fields as needed for accuracy.
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div
//                   onDragEnter={(e) => handleDragEvents(e, true)}
//                   onDragLeave={(e) => handleDragEvents(e, false)}
//                   onDragOver={(e) => e.preventDefault()}
//                   onDrop={handleDrop}
//                   className={cn(
//                     "relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
//                     isDragging ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
//                   )}
//                 >
//                   <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
//                   <p className="text-lg text-slate-600">
//                     <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
//                   </p>
//                   <p className="text-sm text-slate-500 mt-1">PDF files only</p>
//                   <Input
//                     type="file"
//                     ref={fileInputRef}
//                     multiple
//                     accept="application/pdf"
//                     onChange={(e) => handleFileChange(e.target.files)}
//                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//                   />
//                 </div>

//                 {selectedFiles.length > 0 && (
//                   <div className="space-y-2">
//                     <h3 className="font-medium text-sm">Selected Files:</h3>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                       {selectedFiles.map((file, index) => (
//                         <div key={index} className="flex items-center justify-between bg-slate-100 p-2 rounded-md text-sm">
//                           <div className="flex items-center gap-2 overflow-hidden">
//                             <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
//                             <span className="truncate">{file.name}</span>
//                           </div>
//                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
//                             <X className="w-4 h-4" />
//                           </Button>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}

//                 <Button className="w-full sm:w-auto" onClick={getparsedreport} disabled={processing || selectedFiles.length === 0}>
//                   {processing ? (
//                     <>
//                       <Loader className="mr-2 h-4 w-4 animate-spin" /> Processing...
//                     </>
//                   ) : (
//                     '📤 Process PDFs'
//                   )}
//                 </Button>
//               </CardContent>
//             </Card>

//             {gstr1Json?.b2b && (
//               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
//                 <Card className="rounded-xl shadow-lg">
//                   <CardHeader className="flex flex-row items-center justify-between">
//                     <div>
//                       <CardTitle className="flex items-center gap-2"><FileCheck2/> Extracted Invoices</CardTitle>
//                       <CardDescription>Review the data extracted from your documents.</CardDescription>
//                     </div>
//                     <div className="flex gap-2">
//                       <Button onClick={downloadAsCSV} variant="outline" size="sm">
//                         <Download className="mr-2 h-4 w-4" /> CSV
//                       </Button>
//                       <Button onClick={downloadAsJson} variant="outline" size="sm">
//                         <Download className="mr-2 h-4 w-4" /> JSON
//                       </Button>
//                     </div>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
//                       {gstr1Json.b2b.map((entry: any, idx: number) => (
//                         <div key={idx} className="border rounded-lg bg-slate-50 text-sm overflow-hidden">
//                           <div className="px-4 py-2 font-semibold bg-slate-100 border-b">
//                             GSTIN: {entry.ctin}
//                           </div>
//                           <div className="p-4 space-y-3">
//                             {entry.inv.map((inv: any) => {
//                               const item = inv.itms?.[0]?.itm_det || {};
//                               return (
//                                 <div key={inv.inum} className="border-b last:border-b-0 pb-3 last:pb-0">
//                                   <p><strong>Invoice:</strong> {inv.inum}</p>
//                                   <p><strong>Date:</strong> {inv.idt}</p>
//                                   <p><strong>Value:</strong> ₹{inv.val}</p>
//                                   <p><strong>Rate:</strong> {item.rt}%</p>
//                                   <p><strong>CGST/SGST:</strong> ₹{item.camt} / ₹{item.samt}</p>
//                                 </div>
//                               );
//                             })}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             )}
//           </motion.div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// }




"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { UploadCloud, Download, Loader2, FileText, X, FileCheck2, Database, User } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from 'react-day-picker';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Label } from "@/components/ui/label";

export default function GSTRPage() {
  const { userId, userSession } = useUserId();
  const { toast } = useToast();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: dayjs().startOf('month').toDate(),
    to: dayjs().endOf('month').toDate(),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null); // Ref for the results card
  const [reportJson, setReportJson] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // --- ADDED: Auto-scroll functionality ---
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">GSTR-1 Report Generator</h1>
          <p className="text-muted-foreground text-lg">
            Automatically generate GSTR-1 reports from your saved data or by uploading invoice PDFs.
          </p>
        </motion.div>

        {/* --- MODIFIED: Removed Tabs for a focused UI --- */}
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Generate GSTR-1 Report</CardTitle>
            <CardDescription>Choose to generate from your saved data or by uploading new PDF documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
              <Label className="font-semibold">Option 1: Generate from Your Saved Invoices</Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <DatePickerWithRange date={date} setDate={setDate} className="w-full sm:w-auto"/>
                <Button className="w-full sm:w-auto" onClick={generateReportFromDB} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                  Generate from Database
                </Button>
              </div>
            </div>
            
            <div className="relative flex items-center"><div className="flex-grow border-t"></div><span className="flex-shrink mx-4 text-muted-foreground">OR</span><div className="flex-grow border-t"></div></div>

            <div className="space-y-4">
              <Label className="font-semibold">Option 2: Generate by Uploading PDFs</Label>
              <div onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}>
                <UploadCloud className="w-12 h-12 text-slate-400 mb-4" /><p className="text-lg text-slate-600"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
                <Input type="file" ref={fileInputRef} multiple accept="application/pdf" onChange={(e) => handleFileChange(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Selected Files:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-100 p-2 rounded-md text-sm">
                        <div className="flex items-center gap-2 overflow-hidden"><FileText className="w-4 h-4 text-slate-500 flex-shrink-0" /><span className="truncate">{file.name}</span></div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}><X className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button className="w-full sm:w-auto" onClick={generateReportFromPDFs} disabled={isProcessing || selectedFiles.length === 0}>
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : '📤 Process PDFs'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* --- ADDED: ref is attached to this div for auto-scrolling --- */}
        {reportJson && (
          <motion.div ref={resultsRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="flex items-center gap-2"><FileCheck2/> Extracted GSTR-1 Data</CardTitle><CardDescription>Review the data extracted from your documents.</CardDescription></div>
                <div className="flex gap-2">
                  <Button onClick={downloadAsExcel} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Excel</Button>
                  <Button onClick={downloadAsJson} variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> JSON</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
                  {reportJson.b2b?.map((entry: any, idx: number) => (
                    <div key={idx} className="border rounded-lg bg-slate-50 text-sm overflow-hidden">
                      <div className="px-4 py-2 font-semibold bg-slate-100 border-b">GSTIN: {entry.ctin}</div>
                      <div className="p-4 space-y-3">
                        {entry.inv.map((inv: any) => {
                          const item = inv.itms?.[0]?.itm_det || {};
                          return ( 
                            <div key={inv.inum} className="border-b last:border-b-0 pb-3 last:pb-0 space-y-1">
                                <div className="flex justify-between font-semibold"><span>Invoice: {inv.inum}</span><span>{inv.idt}</span></div>
                                <div className="flex items-center text-muted-foreground"><User className="h-3 w-3 mr-1.5"/>{inv.buyer_name || 'N/A'}</div>
                                <div className="flex justify-between"><span>Value:</span><span>₹{inv.val.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Taxable:</span><span>₹{item.txval.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>CGST+SGST:</span><span>₹{(item.camt + item.samt).toFixed(2)}</span></div>
                            </div> 
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}