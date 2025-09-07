

// "use client";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
// import { Button } from "../../../../components/ui/button";
// import { Input } from "../../../../components/ui/input";
// import { Label } from "../../../../components/ui/label";
// import { Textarea } from "../../../../components/ui/textarea";
// import { useState, useMemo, useEffect } from "react";
// import { supabase } from "../../../../lib/supabase";
// import { useUserId } from "../../../../hooks/context/UserContext";
// import { Loader, FileText, User, Building, Banknote, Trash2, PlusCircle, Save } from "lucide-react";
// import { Skeleton } from "../../../../components/ui/skeleton";
// import { useToast } from "../../../../hooks/use-toast";
// import { useParams } from "next/navigation";

// // --- TYPE DEFINITIONS (No changes) ---
// interface Product {
//   srNo: number;
//   description: string;
//   hsn: string;
//   quantity: number | '';
//   rate: number | '';
//   amount: number;
// }

// interface Seller {
//   id: string;
//   name?: string;
//   address?: string;
//   gst_no?: string;
//   contact?: string;
//   email?: string;
//   pan_no?: string;
//   logo?: string;
//   sign?: string;
//   stamp?: string;
// }

// interface FullInvoiceData {
//   invoice_date: string;
//   invoice_no: string;
//   client_name: string;
//   client_address: string;
//   client_gstin: string;
//   client_phone: string;
//   products: Product[];
//   gst_percentage: number;
//   sub_total: number;
//   cgst_amount: number;
//   sgst_amount: number;
//   total_gst_amount: number;
//   total_amount: number;
//   challan_date: string;
//   challan_no: string;
//   purchase_date: string;
//   purchase_no: string;
//   vehicle_no: string;
//   buyer_id: string | null;
//   seller_id: string | null;
// }

// // --- HELPER FUNCTION (No changes) ---
// function numberToWords(num: number): string {
//     if (num === 0) return "Zero Rupees Only.";
//     const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
//     const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
//     const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
//     const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

//     function convertLessThanOneThousand(n: number): string {
//         let result = "";
//         if (n >= 100) {
//             result += units[Math.floor(n / 100)] + " Hundred ";
//             n %= 100;
//         }
//         if (n >= 20) {
//             result += tens[Math.floor(n / 10)] + " ";
//             n %= 10;
//         }
//         if (n >= 10) {
//             result += teens[n - 10] + " ";
//             n = 0;
//         }
//         if (n > 0) {
//             result += units[n] + " ";
//         }
//         return result.trim();
//     }

//     let words = "";
//     let i = 0;
//     if (num < 0) {
//         words = "Minus ";
//         num = Math.abs(num);
//     }
//     const integerPart = Math.floor(num);
//     const decimalPart = Math.round((num - integerPart) * 100);
//     let integerWords = "";
//     let tempNum = integerPart;

//     if (tempNum === 0) {
//         integerWords = "Zero";
//     } else {
//         while (tempNum > 0) {
//             const chunk = tempNum % 1000;
//             if (chunk !== 0) {
//                 const chunkWords = convertLessThanOneThousand(chunk);
//                 integerWords = chunkWords + " " + scales[i] + " " + integerWords;
//             }
//             tempNum = Math.floor(tempNum / 1000);
//             i++;
//         }
//     }
//     words += integerWords.trim();
//     if (decimalPart > 0) {
//         const decimalWords = convertLessThanOneThousand(decimalPart);
//         words += " And " + decimalWords + " Paise";
//     } else {
//         words += " Rupees";
//     }
//     words = words.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
//     words = words.replace(/\s+/g, ' ');
//     return words + " Only.";
// }


// // --- UI SUB-COMPONENTS for better structure and readability ---

// const PageHeader = () => (
//     <div>
//         <h1 className="text-3xl font-bold tracking-tight">Edit Bill</h1>
//         <p className="text-muted-foreground">Modify the details of the billing invoice below.</p>
//     </div>
// );

// const FormSectionCard = ({ title, description, icon, children }: { title: string, description?: string, icon: React.ReactNode, children: React.ReactNode }) => (
//     <Card>
//         <CardHeader className="flex flex-row items-center gap-4 space-y-0">
//             <div className="grid gap-1">
//                 <CardTitle className="flex items-center">
//                     {icon}
//                     <span className="ml-2">{title}</span>
//                 </CardTitle>
//                 {description && <CardDescription>{description}</CardDescription>}
//             </div>
//         </CardHeader>
//         <CardContent>{children}</CardContent>
//     </Card>
// );

// const LoadingSkeleton = () => (
//     <div className="p-4 md:p-6 space-y-6">
//         <Skeleton className="h-12 w-1/3" />
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             <div className="lg:col-span-2 space-y-6">
//                 <Skeleton className="h-48 w-full" />
//                 <Skeleton className="h-64 w-full" />
//             </div>
//             <div className="lg:col-span-1 space-y-6">
//                 <Skeleton className="h-32 w-full" />
//                 <Skeleton className="h-32 w-full" />
//             </div>
//         </div>
//     </div>
// );


// // --- MAIN INVOICE EDIT COMPONENT ---
// export default function InvoiceEditPage() {
//     const { id } = useParams();
//     const { userId, userSession } = useUserId();
//     const { toast } = useToast();

//     const today = new Date().toISOString().split('T')[0];

//     const [seller, setSeller] = useState<Seller | null>(null);
//     const [creating, setCreating] = useState<boolean>(false);
//     const [loadingInvoice, setLoadingInvoice] = useState<boolean>(true);

//     const [fullInvoiceData, setFullInvoiceData] = useState<FullInvoiceData>({
//         invoice_date: today,
//         invoice_no: "",
//         client_name: "",
//         client_address: "",
//         client_gstin: "",
//         client_phone: "",
//         products: [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
//         gst_percentage: 18,
//         sub_total: 0,
//         cgst_amount: 0,
//         sgst_amount: 0,
//         total_gst_amount: 0,
//         total_amount: 0,
//         challan_date: "",
//         challan_no: "",
//         purchase_date: "",
//         purchase_no: "",
//         vehicle_no: "",
//         buyer_id: null,
//         seller_id: null,
//     });

//     // --- DATA FETCHING & LOGIC (No changes to functionality) ---
//     useEffect(() => {
//         if (!userId) return;
//         const checkCompanyInfo = async () => {
//             const { data, error } = await supabase.from("sellers_record").select("*, id").eq("user_id", userId).single();
//             if (error) {
//                 console.error("Error fetching company details:", error);
//             } else if (!data) {
//                 window.location.href = "/company_details";
//             } else {
//                 setSeller(data);
//                 setFullInvoiceData(prev => ({ ...prev, seller_id: data.id }));
//             }
//         };
//         checkCompanyInfo();
//     }, [userId]);

//     useEffect(() => {
//         const fetchDetails = async () => {
//             setLoadingInvoice(true);
//             const { data, error } = await supabase.from("invoices_record").select(`*, buyers_record (*), sellers_record (*), items_record (*)`).eq("id", id).single();
//             if (error) {
//                 console.error("Error fetching invoice:", error);
//                 toast({ title: "Error", description: "Failed to load invoice details.", variant: "destructive" });
//             } else if (data) {
//                 setFullInvoiceData(prev => ({
//                     ...prev,
//                     invoice_date: data.invoice_date || today,
//                     invoice_no: data.invoice_no || "",
//                     challan_date: data.challan_date || "",
//                     challan_no: data.challan_no || "",
//                     purchase_date: data.purchase_date || "",
//                     purchase_no: data.purchase_no || "",
//                     vehicle_no: data.vehicle_no || "",
//                     buyer_id: data.buyer_id,
//                     seller_id: data.seller_id,
//                     client_name: data.buyers_record?.name || "",
//                     client_address: data.buyers_record?.address || "",
//                     client_gstin: data.buyers_record?.gst_no || "",
//                     client_phone: data.buyers_record?.phone_no || "",
//                     products: data.items_record ? data.items_record.map((item: any, idx: number) => ({
//                         srNo: idx + 1,
//                         description: item.item_name || "",
//                         hsn: item.hsn_code || "",
//                         quantity: item.qty || '',
//                         rate: item.item_rate || '',
//                         amount: item.amount || ((item.qty || 0) * (item.item_rate || 0)),
//                     })) : [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
//                     gst_percentage: data.gst_percentage || 18,
//                     sub_total: data.sub_total || 0,
//                     cgst_amount: data.cgst_amount || 0,
//                     sgst_amount: data.sgst_amount || 0,
//                     total_gst_amount: data.total_gst_amount || 0,
//                     total_amount: data.total_amount || 0,
//                 }));
//             }
//             setLoadingInvoice(false);
//         };
//         if (id) fetchDetails();
//         else setLoadingInvoice(false);
//     }, [id, toast, today]);

//     useEffect(() => {
//         const calculatedSubTotal = fullInvoiceData.products.reduce((sum, product) => sum + (typeof product.amount === 'number' ? product.amount : 0), 0);
//         const calculatedCgst = (calculatedSubTotal * (fullInvoiceData.gst_percentage / 2)) / 100;
//         const calculatedSgst = (calculatedSubTotal * (fullInvoiceData.gst_percentage / 2)) / 100;
//         const calculatedTotalGst = calculatedCgst + calculatedSgst;
//         const calculatedTotalAmount = calculatedSubTotal + calculatedTotalGst;
//         setFullInvoiceData(prev => ({
//             ...prev,
//             sub_total: calculatedSubTotal,
//             cgst_amount: calculatedCgst,
//             sgst_amount: calculatedSgst,
//             total_gst_amount: calculatedTotalGst,
//             total_amount: calculatedTotalAmount,
//         }));
//     }, [fullInvoiceData.products, fullInvoiceData.gst_percentage]);

//     const totalAmountInWords = useMemo(() => numberToWords(fullInvoiceData.total_amount), [fullInvoiceData.total_amount]);

//     const handleProductChange = (index: number, field: keyof Product, value: any) => {
//         const newProducts = [...fullInvoiceData.products];
//         let parsedValue: string | number = value;
//         if (field === 'quantity' || field === 'rate') {
//             parsedValue = value === '' ? '' : parseFloat(value) || 0;
//         }
//         if (field === 'description' || field === 'hsn') {
//             newProducts[index][field] = parsedValue as string;
//         } else if (field === 'quantity' || field === 'rate') {
//             newProducts[index][field] = parsedValue as number | '';
//         }
//         if (field === 'quantity' || field === 'rate') {
//             const currentQuantity = typeof newProducts[index].quantity === 'number' ? newProducts[index].quantity : 0;
//             const currentRate = typeof newProducts[index].rate === 'number' ? newProducts[index].rate : 0;
//             newProducts[index].amount = currentQuantity * currentRate;
//         }
//         setFullInvoiceData(prev => ({ ...prev, products: newProducts }));
//     };

//     const addProductRow = () => {
//         setFullInvoiceData((prev) => ({
//             ...prev,
//             products: [...prev.products, { srNo: prev.products.length + 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
//         }));
//     };

//     const deleteProductRow = (indexToDelete: number) => {
//         setFullInvoiceData((prev) => {
//             const updatedProducts = prev.products.filter((_, index) => index !== indexToDelete);
//             return { ...prev, products: updatedProducts.map((product, index) => ({ ...product, srNo: index + 1 })) };
//         });
//     };

//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         const { id, value } = e.target;
//         setFullInvoiceData(prev => ({ ...prev, [id]: value }));
//     };

//     const handleGstPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setFullInvoiceData(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 0 }));
//     };

//     const handleUpdateInvoice = async () => {
//         setCreating(true);
//         const { data: sellerinfo } = await supabase.from('sellers_record').select('*').eq("id", fullInvoiceData.seller_id).single();
//         const dataToSend = {
//             challan_date: fullInvoiceData.challan_date || null,
//             challan_no: fullInvoiceData.challan_no || null,
//             invoice_date: fullInvoiceData.invoice_date,
//             invoice_no: fullInvoiceData.invoice_no,
//             purchase_date: fullInvoiceData.purchase_date || null,
//             purchase_no: fullInvoiceData.purchase_no || null,
//             vehicle_no: fullInvoiceData.vehicle_no || null,
//             buyer_id: fullInvoiceData.buyer_id,
//             seller_id: fullInvoiceData.seller_id,
//             products_json: fullInvoiceData.products.map(p => ({
//                 description: p.description,
//                 hsn: p.hsn,
//                 quantity: typeof p.quantity === 'number' ? p.quantity : 0,
//                 rate: typeof p.rate === 'number' ? p.rate : 0,
//                 amount: p.amount,
//             })),
//             sub_total: fullInvoiceData.sub_total,
//             cgst_amount: fullInvoiceData.cgst_amount,
//             sgst_amount: fullInvoiceData.sgst_amount,
//             total_gst_amount: fullInvoiceData.total_gst_amount,
//             total_amount: fullInvoiceData.total_amount,
//             gst_percentage: fullInvoiceData.gst_percentage,
//             client_name: fullInvoiceData.client_name,
//             client_address: fullInvoiceData.client_address,
//             client_gstin: fullInvoiceData.client_gstin,
//             client_phone: fullInvoiceData.client_phone,
//             seller_name: sellerinfo?.name,
//             seller_address: sellerinfo?.address,
//             seller_email: sellerinfo?.email,
//             seller_gst_no: sellerinfo?.gst_no,
//             seller_pan_no: sellerinfo?.pan_no,
//             seller_logourl: sellerinfo?.logo,
//             seller_sign: sellerinfo?.sign,
//             seller_stamp: sellerinfo?.stamp,
//             seller_contact: sellerinfo?.contact,
//         };

//         try {
//             const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/edit`, {
//                 method: "POST",
//                 credentials: "include",
//                 headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
//                 body: JSON.stringify(dataToSend),
//             });
//             if (!response.ok) {
//                 const errorText = await response.text();
//                 throw new Error(`HTTP error! status: ${response.status} | ${errorText}`);
//             }
//             const result = await response.json();
//             toast({ title: "Invoice Updated ✅", description: `Invoice #${fullInvoiceData.invoice_no} was successfully edited.` });
//             if (result.url) window.location.href = result.url;
//         } catch (error) {
//             console.error("Failed to Edit invoice:", error);
//             toast({ title: "Error", description: `Failed to Edit invoice: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
//         } finally {
//             setCreating(false);
//         }
//     };

//     if (loadingInvoice) {
//         return <DashboardLayout><LoadingSkeleton /></DashboardLayout>;
//     }

//     return (
//         <DashboardLayout>
//             <div className="p-4 md:p-6 space-y-6 pb-24"> {/* Padding bottom for sticky footer */}
//                 <PageHeader />

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
//                     {/* Main Content */}
//                     <div className="lg:col-span-2 space-y-6">
//                         <FormSectionCard title="Client Details" icon={<User size={20} />}>
//                             <div className="space-y-4">
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                     <div className="space-y-1.5"><Label htmlFor="client_name">Client Name</Label><Input id="client_name" value={fullInvoiceData.client_name} onChange={handleInputChange} placeholder="Aatish Pharma Solution" /></div>
//                                     <div className="space-y-1.5"><Label htmlFor="client_gstin">GSTIN</Label><Input id="client_gstin" value={fullInvoiceData.client_gstin} onChange={handleInputChange} placeholder="27AHQPC7140E1ZF" /></div>
//                                 </div>
//                                 <div className="space-y-1.5"><Label htmlFor="client_address">Address</Label><Textarea id="client_address" value={fullInvoiceData.client_address} onChange={handleInputChange} placeholder="Client's full address" /></div>
//                                 <div className="space-y-1.5"><Label htmlFor="client_phone">Phone</Label><Input id="client_phone" value={fullInvoiceData.client_phone} onChange={handleInputChange} placeholder="+91 9165878123" /></div>
//                             </div>
//                         </FormSectionCard>

//                         <FormSectionCard title="Products / Services" icon={<FileText size={20} />}>
//                             {/* --- DESKTOP TABLE --- */}
//                             <div className="hidden md:block">
//                                 <table className="w-full text-sm">
//                                     <colgroup>
//                                         <col style={{ width: '5%' }} />
//                                         <col style={{ width: '30%' }} />
//                                         <col style={{ width: '15%' }} />
//                                         <col style={{ width: '15%' }} />
//                                         <col style={{ width: '15%' }} />
//                                         <col style={{ width: '15%' }} />
//                                         <col style={{ width: '5%' }} />
//                                     </colgroup>
//                                     <thead>
//                                         <tr className="border-b">
//                                             <th className="p-2 text-left font-semibold">Sr.</th>
//                                             <th className="p-2 text-left font-semibold">Description</th>
//                                             <th className="p-2 text-left font-semibold">HSN</th>
//                                             <th className="p-2 text-left font-semibold">Qty</th>
//                                             <th className="p-2 text-left font-semibold">Rate</th>
//                                             <th className="p-2 text-right font-semibold">Amount</th>
//                                             <th className="p-2"></th>
//                                         </tr>
//                                     </thead>
//                                     <tbody>
//                                         {fullInvoiceData.products.map((p, i) => (
//                                             <tr key={i} className="border-b last:border-b-0">
//                                                 <td className="p-2 align-top">{p.srNo}</td>
//                                                 <td className="p-2"><Textarea value={p.description} onChange={(e) => handleProductChange(i, "description", e.target.value)} placeholder="Product description" rows={1} className="min-h-[40px]" /></td>
//                                                 <td className="p-2"><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} placeholder="HSN" /></td>
//                                                 <td className="p-2"><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} placeholder="0" min="0" required /></td>
//                                                 <td className="p-2"><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} placeholder="0.00" min="0" step="0.01" required /></td>
//                                                 <td className="p-2 text-right font-medium">₹{(p.amount || 0).toFixed(2)}</td>
//                                                 <td className="p-2 text-center"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button></td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                             {/* --- MOBILE CARDS --- */}
//                             <div className="block md:hidden space-y-4">
//                                 {fullInvoiceData.products.map((p, i) => (
//                                     <div key={i} className="border rounded-lg p-4 space-y-3 relative">
//                                         <p className="font-bold">Item #{p.srNo}</p>
//                                         <div className="space-y-1.5"><Label>Description</Label><Textarea value={p.description} onChange={(e) => handleProductChange(i, "description", e.target.value)} placeholder="Product description" rows={2} /></div>
//                                         <div className="grid grid-cols-5 gap-3">
//                                             <div className="space-y-1.5 col-span-2"><Label>HSN</Label><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} placeholder="HSN" /></div>
//                                             <div className="space-y-1.5 col-span-3"><Label>Quantity</Label><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} placeholder="0" /></div>
//                                         </div>
//                                         <div className="grid grid-cols-5 gap-3">
//                                             <div className="space-y-1.5 col-span-3"><Label>Rate</Label><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} placeholder="0.00" /></div>
//                                             <div className="space-y-1.5 col-span-2"><Label>Amount</Label><p className="font-medium h-10 flex items-center">₹{(p.amount || 0).toFixed(2)}</p></div>
//                                         </div>
//                                         <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button>
//                                     </div>
//                                 ))}
//                             </div>
//                             <Button onClick={addProductRow} className="mt-4" variant="outline"><PlusCircle size={16} className="mr-2" />Add Item</Button>
//                         </FormSectionCard>
//                     </div>

//                     {/* Side Content */}
//                     <div className="lg:col-span-1 space-y-6">
//                         <FormSectionCard title="Invoice Meta" icon={<FileText size={20} />}>
//                             <div className="space-y-4">
//                                 <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={fullInvoiceData.invoice_date} onChange={handleInputChange} /></div><div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={fullInvoiceData.invoice_no} onChange={handleInputChange} placeholder="e.g., 001/24-25" disabled /></div></div>
//                                 <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="challan_date">Challan Date</Label><Input id="challan_date" type="date" value={fullInvoiceData.challan_date} onChange={handleInputChange} /></div><div className="space-y-1.5"><Label htmlFor="challan_no">Challan No.</Label><Input id="challan_no" value={fullInvoiceData.challan_no} onChange={handleInputChange} /></div></div>
//                                 <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="purchase_date">P.O. Date</Label><Input id="purchase_date" type="date" value={fullInvoiceData.purchase_date} onChange={handleInputChange} /></div><div className="space-y-1.5"><Label htmlFor="purchase_no">P.O. No.</Label><Input id="purchase_no" value={fullInvoiceData.purchase_no} onChange={handleInputChange} /></div></div>
//                                 <div className="space-y-1.5"><Label htmlFor="vehicle_no">Vehicle No.</Label><Input id="vehicle_no" value={fullInvoiceData.vehicle_no} onChange={handleInputChange} /></div>
//                             </div>
//                         </FormSectionCard>

//                         <Card>
//                             <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
//                             <CardContent className="space-y-3">
//                                 <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Sub Total</span><span className="font-medium">₹{fullInvoiceData.sub_total.toFixed(2)}</span></div>
//                                 <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">CGST ({fullInvoiceData.gst_percentage / 2}%)</span><span className="font-medium">₹{fullInvoiceData.cgst_amount.toFixed(2)}</span></div>
//                                 <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">SGST ({fullInvoiceData.gst_percentage / 2}%)</span><span className="font-medium">₹{fullInvoiceData.sgst_amount.toFixed(2)}</span></div>
//                                 <div className="flex justify-between items-center font-semibold border-t pt-2"><span className="text-muted-foreground">Total GST</span><span>₹{fullInvoiceData.total_gst_amount.toFixed(2)}</span></div>
//                                 <div className="flex items-center text-sm"><Label htmlFor="gst_percentage" className="text-muted-foreground mr-2">GST Rate:</Label><Input id="gst_percentage" type="number" value={fullInvoiceData.gst_percentage} onChange={handleGstPercentageChange} className="w-24 h-8 text-right" min="0" step="0.1" /><span className="ml-1">%</span></div>
//                                 <div className="border-t pt-3 mt-3">
//                                     <div className="flex justify-between text-xl font-bold"><span>Total Amount</span><span>₹{fullInvoiceData.total_amount.toFixed(2)}</span></div>
//                                     {fullInvoiceData.total_amount > 0 && (<p className="text-xs text-muted-foreground mt-1">{totalAmountInWords}</p>)}
//                                 </div>
//                             </CardContent>
//                         </Card>

//                         <FormSectionCard title="Seller Details" icon={<Building size={20} />}>
//                             {seller ? <div className="space-y-1 text-sm text-muted-foreground"><p className="font-semibold text-primary">{seller.name}</p><p>{seller.address}</p><p>GST: {seller.gst_no}</p></div> : <p>Loading seller info...</p>}
//                         </FormSectionCard>

//                         <FormSectionCard title="Bank Details" icon={<Banknote size={20} />}>
//                             <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> HDFC BANK</p><p><span className="font-semibold text-primary">A/C No:</span> 50200097548910</p><p><span className="font-semibold text-primary">IFSC:</span> HDFC0008178</p></div>
//                         </FormSectionCard>
//                     </div>
//                 </div>
//             </div>

//             {/* Sticky Footer for Actions */}
//             <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t">
//                 <div className="container flex items-center justify-end h-16 px-4 md:px-6 gap-4">
//                     <Button onClick={handleUpdateInvoice} disabled={creating} size="lg">
//                         {creating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
//                         Update Invoice
//                     </Button>
//                 </div>
//             </div>
//         </DashboardLayout>
//     );
// }


"use client";
import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SvgLoader from "../../../../components/ui/loader";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { indianStates } from "@/lib/indianStates";
import { FileText, User, Building, Banknote, Trash2, PlusCircle, Save, Bell, Send, Settings, Phone, Mail } from 'lucide-react';
import { useParams, useRouter } from "next/navigation";

// --- TYPE DEFINITIONS ---
interface Item {
    srNo: number;
    name: string;
    hsn: string;
    quantity: number | '';
    unit: string;
    rate: number | '';
    gst_rate: number | '';
}

interface Product {
    name: string;
    hsn: string | null;
    unit: string | null;
    rate: number | null;
    gst: number | null;
}

interface Seller {
    id: string;
    name?: string;
    address?: string;
    state?: string;
    gstin?: string;
    contact?: string | null;
    email?: string | null;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    default_auto_send_invoice?: boolean | null;
}

interface FormState {
    invoice_no: string;
    invoice_date: string;
    due_date: string;
    client_name: string;
    client_address: string;
    client_gstin: string;
    client_state_name: string;
    client_phone: string;
    client_email: string;
    products: Item[];
    terms_and_conditions: string;
}

// --- UI SUB-COMPONENTS ---
const PageHeader = ({ invoiceNumber }: { invoiceNumber: string }) => (
    <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Edit Invoice</h1>
        {invoiceNumber && <p className="text-muted-foreground">Modify details for invoice #{invoiceNumber}</p>}
    </div>
);
const FormSectionCard = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => ( <Card><CardHeader><div className="flex items-center gap-3">{icon} <CardTitle>{title}</CardTitle></div></CardHeader><CardContent>{children}</CardContent></Card> );
const LoadingSkeleton = () => ( <div className="p-4 md:p-6 space-y-6"><Skeleton className="h-12 w-1/3" /><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6"><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div><div className="lg:col-span-1 space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div></div></div> );

// --- MAIN INVOICE EDIT COMPONENT ---
export default function InvoiceEditPage() {
    const { id: invoiceId } = useParams();
    const router = useRouter();
    const { userId, userSession } = useUserId();
    const { toast } = useToast();
    const today = new Date().toISOString().split('T')[0];

    const [seller, setSeller] = useState<Seller | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [inventory, setInventory] = useState<Product[]>([]);
    const [activeProductSuggestion, setActiveProductSuggestion] = useState<number | null>(null);
    const [autoSendEmail, setAutoSendEmail] = useState(false);
    const [setPaymentReminder, setSetPaymentReminder] = useState(false);
    
    const productSuggestionRefs = useRef<(HTMLTableCellElement | null)[]>([]);

    const [formState, setFormState] = useState<FormState>({
        invoice_no: "", invoice_date: today, due_date: today, client_name: "", client_address: "",
        client_gstin: "", client_state_name: "", client_phone: "", client_email: "", products: [], terms_and_conditions: "",
    });
    
    useEffect(() => {
        if (!userId || !invoiceId) return;

        const fetchInvoiceDetails = async () => {
            setIsLoading(true);
            
            const { data, error } = await supabase
                .from("invoices_record")
                .select(`*, buyers_record(*), items_record(*)`)
                .eq("id", invoiceId)
                .eq("user_id", userId)
                .single();

            if (error || !data) {
                toast({ title: "Error", description: "Failed to load invoice details.", variant: "destructive" });
                router.push('/dashboard');
                return;
            }
            
            const { data: sellerData } = await supabase.from("sellers_record").select("*").eq("user_id", userId).single();
            setSeller(sellerData);
            
            // Set automation toggles based on seller defaults first, then specific invoice settings
            if (sellerData) {
                setAutoSendEmail(sellerData.default_auto_send_invoice ?? false);
            }
            setSetPaymentReminder(data.payment_reminder_enabled ?? false);

            setFormState({
                invoice_no: data.number || "",
                invoice_date: data.date || today,
                due_date: data.due_date || today,
                client_name: data.buyers_record?.name || "",
                client_address: data.buyers_record?.address || "",
                client_gstin: data.buyers_record?.gstin || "",
                client_state_name: data.buyers_record?.state || "",
                client_phone: data.buyers_record?.phone_no || "",
                client_email: data.buyers_record?.email || "",
                products: data.items_record ? data.items_record.map((item: any, idx: number) => ({
                    srNo: idx + 1,
                    name: item.name || "",
                    hsn: item.hsn || "",
                    quantity: item.quantity || '',
                    unit: item.unit || 'Pcs',
                    rate: item.rate || '',
                    gst_rate: item.gst_rate || 18,
                })) : [],
                terms_and_conditions: data.terms_and_conditions ? data.terms_and_conditions.join('\n') : "",
            });
            
            const { data: productsData } = await supabase.from('products').select('name, hsn, unit, rate, gst').eq('user_id', userId);
            if (productsData) setInventory(productsData);
            
            setIsLoading(false);
        };
        fetchInvoiceDetails();
    }, [userId, invoiceId, toast, router, today]);

    const filteredProducts = (index: number) => {
        const searchInput = formState.products[index]?.name.toLowerCase() || '';
        if (!searchInput) return [];
        return inventory.filter(item => item.name.toLowerCase().includes(searchInput));
    };

    const handleInputChange = (field: keyof FormState, value: string) => setFormState(prev => ({ ...prev, [field]: value }));
    const handleProductChange = (index: number, field: keyof Item, value: string | number) => { const newProducts = [...formState.products]; (newProducts[index] as any)[field] = value; setFormState(prev => ({ ...prev, products: newProducts })); };
    const handleSelectProduct = (productIndex: number, product: Product) => { const newProducts = [...formState.products]; newProducts[productIndex] = { ...newProducts[productIndex], name: product.name, hsn: product.hsn || "", unit: product.unit || "Pcs", rate: product.rate || '', gst_rate: product.gst || 18, }; setFormState(prev => ({ ...prev, products: newProducts })); setActiveProductSuggestion(null); };
    const addProductRow = () => setFormState(prev => ({ ...prev, products: [...prev.products, { srNo: prev.products.length + 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }] }));
    const deleteProductRow = (index: number) => setFormState(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index).map((p, i) => ({...p, srNo: i + 1})) }));
    
    const handleUpdateInvoice = async () => {
        if (!seller) { toast({ title: "Seller information is missing.", variant: "destructive" }); return; }
        setIsSaving(true);

        const payload = {
            invoice: { title: formState.client_gstin ? "Tax Invoice" : "Retail Invoice", number: formState.invoice_no, date: formState.invoice_date, due_date: formState.due_date },
            company: { name: seller.name || "", address: seller.address || "", state: seller.state || "", gstin: seller.gstin || "", contact: seller.contact || "", email: seller.email || "", logo_path: "" },
            buyer: { name: formState.client_name, address: formState.client_address, state: formState.client_state_name, gstin: formState.client_gstin, phone_no: formState.client_phone, email: formState.client_email, signature_path: "" },
            items: formState.products.map(p => ({ name: p.name, hsn: p.hsn, unit: p.unit, quantity: parseFloat(p.quantity as string) || 0, rate: parseFloat(p.rate as string) || 0, gst_rate: parseFloat(p.gst_rate as string) || 0 })),
            bank: { name: seller.bank_name || "", account: seller.account_no || "", branch_ifsc: seller.ifsc_code || "" },
            terms_and_conditions: formState.terms_and_conditions.split('\n').filter(line => line.trim() !== ""),
            auto_send_email: autoSendEmail,
            set_payment_reminder: setPaymentReminder,
        };
        
        try {
           const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/edit/${invoiceId}`, {
               method: "PUT",
               headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
               body: JSON.stringify(payload),
           });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            toast({ title: "Invoice Updated ✅", description: `Invoice #${formState.invoice_no} was successfully edited.` });
            if (result.url) window.open(result.url, '_blank');
            

        } catch (e: any) {
            console.error("Failed to update invoice:", e);
            toast({ title: "Error ❌", description: e.message || "Failed to update invoice.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) return <DashboardLayout><LoadingSkeleton /></DashboardLayout>;
    
    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 pb-24">
                <PageHeader invoiceNumber={formState.invoice_no} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Client Details Card */}
                        <FormSectionCard title="Client Details" icon={<User className="h-5 w-5"/>}>
                             <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="client_name">Client Name</Label><Input id="client_name" value={formState.client_name} onChange={(e) => handleInputChange('client_name', e.target.value)} required /></div>
                                    <div className="space-y-1.5"><Label htmlFor="client_gstin">GSTIN</Label><Input id="client_gstin" value={formState.client_gstin} onChange={(e) => handleInputChange('client_gstin', e.target.value)} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="client_address">Address</Label><Textarea id="client_address" value={formState.client_address} onChange={(e) => handleInputChange('client_address', e.target.value)} required/></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="client_phone">Phone No.</Label><Input id="client_phone" type="tel" value={formState.client_phone} onChange={(e) => handleInputChange('client_phone', e.target.value)} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="client_email">Email</Label><Input id="client_email" type="email" value={formState.client_email} onChange={(e) => handleInputChange('client_email', e.target.value)} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="client_state_name">State</Label><Select value={formState.client_state_name} onValueChange={(v) => handleInputChange('client_state_name', v)} required><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{indianStates.map((s) => (<SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                            </div>
                        </FormSectionCard>
                        {/* Products Card */}
                        <FormSectionCard title="Products / Services" icon={<FileText className="h-5 w-5"/>}>
                             <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b"><th className="p-2 min-w-[200px] w-[35%] text-left">Item Name</th><th className="p-2 min-w-[100px] w-[15%] text-left">HSN</th><th className="p-2 w-[10%] text-left">Qty</th><th className="p-2 w-[10%] text-left">Unit</th><th className="p-2 min-w-[120px] w-[15%] text-left">Rate</th><th className="p-2 w-[10%] text-left">GST %</th><th className="p-2 w-[5%]"></th></tr></thead>
                                    <tbody>
                                        {formState.products.map((p, i) => (
                                            <tr key={i}><td className="p-1 relative" ref={el => productSuggestionRefs.current[i] = el}>
                                                <Textarea value={p.name} onChange={(e) => handleProductChange(i, "name", e.target.value)} onFocus={() => setActiveProductSuggestion(i)} rows={1} autoComplete="off"/>
                                                {activeProductSuggestion === i && filteredProducts(i).length > 0 && (
                                                    <div className="absolute z-20 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                        {filteredProducts(i).map((product, idx) => ( <div key={`${product.name}-${idx}`} className="px-4 py-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelectProduct(i, product)}>{product.name}</div> ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-1"><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} /></td>
                                            <td className="p-1"><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} /></td>
                                            <td className="p-1"><Input value={p.unit} onChange={(e) => handleProductChange(i, "unit", e.target.value)} /></td>
                                            <td className="p-1"><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} /></td>
                                            <td className="p-1"><Input type="number" value={p.gst_rate} onChange={(e) => handleProductChange(i, "gst_rate", e.target.value)} /></td>
                                            <td className="p-1 text-center"><Button variant="ghost" size="icon" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile View for products */}
                            <div className="block md:hidden space-y-4">
                                {formState.products.map((p, i) => (
                                    <div key={i} className="border rounded-lg p-3 space-y-3" ref={el => productSuggestionRefs.current[i] = el as HTMLTableCellElement}>
                                        <div className="flex justify-between items-center"><p className="font-semibold">Item #{i + 1}</p><Button variant="ghost" size="icon" onClick={() => deleteProductRow(i)}><Trash2 size={16} className="text-red-500"/></Button></div>
                                        <div className="space-y-1.5 relative">
                                            <Label htmlFor={`item_name_${i}`}>Item Name</Label>
                                            <Textarea id={`item_name_${i}`} value={p.name} onChange={(e) => handleProductChange(i, "name", e.target.value)} onFocus={() => setActiveProductSuggestion(i)} rows={2} autoComplete="off"/>
                                            {activeProductSuggestion === i && filteredProducts(i).length > 0 && (
                                                <div className="absolute z-20 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredProducts(i).map((product, idx) => ( <div key={`${product.name}-${idx}-mobile`} className="px-4 py-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelectProduct(i, product)}>{product.name}</div> ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5"><Label htmlFor={`hsn_${i}`}>HSN</Label><Input id={`hsn_${i}`} value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor={`qty_${i}`}>Qty</Label><Input id={`qty_${i}`} type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor={`unit_${i}`}>Unit</Label><Input id={`unit_${i}`} value={p.unit} onChange={(e) => handleProductChange(i, "unit", e.target.value)} /></div></div>
                                        <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor={`rate_${i}`}>Rate</Label><Input id={`rate_${i}`} type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor={`gst_${i}`}>GST %</Label><Input id={`gst_${i}`} type="number" value={p.gst_rate} onChange={(e) => handleProductChange(i, "gst_rate", e.target.value)} /></div></div>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={addProductRow} className="mt-4" variant="outline"><PlusCircle size={16} className="mr-2" />Add Item</Button>
                        </FormSectionCard>
                        {/* Terms Card */}
                        <FormSectionCard title="Terms & Conditions" icon={<FileText className="h-5 w-5"/>}>
                            <Textarea value={formState.terms_and_conditions} onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)} rows={3} />
                        </FormSectionCard>
                    </div>
                    {/* Right Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <FormSectionCard title="Invoice Meta" icon={<FileText className="h-5 w-5"/>}>
                             <div className="space-y-4">
                                <div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={formState.invoice_no} onChange={(e) => handleInputChange('invoice_no', e.target.value)} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={formState.invoice_date} onChange={(e) => handleInputChange('invoice_date', e.target.value)} /></div>
                                     <div className="space-y-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" type="date" value={formState.due_date} onChange={(e) => handleInputChange('due_date', e.target.value)} /></div>
                                </div>
                             </div>
                        </FormSectionCard>
                        <FormSectionCard title="Seller Details" icon={<Building className="h-5 w-5"/>}>
                            {seller ? <div className="space-y-2 text-sm text-muted-foreground">
                                <p className="font-semibold text-primary">{seller.name}</p>
                                <p>{seller.address}</p>
                                {seller.gstin && <p>GST: {seller.gstin}</p>}
                                {seller.contact && <p className="flex items-center gap-2"><Phone size={14} /> {seller.contact}</p>}
                                {seller.email && <p className="flex items-center gap-2"><Mail size={14} /> {seller.email}</p>}
                            </div> : <Skeleton className="h-20 w-full" />}
                        </FormSectionCard>
                        <FormSectionCard title="Bank Details" icon={<Banknote className="h-5 w-5"/>}>
                            {seller ? <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> {seller.bank_name}</p><p><span className="font-semibold text-primary">A/C No:</span> {seller.account_no}</p><p><span className="font-semibold text-primary">IFSC:</span> {seller.ifsc_code}</p></div> : <Skeleton className="h-12 w-full" />}
                        </FormSectionCard>
                         <FormSectionCard title="Automation" icon={<Settings className="h-5 w-5"/>}>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="auto-send" className="flex items-center gap-2 cursor-pointer"><Send size={16}/>Auto Send Invoice</Label><Switch id="auto-send" checked={autoSendEmail} onCheckedChange={setAutoSendEmail} /></div>
                                <div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="payment-reminder" className="flex items-center gap-2 cursor-pointer"><Bell size={16}/>Set Payment Reminder</Label><Switch id="payment-reminder" checked={setPaymentReminder} onCheckedChange={setSetPaymentReminder} /></div>
                            </div>
                        </FormSectionCard>
                    </div>
                </div>
            </div>
            {/* Sticky Footer */}
            <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t">
                <div className="container flex items-center justify-end h-16 px-4 md:px-6">
                    <Button onClick={handleUpdateInvoice} disabled={isSaving || isLoading} size="lg">
                        {isSaving ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />Update Invoice</>}
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}