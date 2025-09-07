
// "use client";
// import React, { useState, useMemo, useEffect, useRef } from "react";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Switch } from "@/components/ui/switch";
// import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
// import { Skeleton } from "@/components/ui/skeleton";
// import SvgLoader from "./ui/loader";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import { useToast } from "../hooks/use-toast";
// import { indianStates } from "@/lib/indianStates";
// import { FileText, User, Building, Banknote, Trash2, PlusCircle, Save, Bell, Send, Copy, Settings, Phone, Mail } from 'lucide-react';

// // --- TYPE DEFINITIONS (ALIGNED WITH SCHEMA) ---
// interface Item {
//     srNo: number;
//     name: string;
//     hsn: string;
//     quantity: number | '';
//     unit: string;
//     rate: number | '';
//     gst_rate: number | '';
// }

// interface Product {
//     name: string;
//     hsn: string | null;
//     unit: string | null;
//     rate: number | null;
//     gst: number | null;
// }

// interface Seller {
//     id: string;
//     name?: string;
//     address?: string;
//     state?: string;
//     gstin?: string;
//     contact?: string | null;
//     email?: string | null;
//     logo_url?: string;
//     bank_name?: string;
//     account_no?: string;
//     ifsc_code?: string;
//     default_auto_send_invoice?: boolean | null;
//     default_payment_reminder?: boolean | null;
// }

// interface Client {
//     id: number;
//     name: string;
//     address: string;
//     gstin: string | null;
//     state: string | null;
//     email: string | null;
//     phone_no: string | null;
// }

// interface FormState {
//     invoice_no: string;
//     invoice_date: string;
//     due_date: string;
//     client_name: string;
//     client_address: string;
//     client_gstin: string;
//     client_state_name: string;
//     client_phone: string;
//     client_email: string;
//     products: Item[];
//     terms_and_conditions: string;
//     seller_id: string | null;
// }

// // --- HOOK FOR CLICK OUTSIDE DETECTION ---
// const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
//     useEffect(() => {
//         const handleMouseDown = (event: MouseEvent) => {
//             if (ref.current && !ref.current.contains(event.target as Node)) {
//                 callback();
//             }
//         };
//         document.addEventListener("mousedown", handleMouseDown);
//         return () => {
//             document.removeEventListener("mousedown", handleMouseDown);
//         };
//     }, [ref, callback]);
// };

// // --- UI SUB-COMPONENTS ---
// const PageHeader = () => ( <div><h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Invoice</h1><p className="text-muted-foreground">Fill in the details below to generate a new invoice.</p></div> );
// const FormSectionCard = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => ( <Card><CardHeader><div className="flex items-center gap-3">{icon} <CardTitle>{title}</CardTitle></div></CardHeader><CardContent>{children}</CardContent></Card> );
// const LoadingSkeleton = () => ( <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><Skeleton className="h-10 w-1/3" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"><div className="lg:col-span-2 space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-64 w-full" /></div><div className="lg:col-span-1 space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div></div></div> );

// // --- MAIN INVOICE COMPONENT ---
// export default function Invoice() {
//     const { userId, userSession } = useUserId();
//     const { toast } = useToast();
//     const today = new Date().toISOString().split('T')[0];
//     const defaultDueDate = new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0];
//     const [seller, setSeller] = useState<Seller | null>(null);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [existingClients, setExistingClients] = useState<Client[]>([]);
//     const [isClientListVisible, setIsClientListVisible] = useState(false);
//     const [inventory, setInventory] = useState<Product[]>([]);
//     const [activeProductSuggestion, setActiveProductSuggestion] = useState<number | null>(null);
//     const [autoSendEmail, setAutoSendEmail] = useState(false);
//     const [setPaymentReminder, setSetPaymentReminder] = useState(false);
//     const [generateCopies, setGenerateCopies] = useState(false);
    
//     const clientDetailsRef = useRef<HTMLDivElement>(null);
//     const productSuggestionRefs = useRef<(HTMLTableCellElement | null)[]>([]);

//     const [formState, setFormState] = useState<FormState>({
//         invoice_no: "", invoice_date: today, due_date: defaultDueDate, client_name: "", client_address: "", client_gstin: "", client_state_name: "", client_phone: "", client_email: "",
//         products: [{ srNo: 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }],
//         terms_and_conditions: "1. Payment is due within 15 days.\n2. All goods remain the property of the seller until paid in full.", seller_id: null,
//     });

//     useEffect(() => {
//         if (!userId) return;
        
//         const checkCompanyInfo = async () => {
//             const { data, error } = await supabase
//                 .from("sellers_record")
//                 .select("id, name, address, state, gstin, contact, email, logo_url, bank_name, account_no, ifsc_code, default_auto_send_invoice, default_payment_reminder")
//                 .eq("user_id", userId)
//                 .single();
            
//             if (error || !data) {
//                 toast({ title: "Seller Error", description: `Seller info not found! Please fill out company details.`, variant: "destructive" });
//                 return null;
//             }
//             return data;
//         };

//         const fetchClients = async () => {
//             const { data: invoices, error } = await supabase.from("invoices_record").select("buyer_id").eq("user_id", userId);
//             if (error || !invoices || invoices.length === 0) return;
//             const buyerIds = [...new Set((invoices as any[]).map(inv => inv.buyer_id).filter(id => id !== null))];
//             if (buyerIds.length === 0) return;
//             const { data: buyers, error: buyersError } = await supabase.from("buyers_record").select("id, name, address, gstin, state, email, phone_no").in("id", buyerIds);
//             if (buyersError) {
//                 console.error("Error fetching buyers:", buyersError); return;
//             }
//             if (buyers) {
//                 const uniqueClients = buyers.filter((client, index, self) => index === self.findIndex((c) => c.name === client.name));
//                 setExistingClients(uniqueClients);
//             }
//         };

//         const fetchProducts = async () => {
//             const { data, error } = await supabase.from('products').select('name, hsn, unit, rate, gst').eq('user_id', userId);
//             if (error) {
//                 toast({ title: "Could not fetch products", description: error.message, variant: "destructive" }); return;
//             }
//             if (data) setInventory(data);
//         };

//         const loadInitialData = async () => {
//             setIsLoading(true);
//             const sellerData = await checkCompanyInfo();
//             if (sellerData) {
//                 setSeller(sellerData);
//                 setAutoSendEmail(sellerData.default_auto_send_invoice ?? false);
//                 setSetPaymentReminder(sellerData.default_payment_reminder ?? false);
//                 setFormState(prev => ({ ...prev, seller_id: sellerData.id }));
//                 await incremented_invoice_no(sellerData.id);
//                 await fetchClients();
//                 await fetchProducts();
//             }
//             setIsLoading(false);
//         };
        
//         loadInitialData();
//     }, [userId, toast]);

//     // This custom hook handles closing the suggestion box when clicking outside of it
//     useEffect(() => {
//         const handleOutsideClick = (event: MouseEvent) => {
//             if (activeProductSuggestion === null) return;
//             const activeRef = productSuggestionRefs.current[activeProductSuggestion];
//             if (activeRef && !activeRef.contains(event.target as Node)) {
//                 setActiveProductSuggestion(null);
//             }
//         };
//         document.addEventListener('mousedown', handleOutsideClick);
//         return () => document.removeEventListener('mousedown', handleOutsideClick);
//     }, [activeProductSuggestion]);

//     useClickOutside(clientDetailsRef, () => setIsClientListVisible(false));
    
//     const filteredClients = useMemo(() => {
//         const searchInput = formState.client_name.toLowerCase();
//         if (!searchInput) return [];
//         return existingClients.filter(client => client.name.toLowerCase().includes(searchInput));
//     }, [formState.client_name, existingClients]);

//     const filteredProducts = (index: number) => {
//         const searchInput = formState.products[index]?.name.toLowerCase() || '';
//         if (!searchInput) return [];
//         return inventory.filter(item => item.name.toLowerCase().includes(searchInput));
//     };

//     // --- MODIFIED: This function now correctly finds and sets the client's state. ---
//     const handleSelectClient = (client: Client) => {
//         // Find the canonical state name from our list to ensure an exact match.
//         // This handles potential casing or whitespace issues from the database.
//         const matchedState = indianStates.find(
//             (s) => s.name.toLowerCase() === (client.state || '').toLowerCase().trim()
//         );

//         setFormState(prev => ({
//             ...prev,
//             client_name: client.name,
//             client_address: client.address,
//             client_gstin: client.gstin || "",
//             // Use the canonical name from our list if found, otherwise use the original.
//             client_state_name: matchedState ? matchedState.name : client.state || "",
//             client_phone: client.phone_no || "",
//             client_email: client.email || "",
//         }));
//         setIsClientListVisible(false);
//     };
    
//     const incremented_invoice_no = async (sellerId: string) => {
//         const { data: invoiceData } = await supabase.from("invoices_record").select("number, date").eq("seller_id", sellerId).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1).single();
//         const today = new Date();
//         const year = today.getFullYear();
//         const month = today.getMonth();
//         const fyStart = month >= 3 ? year : year - 1;
//         const fyEnd = (fyStart + 1) % 100;
//         const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
//         if (!invoiceData?.number) {
//             setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return;
//         }
//         const lastInvoice = invoiceData.number;
//         const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?/);
//         if (!match) {
//             setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return;
//         }
//         const numberPart = match[1];
//         const fyInInvoice = match[2];
//         let newNumber = (fyInInvoice && fyInInvoice !== currentFY) ? "001" : (parseInt(numberPart, 10) + 1).toString().padStart(numberPart.length > 0 ? numberPart.length : 3, '0');
//         setFormState(prev => ({ ...prev, invoice_no: `${newNumber}/${currentFY}` }));
//     };

//     const handleInputChange = (field: keyof FormState, value: string) => setFormState(prev => ({ ...prev, [field]: value }));
//     const handleProductChange = (index: number, field: keyof Item, value: string | number) => { const newProducts = [...formState.products]; (newProducts[index] as any)[field] = value; setFormState(prev => ({ ...prev, products: newProducts })); };
//     const handleSelectProduct = (productIndex: number, product: Product) => { const newProducts = [...formState.products]; newProducts[productIndex] = { ...newProducts[productIndex], name: product.name, hsn: product.hsn || "", unit: product.unit || "Pcs", rate: product.rate || '', gst_rate: product.gst || 18, }; setFormState(prev => ({ ...prev, products: newProducts })); setActiveProductSuggestion(null); };
//     const addProductRow = () => setFormState(prev => ({ ...prev, products: [...prev.products, { srNo: prev.products.length + 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }] }));
//     const deleteProductRow = (index: number) => setFormState(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index).map((p, i) => ({...p, srNo: i + 1})) }));
    
//     const handleCreateInvoice = async () => {
//         if (!seller) { toast({ title: "Seller information is not loaded.", variant: "destructive" }); return; }
//         setIsSaving(true);
//         const payload = {
//             invoice: { title: formState.client_gstin ? "Tax Invoice" : "Retail Invoice", number: formState.invoice_no, date: formState.invoice_date, due_date: formState.due_date },
//             company: { name: seller.name || "", address: seller.address || "", state: seller.state || "", gstin: seller.gstin || "", contact: seller.contact || "", email: seller.email || "", logo_path: "" },
//             buyer: { name: formState.client_name, address: formState.client_address, state: formState.client_state_name, gstin: formState.client_gstin, phone_no: formState.client_phone, email: formState.client_email, signature_path: "" },
//             items: formState.products.map(p => ({ name: p.name, hsn: p.hsn, unit: p.unit, quantity: parseFloat(p.quantity as string) || 0, rate: parseFloat(p.rate as string) || 0, gst_rate: parseFloat(p.gst_rate as string) || 0 })),
//             bank: { name: seller.bank_name || "", account: seller.account_no || "", branch_ifsc: seller.ifsc_code || "" },
//             terms_and_conditions: formState.terms_and_conditions.split('\n').filter(line => line.trim() !== ""),
//             auto_send_email: autoSendEmail, set_payment_reminder: setPaymentReminder, generate_copies: generateCopies,
//         };
//         try {
//             const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/create`, {
//                 method: "POST", 
//                 headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
//                 body: JSON.stringify(payload),
//             });
//             const response = await res.json();
//             if (!res.ok) throw new Error(response.detail || "Failed to create invoice.");
//             toast({ title: "Invoice Created ✅", description: "Invoice PDF has been generated successfully." });
//             if (response.url) window.open(response.url, '_blank');
//             if (seller) await incremented_invoice_no(seller.id);
//         } catch (e: any) {
//             toast({ title: "Error ❌", description: e.message, variant: "destructive" });
//         } finally {
//             setIsSaving(false);
//         }
//     };
    
//     if (isLoading) return <DashboardLayout><LoadingSkeleton /></DashboardLayout>;
    
//     return (
//         <DashboardLayout>
//             <div className="p-4 md:p-6 space-y-6 pb-24">
//                 <PageHeader />
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
//                     <div className="lg:col-span-2 space-y-6">
//                         <FormSectionCard title="Client Details" icon={<User className="h-5 w-5"/>}>
//                             <div className="space-y-4">
//                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                     <div className="space-y-1.5 relative" ref={clientDetailsRef}>
//                                         <Label htmlFor="client_name">Client Name</Label>
//                                         <Input id="client_name" value={formState.client_name} onChange={(e) => handleInputChange('client_name', e.target.value)} onFocus={() => setIsClientListVisible(true)} required autoComplete="off" />
//                                         {isClientListVisible && filteredClients.length > 0 && (
//                                             <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
//                                                 {filteredClients.map(client => ( <div key={client.id} className="px-4 py-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelectClient(client)}>{client.name}</div> ))}
//                                             </div>
//                                         )}
//                                     </div>
//                                     <div className="space-y-1.5"><Label htmlFor="client_gstin">GSTIN</Label><Input id="client_gstin" value={formState.client_gstin} onChange={(e) => handleInputChange('client_gstin', e.target.value)} /></div>
//                                 </div>
//                                 <div className="space-y-1.5"><Label htmlFor="client_address">Address</Label><Textarea id="client_address" value={formState.client_address} onChange={(e) => handleInputChange('client_address', e.target.value)} required /></div>
//                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                                     <div className="space-y-1.5"><Label htmlFor="client_phone">Phone No.</Label><Input id="client_phone" type="tel" value={formState.client_phone} onChange={(e) => handleInputChange('client_phone', e.target.value)} /></div>
//                                     <div className="space-y-1.5"><Label htmlFor="client_email">Email</Label><Input id="client_email" type="email" value={formState.client_email} onChange={(e) => handleInputChange('client_email', e.target.value)} /></div>
//                                 </div>
//                                 <div className="space-y-1.5"><Label htmlFor="client_state_name">State</Label><Select value={formState.client_state_name} onValueChange={(v) => handleInputChange('client_state_name', v)} required><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{indianStates.map((s) => (<SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
//                             </div>
//                         </FormSectionCard>
//                         <FormSectionCard title="Products / Services" icon={<FileText className="h-5 w-5"/>}>
//                             <div className="hidden md:block overflow-x-auto">
//                                 <table className="w-full text-sm">
//                                     <thead><tr className="border-b"><th className="p-2 min-w-[200px] w-[35%] text-left">Item Name</th><th className="p-2 min-w-[100px] w-[15%] text-left">HSN</th><th className="p-2 w-[10%] text-left">Qty</th><th className="p-2 w-[10%] text-left">Unit</th><th className="p-2 min-w-[120px] w-[15%] text-left">Rate</th><th className="p-2 w-[10%] text-left">GST %</th><th className="p-2 w-[5%]"></th></tr></thead>
//                                     <tbody>
//                                         {formState.products.map((p, i) => (
//                                             <tr key={i}><td className="p-1 relative" ref={el => productSuggestionRefs.current[i] = el}>
//                                                 <Textarea value={p.name} onChange={(e) => handleProductChange(i, "name", e.target.value)} onFocus={() => setActiveProductSuggestion(i)} rows={1} autoComplete="off"/>
//                                                 {activeProductSuggestion === i && filteredProducts(i).length > 0 && (
//                                                     <div className="absolute z-20 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
//                                                         {filteredProducts(i).map((product, idx) => ( <div key={`${product.name}-${idx}`} className="px-4 py-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelectProduct(i, product)}>{product.name}</div> ))}
//                                                     </div>
//                                                 )}
//                                             </td>
//                                             <td className="p-1"><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} /></td>
//                                             <td className="p-1"><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} /></td>
//                                             <td className="p-1"><Input value={p.unit} onChange={(e) => handleProductChange(i, "unit", e.target.value)} /></td>
//                                             <td className="p-1"><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} /></td>
//                                             <td className="p-1"><Input type="number" value={p.gst_rate} onChange={(e) => handleProductChange(i, "gst_rate", e.target.value)} /></td>
//                                             <td className="p-1 text-center"><Button variant="ghost" size="icon" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button></td>
//                                             </tr>
//                                         ))}
//                                     </tbody>
//                                 </table>
//                             </div>
//                             <div className="block md:hidden space-y-4">
//                                 {formState.products.map((p, i) => (
//                                     <div key={i} className="border rounded-lg p-3 space-y-3" ref={el => productSuggestionRefs.current[i] = el as HTMLTableCellElement}>
//                                         <div className="flex justify-between items-center"><p className="font-semibold">Item #{i + 1}</p><Button variant="ghost" size="icon" onClick={() => deleteProductRow(i)}><Trash2 size={16} className="text-red-500"/></Button></div>
//                                         <div className="space-y-1.5 relative">
//                                             <Label htmlFor={`item_name_${i}`}>Item Name</Label>
//                                             <Textarea id={`item_name_${i}`} value={p.name} onChange={(e) => handleProductChange(i, "name", e.target.value)} onFocus={() => setActiveProductSuggestion(i)} rows={2} autoComplete="off"/>
//                                             {activeProductSuggestion === i && filteredProducts(i).length > 0 && (
//                                                 <div className="absolute z-20 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
//                                                     {filteredProducts(i).map((product, idx) => ( <div key={`${product.name}-${idx}-mobile`} className="px-4 py-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelectProduct(i, product)}>{product.name}</div> ))}
//                                                 </div>
//                                             )}
//                                         </div>
//                                         <div className="space-y-1.5"><Label htmlFor={`hsn_${i}`}>HSN</Label><Input id={`hsn_${i}`} value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} /></div>
//                                         <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor={`qty_${i}`}>Qty</Label><Input id={`qty_${i}`} type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor={`unit_${i}`}>Unit</Label><Input id={`unit_${i}`} value={p.unit} onChange={(e) => handleProductChange(i, "unit", e.target.value)} /></div></div>
//                                         <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor={`rate_${i}`}>Rate</Label><Input id={`rate_${i}`} type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor={`gst_${i}`}>GST %</Label><Input id={`gst_${i}`} type="number" value={p.gst_rate} onChange={(e) => handleProductChange(i, "gst_rate", e.target.value)} /></div></div>
//                                     </div>
//                                 ))}
//                             </div>
//                             <Button onClick={addProductRow} className="mt-4" variant="outline"><PlusCircle size={16} className="mr-2" />Add Item</Button>
//                         </FormSectionCard>
//                         <FormSectionCard title="Terms & Conditions" icon={<FileText className="h-5 w-5"/>}><Textarea value={formState.terms_and_conditions} onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)} rows={5} /></FormSectionCard>
//                     </div>
//                     <div className="lg:col-span-1 space-y-6">
//                         <FormSectionCard title="Invoice Meta" icon={<FileText className="h-5 w-5"/>}><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={formState.invoice_no} onChange={(e) => handleInputChange('invoice_no', e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={formState.invoice_date} onChange={(e) => handleInputChange('invoice_date', e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" type="date" value={formState.due_date} onChange={(e) => handleInputChange('due_date', e.target.value)} /></div></div></div></FormSectionCard>
//                         <FormSectionCard title="Seller Details" icon={<Building className="h-5 w-5"/>}>
//                             {seller ? <div className="space-y-2 text-sm text-muted-foreground">
//                                 <p className="font-semibold text-primary">{seller.name}</p>
//                                 <p>{seller.address}</p>
//                                 {seller.gstin && <p>GST: {seller.gstin}</p>}
//                                 {seller.contact && <p className="flex items-center gap-2"><Phone size={14} /> {seller.contact}</p>}
//                                 {seller.email && <p className="flex items-center gap-2"><Mail size={14} /> {seller.email}</p>}
//                             </div> : <Skeleton className="h-20 w-full" />}
//                         </FormSectionCard>
//                         <FormSectionCard title="Bank Details" icon={<Banknote className="h-5 w-5"/>}>{seller ? <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> {seller.bank_name}</p><p><span className="font-semibold text-primary">A/C No:</span> {seller.account_no}</p><p><span className="font-semibold text-primary">IFSC:</span> {seller.ifsc_code}</p></div> : <Skeleton className="h-12 w-full" />}</FormSectionCard>
//                         <FormSectionCard title="Automation & Copies" icon={<Settings className="h-5 w-5"/>}><div className="space-y-4"><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="auto-send" className="flex items-center gap-2 cursor-pointer"><Send size={16}/>Auto Send Invoice</Label><Switch id="auto-send" checked={autoSendEmail} onCheckedChange={setAutoSendEmail} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="payment-reminder" className="flex items-center gap-2 cursor-pointer"><Bell size={16}/>Set Payment Reminder</Label><Switch id="payment-reminder" checked={setPaymentReminder} onCheckedChange={setSetPaymentReminder} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="generate-copies" className="flex items-center gap-2 cursor-pointer"><Copy size={16}/>Generate Duplicate/Triplicate</Label><Switch id="generate-copies" checked={generateCopies} onCheckedChange={setGenerateCopies} /></div></div></FormSectionCard>
//                     </div>
//                 </div>
//             </div>
//             <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t"><div className="container mx-auto flex items-center justify-end h-16 px-4 md:px-6"><Button onClick={handleCreateInvoice} disabled={isSaving || isLoading} size="lg">{isSaving ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />Create Invoice</>}</Button></div></div>
//         </DashboardLayout>
//     );
// }



"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SvgLoader from "./ui/loader";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { useToast } from "../hooks/use-toast";
import { indianStates } from "@/lib/indianStates";
import { FileText, User, Building, Banknote, Trash2, PlusCircle, Save, Bell, Send, Copy, Settings, Phone, Mail } from 'lucide-react';

// --- TYPE DEFINITIONS (ALIGNED WITH SCHEMA) ---
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
    logo_url?: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    default_auto_send_invoice?: boolean | null;
    default_payment_reminder?: boolean | null;
}

interface Client {
    id: number;
    name: string;
    address: string;
    gstin: string | null;
    state: string | null;
    email: string | null;
    phone_no: string | null;
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
    seller_id: string | null;
}

// --- HOOK FOR CLICK OUTSIDE DETECTION ---
const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [ref, callback]);
};

// --- UI SUB-COMPONENTS ---
const PageHeader = () => ( <div><h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Invoice</h1><p className="text-muted-foreground">Fill in the details below to generate a new invoice.</p></div> );
const FormSectionCard = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => ( <Card><CardHeader><div className="flex items-center gap-3">{icon} <CardTitle>{title}</CardTitle></div></CardHeader><CardContent>{children}</CardContent></Card> );
const LoadingSkeleton = () => ( <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><Skeleton className="h-10 w-1/3" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"><div className="lg:col-span-2 space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-64 w-full" /></div><div className="lg:col-span-1 space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div></div></div> );

// --- MAIN INVOICE COMPONENT ---
export default function Invoice() {
    const { userId, userSession } = useUserId();
    const { toast } = useToast();
    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0];
    const [seller, setSeller] = useState<Seller | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [existingClients, setExistingClients] = useState<Client[]>([]);
    const [isClientListVisible, setIsClientListVisible] = useState(false);
    const [inventory, setInventory] = useState<Product[]>([]);
    const [activeProductSuggestion, setActiveProductSuggestion] = useState<number | null>(null);
    const [autoSendEmail, setAutoSendEmail] = useState(false);
    const [setPaymentReminder, setSetPaymentReminder] = useState(false);
    const [generateCopies, setGenerateCopies] = useState(false);
    
    const clientDetailsRef = useRef<HTMLDivElement>(null);
    const productSuggestionRefs = useRef<(HTMLTableCellElement | null)[]>([]);

    const [formState, setFormState] = useState<FormState>({
        invoice_no: "", invoice_date: today, due_date: defaultDueDate, client_name: "", client_address: "", client_gstin: "", client_state_name: "", client_phone: "", client_email: "",
        products: [{ srNo: 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }],
        terms_and_conditions: "1. Payment is due within 15 days.\n2. All goods remain the property of the seller until paid in full.", seller_id: null,
    });

    useEffect(() => {
        if (!userId) return;
        
        const checkCompanyInfo = async () => {
            const { data, error } = await supabase
                .from("sellers_record")
                .select("id, name, address, state, gstin, contact, email, logo_url, bank_name, account_no, ifsc_code, default_auto_send_invoice, default_payment_reminder")
                .eq("user_id", userId)
                .single();
            
            if (error || !data) {
                toast({ title: "Seller Error", description: `Seller info not found! Please fill out company details.`, variant: "destructive" });
                return null;
            }
            return data;
        };

        const fetchClients = async () => {
            const { data: invoices, error } = await supabase.from("invoices_record").select("buyer_id").eq("user_id", userId);
            if (error || !invoices || invoices.length === 0) return;
            const buyerIds = [...new Set((invoices as any[]).map(inv => inv.buyer_id).filter(id => id !== null))];
            if (buyerIds.length === 0) return;
            const { data: buyers, error: buyersError } = await supabase.from("buyers_record").select("id, name, address, gstin, state, email, phone_no").in("id", buyerIds);
            if (buyersError) {
                console.error("Error fetching buyers:", buyersError); return;
            }
            if (buyers) {
                const uniqueClients = buyers.filter((client, index, self) => index === self.findIndex((c) => c.name === client.name));
                setExistingClients(uniqueClients);
            }
        };

        const fetchProducts = async () => {
            const { data, error } = await supabase.from('products').select('name, hsn, unit, rate, gst').eq('user_id', userId);
            if (error) {
                toast({ title: "Could not fetch products", description: error.message, variant: "destructive" }); return;
            }
            if (data) setInventory(data);
        };

        const loadInitialData = async () => {
            setIsLoading(true);
            const sellerData = await checkCompanyInfo();
            if (sellerData) {
                setSeller(sellerData);
                setAutoSendEmail(sellerData.default_auto_send_invoice ?? false);
                setSetPaymentReminder(sellerData.default_payment_reminder ?? false);
                setFormState(prev => ({ ...prev, seller_id: sellerData.id }));
                await incremented_invoice_no(sellerData.id);
                await fetchClients();
                await fetchProducts();
            }
            setIsLoading(false);
        };
        
        loadInitialData();
    }, [userId, toast]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (activeProductSuggestion === null) return;
            const activeRef = productSuggestionRefs.current[activeProductSuggestion];
            if (activeRef && !activeRef.contains(event.target as Node)) {
                setActiveProductSuggestion(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [activeProductSuggestion]);

    useClickOutside(clientDetailsRef, () => setIsClientListVisible(false));
    
    const filteredClients = useMemo(() => {
        const searchInput = formState.client_name.toLowerCase();
        if (!searchInput) return [];
        return existingClients.filter(client => client.name.toLowerCase().includes(searchInput));
    }, [formState.client_name, existingClients]);

    const filteredProducts = (index: number) => {
        const searchInput = formState.products[index]?.name.toLowerCase() || '';
        if (!searchInput) return [];
        return inventory.filter(item => item.name.toLowerCase().includes(searchInput));
    };

    const handleSelectClient = (client: Client) => {
        const matchedState = indianStates.find(
            (s) => s.name.toLowerCase() === (client.state || '').toLowerCase().trim()
        );
        setFormState(prev => ({
            ...prev,
            client_name: client.name,
            client_address: client.address,
            client_gstin: client.gstin || "",
            client_state_name: matchedState ? matchedState.name : client.state || "",
            client_phone: client.phone_no || "",
            client_email: client.email || "",
        }));
        setIsClientListVisible(false);
    };
    
    const incremented_invoice_no = async (sellerId: string) => {
        const { data: invoiceData } = await supabase.from("invoices_record").select("number, date").eq("seller_id", sellerId).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1).single();
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const fyStart = month >= 3 ? year : year - 1;
        const fyEnd = (fyStart + 1) % 100;
        const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
        if (!invoiceData?.number) {
            setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return;
        }
        const lastInvoice = invoiceData.number;
        const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?/);
        if (!match) {
            setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return;
        }
        const numberPart = match[1];
        const fyInInvoice = match[2];
        let newNumber = (fyInInvoice && fyInInvoice !== currentFY) ? "001" : (parseInt(numberPart, 10) + 1).toString().padStart(numberPart.length > 0 ? numberPart.length : 3, '0');
        setFormState(prev => ({ ...prev, invoice_no: `${newNumber}/${currentFY}` }));
    };

    const handleInputChange = (field: keyof FormState, value: string) => setFormState(prev => ({ ...prev, [field]: value }));
    const handleProductChange = (index: number, field: keyof Item, value: string | number) => { const newProducts = [...formState.products]; (newProducts[index] as any)[field] = value; setFormState(prev => ({ ...prev, products: newProducts })); };
    const handleSelectProduct = (productIndex: number, product: Product) => { const newProducts = [...formState.products]; newProducts[productIndex] = { ...newProducts[productIndex], name: product.name, hsn: product.hsn || "", unit: product.unit || "Pcs", rate: product.rate || '', gst_rate: product.gst || 18, }; setFormState(prev => ({ ...prev, products: newProducts })); setActiveProductSuggestion(null); };
    const addProductRow = () => setFormState(prev => ({ ...prev, products: [...prev.products, { srNo: prev.products.length + 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }] }));
    const deleteProductRow = (index: number) => setFormState(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index).map((p, i) => ({...p, srNo: i + 1})) }));
    
    // --- ADDED: Validation logic ---
    const validateForm = () => {
        const { invoice_no, invoice_date, client_name, client_address, client_state_name, client_email, products } = formState;

        if (!invoice_no.trim()) {
            toast({ title: "Validation Error", description: "Invoice number is required.", variant: "destructive" });
            return false;
        }
        if (!invoice_date) {
            toast({ title: "Validation Error", description: "Invoice date is required.", variant: "destructive" });
            return false;
        }
        if (!client_name.trim()) {
            toast({ title: "Validation Error", description: "Client name is required.", variant: "destructive" });
            return false;
        }
        if (!client_address.trim()) {
            toast({ title: "Validation Error", description: "Client address is required.", variant: "destructive" });
            return false;
        }
        if (!client_state_name) {
            toast({ title: "Validation Error", description: "Client state is required.", variant: "destructive" });
            return false;
        }
        if (client_email && !/^\S+@\S+\.\S+$/.test(client_email)) {
            toast({ title: "Validation Error", description: "Please enter a valid email address.", variant: "destructive" });
            return false;
        }
        if (products.length === 0) {
            toast({ title: "Validation Error", description: "At least one item is required.", variant: "destructive" });
            return false;
        }
        for (let i = 0; i < products.length; i++) {
            const item = products[i];
            if (!item.name.trim()) {
                toast({ title: "Validation Error", description: `Item #${i + 1}: Name is required.`, variant: "destructive" });
                return false;
            }
            const quantity = parseFloat(item.quantity as string);
            if (isNaN(quantity) || quantity <= 0) {
                toast({ title: "Validation Error", description: `Item #${i + 1}: Quantity must be greater than 0.`, variant: "destructive" });
                return false;
            }
            const rate = parseFloat(item.rate as string);
            if (isNaN(rate) || rate <= 0) {
                toast({ title: "Validation Error", description: `Item #${i + 1}: Rate must be greater than 0.`, variant: "destructive" });
                return false;
            }
        }
        return true; // All checks passed
    };
    
    const handleCreateInvoice = async () => {
        if (!validateForm()) {
            return; // Stop if validation fails
        }
        if (!seller) { 
            toast({ title: "Seller information is not loaded.", variant: "destructive" }); 
            return; 
        }
        setIsSaving(true);
        const payload = {
            invoice: { title: formState.client_gstin ? "Tax Invoice" : "Retail Invoice", number: formState.invoice_no, date: formState.invoice_date, due_date: formState.due_date },
            company: { name: seller.name || "", address: seller.address || "", state: seller.state || "", gstin: seller.gstin || "", contact: seller.contact || "", email: seller.email || "", logo_url: seller.logo_url|| "" },
            buyer: { name: formState.client_name, address: formState.client_address, state: formState.client_state_name, gstin: formState.client_gstin, phone_no: formState.client_phone, email: formState.client_email, signature_path: "" },
            items: formState.products.map(p => ({ name: p.name, hsn: p.hsn, unit: p.unit, quantity: parseFloat(p.quantity as string) || 0, rate: parseFloat(p.rate as string) || 0, gst_rate: parseFloat(p.gst_rate as string) || 0 })),
            bank: { name: seller.bank_name || "", account: seller.account_no || "", branch_ifsc: seller.ifsc_code || "" },
            terms_and_conditions: formState.terms_and_conditions.split('\n').filter(line => line.trim() !== ""),
            auto_send_email: autoSendEmail, set_payment_reminder: setPaymentReminder, generate_copies: generateCopies,
        };
        console.log("Payload:", payload); // Debug log  
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/create`, {
                method: "POST", 
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
                body: JSON.stringify(payload),
            });
            const response = await res.json();
            if (!res.ok) throw new Error(response.detail || "Failed to create invoice.");
            toast({ title: "Invoice Created ✅", description: "Invoice PDF has been generated successfully." });
            if (response.url) window.open(response.url, '_blank');
            if (seller) await incremented_invoice_no(seller.id);
        } catch (e: any) {
            toast({ title: "Error ❌", description: e.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) return <DashboardLayout><LoadingSkeleton /></DashboardLayout>;
    
    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 pb-24">
                <PageHeader />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <FormSectionCard title="Client Details" icon={<User className="h-5 w-5"/>}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 relative" ref={clientDetailsRef}>
                                        <Label htmlFor="client_name">Client Name</Label>
                                        <Input id="client_name" value={formState.client_name} onChange={(e) => handleInputChange('client_name', e.target.value)} onFocus={() => setIsClientListVisible(true)} required autoComplete="off" />
                                        {isClientListVisible && filteredClients.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {filteredClients.map(client => ( <div key={client.id} className="px-4 py-2 hover:bg-accent cursor-pointer" onMouseDown={() => handleSelectClient(client)}>{client.name}</div> ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5"><Label htmlFor="client_gstin">GSTIN</Label><Input id="client_gstin" value={formState.client_gstin} onChange={(e) => handleInputChange('client_gstin', e.target.value)} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="client_address">Address</Label><Textarea id="client_address" value={formState.client_address} onChange={(e) => handleInputChange('client_address', e.target.value)} required /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="client_phone">Phone No.</Label><Input id="client_phone" type="tel" value={formState.client_phone} onChange={(e) => handleInputChange('client_phone', e.target.value)} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="client_email">Email</Label><Input id="client_email" type="email" value={formState.client_email} onChange={(e) => handleInputChange('client_email', e.target.value)} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="client_state_name">State</Label><Select value={formState.client_state_name} onValueChange={(v) => handleInputChange('client_state_name', v)} required><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{indianStates.map((s) => (<SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                            </div>
                        </FormSectionCard>
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
                        <FormSectionCard title="Terms & Conditions" icon={<FileText className="h-5 w-5"/>}><Textarea value={formState.terms_and_conditions} onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)} rows={5} /></FormSectionCard>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <FormSectionCard title="Invoice Meta" icon={<FileText className="h-5 w-5"/>}><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={formState.invoice_no} onChange={(e) => handleInputChange('invoice_no', e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={formState.invoice_date} onChange={(e) => handleInputChange('invoice_date', e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" type="date" value={formState.due_date} onChange={(e) => handleInputChange('due_date', e.target.value)} /></div></div></div></FormSectionCard>
                        <FormSectionCard title="Seller Details" icon={<Building className="h-5 w-5"/>}>
                            {seller ? <div className="space-y-2 text-sm text-muted-foreground">
                                <p className="font-semibold text-primary">{seller.name}</p>
                                <p>{seller.address}</p>
                                {seller.gstin && <p>GST: {seller.gstin}</p>}
                                {seller.contact && <p className="flex items-center gap-2"><Phone size={14} /> {seller.contact}</p>}
                                {seller.email && <p className="flex items-center gap-2"><Mail size={14} /> {seller.email}</p>}
                            </div> : <Skeleton className="h-20 w-full" />}
                        </FormSectionCard>
                        <FormSectionCard title="Bank Details" icon={<Banknote className="h-5 w-5"/>}>{seller ? <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> {seller.bank_name}</p><p><span className="font-semibold text-primary">A/C No:</span> {seller.account_no}</p><p><span className="font-semibold text-primary">IFSC:</span> {seller.ifsc_code}</p></div> : <Skeleton className="h-12 w-full" />}</FormSectionCard>
                        <FormSectionCard title="Automation & Copies" icon={<Settings className="h-5 w-5"/>}><div className="space-y-4"><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="auto-send" className="flex items-center gap-2 cursor-pointer"><Send size={16}/>Auto Send Invoice</Label><Switch id="auto-send" checked={autoSendEmail} onCheckedChange={setAutoSendEmail} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="payment-reminder" className="flex items-center gap-2 cursor-pointer"><Bell size={16}/>Set Payment Reminder</Label><Switch id="payment-reminder" checked={setPaymentReminder} onCheckedChange={setSetPaymentReminder} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="generate-copies" className="flex items-center gap-2 cursor-pointer"><Copy size={16}/>Generate Duplicate/Triplicate</Label><Switch id="generate-copies" checked={generateCopies} onCheckedChange={setGenerateCopies} /></div></div></FormSectionCard>
                    </div>
                </div>
            </div>
            <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t"><div className="container mx-auto flex items-center justify-end h-16 px-4 md:px-6"><Button onClick={handleCreateInvoice} disabled={isSaving || isLoading} size="lg">{isSaving ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />Create Invoice</>}</Button></div></div>
        </DashboardLayout>
    );
}