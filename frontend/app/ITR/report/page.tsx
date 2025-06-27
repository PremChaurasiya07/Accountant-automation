'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Download, Loader } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { DateRange } from 'react-day-picker'
import { toast } from '@/hooks/use-toast'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useToast } from '@/hooks/use-toast'

export default function ITRPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(),
  })
  const [type, setType] = useState('sales')
  const [customDuration, setCustomDuration] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [gstr1Json, setGstr1Json] = useState<any | null>(null)
  const [processing, setprocessing] = useState<boolean | null>(false)
  

  const handleDurationChange = (value: string) => {
    setCustomDuration(value === 'custom')
    const today = new Date()
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
    const fyStart = new Date(today.getFullYear(), 3, 1)
    const fyEnd = new Date(today.getFullYear() + 1, 2, 31)
    const lastFyStart = new Date(today.getFullYear() - 1, 3, 1)
    const lastFyEnd = new Date(today.getFullYear(), 2, 31)

    switch (value) {
      case 'this_month': setDate({ from: startOfThisMonth, to: today }); break
      case 'last_month': setDate({ from: startOfLastMonth, to: endOfLastMonth }); break
      case 'last_3_months': setDate({ from: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()), to: today }); break
      case 'last_6_months': setDate({ from: new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()), to: today }); break
      case 'this_fy': setDate({ from: fyStart, to: fyEnd }); break
      case 'last_fy': setDate({ from: lastFyStart, to: lastFyEnd }); break
      case 'custom': setDate(undefined); break
    }
  }

  const getparsedreport = async () => {
    
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) {
      toast({
          title: "No file selected",
          description: `Atleast select one file`,
      });
      return
    }
    setprocessing(true)

    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))
    formData.append('fp', '062024')
    formData.append('cur_gt', '100000')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ocr`, {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (res.ok && result?.parsed_gstr1) {
        setGstr1Json(result.parsed_gstr1)
        toast({title:'✅ Invoices processed successfully'})
      } else {
        toast({title:`❌ Error: ${result.error || 'Unknown error'}`})
      }
      setprocessing(false)
    } catch (err) {
      toast({title:`❌ Network Error: ${err}`})
    }
  }

  const downloadAsJson = () => {
    if (!gstr1Json) return
    const blob = new Blob([JSON.stringify(gstr1Json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gstr1_export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadAsCSV = () => {
    if (!gstr1Json?.b2b) return
    const header = ['Invoice No', 'Date', 'Value', 'GSTIN', 'CGST', 'SGST', 'Rate']
    const rows = gstr1Json.b2b.flatMap((entry: any) =>
      entry.inv.map((inv: any) => {
        const item = inv.itms?.[0]?.itm_det || {}
        return [
          inv.inum,
          inv.idt,
          inv.val,
          entry.ctin,
          item.camt,
          item.samt,
          item.rt
        ]
      })
    )
    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gstr1_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">🧾 ITR GST-1 Export</h1>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="bg-muted mb-6 w-full flex justify-center">
            {/* <TabsTrigger value="export">📂 Filter & Download</TabsTrigger> */}
            <TabsTrigger value="upload">📄 Free Upload Tool</TabsTrigger>
          </TabsList>

          {/* ✅ KEEPING YOUR ORIGINAL TAB AS-IS */}
          {/* <TabsContent value="export">
           <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-medium">📆 Duration</label>
                    <Select defaultValue="this_fy" onValueChange={handleDurationChange}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                        <SelectItem value="this_fy">This Financial Year</SelectItem>
                        <SelectItem value="last_fy">Last Financial Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-medium">📦 Invoice Type</label>
                    <Select defaultValue="sales" onValueChange={setType}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {customDuration && (
                    <div className="flex flex-col space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium">📅 Custom Date Range</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from && date?.to ? (
                              <>
                                {format(date.from, 'LLL dd, yyyy')} – {format(date.to, 'LLL dd, yyyy')}
                              </>
                            ) : (
                              <span>Select range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            numberOfMonths={2}
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row justify-end gap-3">
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={downloadAsCSV}>
                    <Download className="mr-2 w-4 h-4" /> Download CSV
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={downloadAsJson}>
                    <Download className="mr-2 w-4 h-4" /> Download JSON
                  </Button>
                </div>

                {gstr1Json?.b2b?.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-md font-medium">🧾 GSTR-1 Extracted Invoices:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gstr1Json.b2b.map((entry: any, idx: number) => (
                        <div
                          key={idx}
                          className="border rounded-lg bg-muted text-sm overflow-hidden flex flex-col h-64"
                        >
                          <div className="px-4 py-2 font-semibold bg-muted-foreground/10 border-b">
                            GSTIN: {entry.ctin}
                          </div>
                          <div className="p-4 overflow-y-auto whitespace-pre-wrap text-muted-foreground flex-1">
                            {entry.inv.map((inv: any) => (
                              <div key={inv.inum} className="mb-3">
                                <strong>Invoice:</strong> {inv.inum}<br />
                                <strong>Date:</strong> {inv.idt}<br />
                                <strong>Value:</strong> ₹{inv.val}<br />
                                <strong>CGST/SGST:</strong> ₹{inv.itms[0]?.itm_det.camt} / ₹{inv.itms[0]?.itm_det.samt}<br />
                                <strong>Rate:</strong> {inv.itms[0]?.itm_det.rt}%
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* ✅ Upload & Show Result in Same Tab */}
          <TabsContent value="upload">
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg mb-4">
              ⚠️ <strong>Note:</strong> The details below are <strong>AI-generated</strong> in an ethical, best-effort manner using OCR.
              Please <strong>review carefully</strong> and <span className="underline">manually edit</span> the <strong>turnover</strong> and <strong>duration</strong> fields as needed to ensure accuracy.
            </div>
            <Card className="rounded-2xl shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-medium">📄 Upload Invoice PDFs</h2>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="application/pdf"
                  className="border rounded p-2 w-full"
                />
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={getparsedreport}>
                  
                  {(processing)?(<Loader/>):('📤 Process PDFs')}
                </Button>

                {gstr1Json?.b2b && (
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-end">
                      <Button onClick={downloadAsCSV} variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download CSV
                      </Button>
                      <Button onClick={downloadAsJson} variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download JSON
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {gstr1Json.b2b.map((entry: any, idx: number) => (
                        <div key={idx} className="border rounded-lg bg-muted p-4 text-sm">
                          <div className="font-semibold mb-2">GSTIN: {entry.ctin}</div>
                          {entry.inv.map((inv: any) => {
                            const item = inv.itms?.[0]?.itm_det || {}
                            return (
                              <div key={inv.inum} className="mb-3">
                                <strong>Invoice:</strong> {inv.inum}<br />
                                <strong>Date:</strong> {inv.idt}<br />
                                <strong>Value:</strong> ₹{inv.val}<br />
                                <strong>Rate:</strong> {item.rt}%<br />
                                <strong>CGST/SGST:</strong> ₹{item.camt} / ₹{item.samt}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
