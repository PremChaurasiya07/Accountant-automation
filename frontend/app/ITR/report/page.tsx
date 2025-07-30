// 'use client'

// import { useState, useRef } from 'react'
// import { format } from 'date-fns'
// import { CalendarIcon, Download, Loader } from 'lucide-react'
// import { Card, CardContent } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// import { Calendar } from '@/components/ui/calendar'
// import { cn } from '@/lib/utils'
// import { DateRange } from 'react-day-picker'
// import { toast } from '@/hooks/use-toast'
// import { DashboardLayout } from '@/components/dashboard-layout'
// import { useToast } from '@/hooks/use-toast'

// export default function ITRPage() {
//   const [date, setDate] = useState<DateRange | undefined>({
//     from: new Date(new Date().getFullYear(), 0, 1),
//     to: new Date(),
//   })
//   const [type, setType] = useState('sales')
//   const [customDuration, setCustomDuration] = useState(false)
//   const fileInputRef = useRef<HTMLInputElement>(null)
//   const [gstr1Json, setGstr1Json] = useState<any | null>(null)
//   const [processing, setprocessing] = useState<boolean | null>(false)
  

//   const handleDurationChange = (value: string) => {
//     setCustomDuration(value === 'custom')
//     const today = new Date()
//     const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
//     const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
//     const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
//     const fyStart = new Date(today.getFullYear(), 3, 1)
//     const fyEnd = new Date(today.getFullYear() + 1, 2, 31)
//     const lastFyStart = new Date(today.getFullYear() - 1, 3, 1)
//     const lastFyEnd = new Date(today.getFullYear(), 2, 31)

//     switch (value) {
//       case 'this_month': setDate({ from: startOfThisMonth, to: today }); break
//       case 'last_month': setDate({ from: startOfLastMonth, to: endOfLastMonth }); break
//       case 'last_3_months': setDate({ from: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()), to: today }); break
//       case 'last_6_months': setDate({ from: new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()), to: today }); break
//       case 'this_fy': setDate({ from: fyStart, to: fyEnd }); break
//       case 'last_fy': setDate({ from: lastFyStart, to: lastFyEnd }); break
//       case 'custom': setDate(undefined); break
//     }
//   }

//   const getparsedreport = async () => {
    
//     const files = fileInputRef.current?.files
//     if (!files || files.length === 0) {
//       toast({
//           title: "No file selected",
//           description: `Atleast select one file`,
//       });
//       return
//     }
//     setprocessing(true)

//     const formData = new FormData()
//     Array.from(files).forEach(file => formData.append('files', file))
//     formData.append('fp', '062024')
//     formData.append('cur_gt', '100000')

//     try {
//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr`, {
//         method: 'POST',
//         body: formData,
//       })

//       const result = await res.json()
//       if (res.ok && result?.parsed_gstr1) {
//         setGstr1Json(result.parsed_gstr1)
//         toast({title:'✅ Invoices processed successfully'})
//       } else {
//         toast({title:`❌ Error: ${result.error || 'Unknown error'}`})
//       }
//       setprocessing(false)
//     } catch (err) {
//       toast({title:`❌ Network Error: ${err}`})
//     }
//   }

//   const downloadAsJson = () => {
//     if (!gstr1Json) return
//     const blob = new Blob([JSON.stringify(gstr1Json, null, 2)], { type: 'application/json' })
//     const url = URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = 'gstr1_export.json'
//     a.click()
//     URL.revokeObjectURL(url)
//   }

//   const downloadAsCSV = () => {
//     if (!gstr1Json?.b2b) return
//     const header = ['Invoice No', 'Date', 'Value', 'GSTIN', 'CGST', 'SGST', 'Rate']
//     const rows = gstr1Json.b2b.flatMap((entry: any) =>
//       entry.inv.map((inv: any) => {
//         const item = inv.itms?.[0]?.itm_det || {}
//         return [
//           inv.inum,
//           inv.idt,
//           inv.val,
//           entry.ctin,
//           item.camt,
//           item.samt,
//           item.rt
//         ]
//       })
//     )
//     const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
//     const blob = new Blob([csv], { type: 'text/csv' })
//     const url = URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = 'gstr1_export.csv'
//     a.click()
//     URL.revokeObjectURL(url)
//   }

//   return (
//     <DashboardLayout>
//       <div className="p-6 max-w-5xl mx-auto w-full">
//         <h1 className="text-3xl font-bold mb-6 text-center">🧾 ITR GST-1 Export</h1>

//         <Tabs defaultValue="upload" className="w-full">
//           <TabsList className="bg-muted mb-6 w-full flex justify-center">
//             {/* <TabsTrigger value="export">📂 Filter & Download</TabsTrigger> */}
//             <TabsTrigger value="upload">📄 Free Upload Tool</TabsTrigger>
//           </TabsList>

//           {/* ✅ KEEPING YOUR ORIGINAL TAB AS-IS */}
//           {/* <TabsContent value="export">
//            <Card className="rounded-2xl shadow-lg">
//               <CardContent className="p-6 space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                   <div className="flex flex-col space-y-1.5">
//                     <label className="text-sm font-medium">📆 Duration</label>
//                     <Select defaultValue="this_fy" onValueChange={handleDurationChange}>
//                       <SelectTrigger className="w-full"><SelectValue placeholder="Select duration" /></SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="this_month">This Month</SelectItem>
//                         <SelectItem value="last_month">Last Month</SelectItem>
//                         <SelectItem value="last_3_months">Last 3 Months</SelectItem>
//                         <SelectItem value="last_6_months">Last 6 Months</SelectItem>
//                         <SelectItem value="this_fy">This Financial Year</SelectItem>
//                         <SelectItem value="last_fy">Last Financial Year</SelectItem>
//                         <SelectItem value="custom">Custom Range</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div className="flex flex-col space-y-1.5">
//                     <label className="text-sm font-medium">📦 Invoice Type</label>
//                     <Select defaultValue="sales" onValueChange={setType}>
//                       <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="sales">Sales</SelectItem>
//                         <SelectItem value="purchase">Purchase</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   {customDuration && (
//                     <div className="flex flex-col space-y-1.5 md:col-span-2">
//                       <label className="text-sm font-medium">📅 Custom Date Range</label>
//                       <Popover>
//                         <PopoverTrigger asChild>
//                           <Button variant="outline" className="w-full justify-start text-left font-normal">
//                             <CalendarIcon className="mr-2 h-4 w-4" />
//                             {date?.from && date?.to ? (
//                               <>
//                                 {format(date.from, 'LLL dd, yyyy')} – {format(date.to, 'LLL dd, yyyy')}
//                               </>
//                             ) : (
//                               <span>Select range</span>
//                             )}
//                           </Button>
//                         </PopoverTrigger>
//                         <PopoverContent className="w-auto p-0" align="start">
//                           <Calendar
//                             mode="range"
//                             numberOfMonths={2}
//                             selected={date}
//                             onSelect={setDate}
//                             initialFocus
//                           />
//                         </PopoverContent>
//                       </Popover>
//                     </div>
//                   )}
//                 </div>

//                 <div className="flex flex-col md:flex-row justify-end gap-3">
//                   <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={downloadAsCSV}>
//                     <Download className="mr-2 w-4 h-4" /> Download CSV
//                   </Button>
//                   <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={downloadAsJson}>
//                     <Download className="mr-2 w-4 h-4" /> Download JSON
//                   </Button>
//                 </div>

//                 {gstr1Json?.b2b?.length > 0 && (
//                   <div className="mt-6 space-y-4">
//                     <h3 className="text-md font-medium">🧾 GSTR-1 Extracted Invoices:</h3>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       {gstr1Json.b2b.map((entry: any, idx: number) => (
//                         <div
//                           key={idx}
//                           className="border rounded-lg bg-muted text-sm overflow-hidden flex flex-col h-64"
//                         >
//                           <div className="px-4 py-2 font-semibold bg-muted-foreground/10 border-b">
//                             GSTIN: {entry.ctin}
//                           </div>
//                           <div className="p-4 overflow-y-auto whitespace-pre-wrap text-muted-foreground flex-1">
//                             {entry.inv.map((inv: any) => (
//                               <div key={inv.inum} className="mb-3">
//                                 <strong>Invoice:</strong> {inv.inum}<br />
//                                 <strong>Date:</strong> {inv.idt}<br />
//                                 <strong>Value:</strong> ₹{inv.val}<br />
//                                 <strong>CGST/SGST:</strong> ₹{inv.itms[0]?.itm_det.camt} / ₹{inv.itms[0]?.itm_det.samt}<br />
//                                 <strong>Rate:</strong> {inv.itms[0]?.itm_det.rt}%
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent> */}

//           {/* ✅ Upload & Show Result in Same Tab */}
//           <TabsContent value="upload">
//               <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-4">
//               ⚠️ <strong>Note:</strong> The details below are <strong>AI-generated</strong> in an ethical, best-effort manner using OCR.
//               Please <strong>review carefully</strong> and <span className="underline">manually edit</span> the <strong>turnover</strong> and <strong>duration</strong> fields as needed to ensure accuracy.
//             </div>
//             <Card className="rounded-2xl shadow-lg">
//               <CardContent className="p-6 space-y-4">
//                 <h2 className="text-lg font-medium">📄 Upload Invoice PDFs</h2>
//                 <input
//                   type="file"
//                   ref={fileInputRef}
//                   multiple
//                   accept="application/pdf"
//                   className="border rounded p-2 w-full"
//                 />
//                 <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={getparsedreport}>
                  
//                   {(processing)?(<Loader/>):('📤 Process PDFs')}
//                 </Button>

//                 {gstr1Json?.b2b && (
//                   <div className="mt-6 space-y-4">
//                     <div className="flex flex-col md:flex-row gap-4 justify-end">
//                       <Button onClick={downloadAsCSV} variant="outline">
//                         <Download className="mr-2 h-4 w-4" /> Download CSV
//                       </Button>
//                       <Button onClick={downloadAsJson} variant="outline">
//                         <Download className="mr-2 h-4 w-4" /> Download JSON
//                       </Button>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       {gstr1Json.b2b.map((entry: any, idx: number) => (
//                         <div key={idx} className="border rounded-lg bg-muted p-4 text-sm">
//                           <div className="font-semibold mb-2">GSTIN: {entry.ctin}</div>
//                           {entry.inv.map((inv: any) => {
//                             const item = inv.itms?.[0]?.itm_det || {}
//                             return (
//                               <div key={inv.inum} className="mb-3">
//                                 <strong>Invoice:</strong> {inv.inum}<br />
//                                 <strong>Date:</strong> {inv.idt}<br />
//                                 <strong>Value:</strong> ₹{inv.val}<br />
//                                 <strong>Rate:</strong> {item.rt}%<br />
//                                 <strong>CGST/SGST:</strong> ₹{item.camt} / ₹{item.samt}
//                               </div>
//                             )
//                           })}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </DashboardLayout>
//   )
// }


"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useUserId } from "@/hooks/context/UserContext";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { UploadCloud, Package, Info, DollarSign, Warehouse, AlertTriangle, Ruler, Download, Loader, FileText, X, FileCheck2 } from "lucide-react";
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

// Re-defining the component with the new modern UI/UX
export default function ITRPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(),
  });
  const [type, setType] = useState('sales');
  const [customDuration, setCustomDuration] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gstr1Json, setGstr1Json] = useState<any | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files);
    }
  };

  const getparsedreport = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No file selected",
        description: `Please select or drop at least one PDF file.`,
        variant: "destructive"
      });
      return;
    }
    setProcessing(true);
    setGstr1Json(null); // Clear previous results

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));
    formData.append('fp', '062024'); // Example static data
    formData.append('cur_gt', '100000'); // Example static data

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result?.parsed_gstr1) {
        setGstr1Json(result.parsed_gstr1);
        toast({ title: '✅ Success', description: 'Invoices processed successfully.' });
      } else {
        throw new Error(result.error || 'An unknown error occurred during processing.');
      }
    } catch (err: any) {
      toast({ title: `❌ Error`, description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const downloadAsJson = () => {
    if (!gstr1Json) return;
    const blob = new Blob([JSON.stringify(gstr1Json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gstr1_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsCSV = () => {
    if (!gstr1Json?.b2b) return;
    const header = ['Invoice No', 'Date', 'Value', 'GSTIN', 'CGST', 'SGST', 'Rate'];
    const rows = gstr1Json.b2b.flatMap((entry: any) =>
      entry.inv.map((inv: any) => {
        const item = inv.itms?.[0]?.itm_det || {};
        return [
          inv.inum, inv.idt, inv.val, entry.ctin,
          item.camt, item.samt, item.rt
        ].map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`); // Sanitize cells
      })
    );
    const csv = [header.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gstr1_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">GSTR-1 Report Generator</h1>
          <p className="text-muted-foreground text-lg">
            Automatically extract invoice data from PDFs to generate GSTR-1 reports.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Instructions */}
          <motion.div className="lg:col-span-1 space-y-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Upload Invoices</h3>
                    <p>Drag and drop your invoice PDFs into the upload area, or click to select them from your device.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Process with AI</h3>
                    <p>Our AI will scan and extract all the necessary GSTR-1 data from your documents.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Review & Download</h3>
                    <p>Review the extracted data and download your report in either JSON or CSV format.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column: Main Content */}
          <motion.div className="lg:col-span-2 space-y-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle>Upload & Process</CardTitle>
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded-md text-sm mt-2">
                  <strong>Note:</strong> Data is AI-generated. Please review carefully and edit fields as needed for accuracy.
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  onDragEnter={(e) => handleDragEvents(e, true)}
                  onDragLeave={(e) => handleDragEvents(e, false)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    isDragging ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
                  )}
                >
                  <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
                  <p className="text-lg text-slate-600">
                    <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-slate-500 mt-1">PDF files only</p>
                  <Input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="application/pdf"
                    onChange={(e) => handleFileChange(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Selected Files:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-100 p-2 rounded-md text-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full sm:w-auto" onClick={getparsedreport} disabled={processing || selectedFiles.length === 0}>
                  {processing ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    '📤 Process PDFs'
                  )}
                </Button>
              </CardContent>
            </Card>

            {gstr1Json?.b2b && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-xl shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2"><FileCheck2/> Extracted Invoices</CardTitle>
                      <CardDescription>Review the data extracted from your documents.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={downloadAsCSV} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> CSV
                      </Button>
                      <Button onClick={downloadAsJson} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> JSON
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto p-1">
                      {gstr1Json.b2b.map((entry: any, idx: number) => (
                        <div key={idx} className="border rounded-lg bg-slate-50 text-sm overflow-hidden">
                          <div className="px-4 py-2 font-semibold bg-slate-100 border-b">
                            GSTIN: {entry.ctin}
                          </div>
                          <div className="p-4 space-y-3">
                            {entry.inv.map((inv: any) => {
                              const item = inv.itms?.[0]?.itm_det || {};
                              return (
                                <div key={inv.inum} className="border-b last:border-b-0 pb-3 last:pb-0">
                                  <p><strong>Invoice:</strong> {inv.inum}</p>
                                  <p><strong>Date:</strong> {inv.idt}</p>
                                  <p><strong>Value:</strong> ₹{inv.val}</p>
                                  <p><strong>Rate:</strong> {item.rt}%</p>
                                  <p><strong>CGST/SGST:</strong> ₹{item.camt} / ₹{item.samt}</p>
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
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
