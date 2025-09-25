
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
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
// import { Skeleton } from "@/components/ui/skeleton";
// import SvgLoader from "./ui/loader";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import { useToast } from "../hooks/use-toast";
// import { indianStates } from "@/lib/indianStates";
// import { FileText, User, Building, Banknote, Trash2, PlusCircle, Save, Bell, Send, Copy, Settings, Phone, Mail, Palette, Stamp } from 'lucide-react';
// import Image from "next/image";

// // --- TYPE DEFINITIONS (UPDATED) ---
// interface Item {
//     srNo: number; name: string; hsn: string; quantity: number | ''; unit: string; rate: number | ''; gst_rate: number | '';
// }
// interface Product {
//     name: string; hsn: string | null; unit: string | null; rate: number | null; gst: number | null;
// }
// interface Seller {
//     id: string; name?: string; address?: string; state?: string; gstin?: string; contact?: string | null; email?: string | null; logo_url?: string; sign_url?: string; stamp?: string; bank_name?: string; account_no?: string; ifsc_code?: string; default_auto_send_invoice?: boolean | null; default_payment_reminder?: boolean | null;
//     default_template?: string | null; // Added default_template
// }
// interface Client {
//     id: number; name: string; address: string; gstin: string | null; state: string | null; email: string | null; phone_no: string | null;
// }
// interface FormState {
//     invoice_no: string; invoice_date: string; due_date: string; client_name: string; client_address: string; client_gstin: string; client_state_name: string; client_phone: string; client_email: string; products: Item[]; terms_and_conditions: string; seller_id: string | null;
// }
// interface InvoiceTemplate {
//     id: string; name: string; imageUrl: string;
// }

// // --- TEMPLATE DATA ---
// const availableTemplates: InvoiceTemplate[] = [
//     { id: 'template1', name: 'Professional Invoice', imageUrl: '/template/temp1.png' },
//     { id: 'template2', name: 'Simple Elegant Invoice', imageUrl: '/template/temp2.png' },
// ];

// // --- HOOK FOR CLICK OUTSIDE DETECTION ---
// const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
//     useEffect(() => {
//         const handleMouseDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) { callback(); } };
//         document.addEventListener("mousedown", handleMouseDown);
//         return () => { document.removeEventListener("mousedown", handleMouseDown); };
//     }, [ref, callback]);
// };

// // --- UI SUB-COMPONENTS ---
// const PageHeader = () => ( <div><h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Invoice</h1><p className="text-muted-foreground">Fill in the details below to generate a new invoice.</p></div> );
// const FormSectionCard = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => ( <Card><CardHeader><div className="flex items-center gap-3">{icon} <CardTitle>{title}</CardTitle></div></CardHeader><CardContent>{children}</CardContent></Card> );
// const LoadingSkeleton = () => ( <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><Skeleton className="h-10 w-1/3" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"><div className="lg:col-span-2 space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-64 w-full" /></div><div className="lg:col-span-1 space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div></div></div> );

// // --- TEMPLATE DIALOG COMPONENT ---
// // --- TEMPLATE DIALOG COMPONENT (UPDATED) ---
// const TemplateDialog = ({ isOpen, onClose, currentTemplate, onSelectTemplate, onSetDefault, isSavingDefault }: { isOpen: boolean; onClose: () => void; currentTemplate: string; onSelectTemplate: (id: string) => void; onSetDefault: () => void; isSavingDefault: boolean; }) => {
//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             {/* --- MODIFICATION IS HERE --- */}
//             <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
//                 <DialogHeader>
//                     <DialogTitle>Choose Invoice Template</DialogTitle>
//                     <DialogDescription>Select a layout for your invoice. You can set one as your default for future use.</DialogDescription>
//                 </DialogHeader>
//                 {/* --- And a small grid adjustment for better layout --- */}
//                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-4 overflow-y-auto">
//                     {availableTemplates.map((template) => (
//                         <div key={template.id} className="group cursor-pointer" onClick={() => onSelectTemplate(template.id)}>
//                             <div className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${currentTemplate === template.id ? 'border-primary ring-4 ring-primary/30' : 'border-muted hover:border-primary/50'}`}>
//                                 <Image src={template.imageUrl} alt={template.name} layout="fill" objectFit="cover" />
//                                 <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all" />
//                             </div>
//                             <p className={`text-sm font-medium text-center mt-2 ${currentTemplate === template.id ? 'text-primary' : 'text-muted-foreground'}`}>{template.name}</p>
//                         </div>
//                     ))}
//                 </div>
//                 <DialogFooter className="mt-auto pt-4 border-t">
//                     <Button variant="outline" onClick={onSetDefault} disabled={isSavingDefault}>{isSavingDefault ? <SvgLoader /> : <><Save size={16} className="mr-2" /> Save as Default</>}</Button>
//                     <DialogClose asChild><Button>Done</Button></DialogClose>
//                 </DialogFooter>
//             </DialogContent>
//         </Dialog>
//     );
// };


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
//     const [selectedTemplate, setSelectedTemplate] = useState<string>('template1');
//     const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
//     const [isSavingDefault, setIsSavingDefault] = useState(false);
    
//     const clientDetailsRef = useRef<HTMLDivElement>(null);
//     const productSuggestionRefs = useRef<(HTMLTableCellElement | null)[]>([]);

//     const [formState, setFormState] = useState<FormState>({
//         invoice_no: "", invoice_date: today, due_date: defaultDueDate, client_name: "", client_address: "", client_gstin: "", client_state_name: "", client_phone: "", client_email: "",
//         products: [{ srNo: 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 0 }],
//         terms_and_conditions: "1. Payment is due within 15 days.\n2. All goods remain the property of the seller until paid in full.", seller_id: null,
//     });

//     useEffect(() => {
//         if (!userId) return;
//         const checkCompanyInfo = async () => {
//             const { data, error } = await supabase.from("sellers_record").select("id, name, address, state, gstin, contact, email, logo_url,sign_url,stamp, bank_name, account_no, ifsc_code, default_auto_send_invoice, default_payment_reminder, default_template").eq("user_id", userId).single();
//             if (error || !data) { toast({ title: "Seller Error", description: `Seller info not found! Please fill out company details.`, variant: "destructive" }); return null; }
//             return data;
//         };
//         const fetchClients = async () => {
//             const { data: invoices, error } = await supabase.from("invoices_record").select("buyer_id").eq("user_id", userId);
//             if (error || !invoices || invoices.length === 0) return;
//             const buyerIds = [...new Set((invoices as any[]).map(inv => inv.buyer_id).filter(id => id !== null))];
//             if (buyerIds.length === 0) return;
//             const { data: buyers, error: buyersError } = await supabase.from("buyers_record").select("id, name, address, gstin, state, email, phone_no").in("id", buyerIds);
//             if (buyersError) { console.error("Error fetching buyers:", buyersError); return; }
//             if (buyers) { const uniqueClients = buyers.filter((client, index, self) => index === self.findIndex((c) => c.name === client.name)); setExistingClients(uniqueClients); }
//         };
//         const fetchProducts = async () => {
//             const { data, error } = await supabase.from('products').select('name, hsn, unit, rate, gst').eq('user_id', userId);
//             if (error) { toast({ title: "Could not fetch products", description: error.message, variant: "destructive" }); return; }
//             if (data) setInventory(data);
//         };
//         const loadInitialData = async () => {
//             setIsLoading(true);
//             const sellerData = await checkCompanyInfo();
//             if (sellerData) {
//                 setSeller(sellerData);
//                 setAutoSendEmail(sellerData.default_auto_send_invoice ?? false);
//                 setSetPaymentReminder(sellerData.default_payment_reminder ?? false);
//                 setSelectedTemplate(sellerData.default_template || 'template1'); // Set default template
//                 setFormState(prev => ({ ...prev, seller_id: sellerData.id }));
//                 await incremented_invoice_no(sellerData.id);
//                 await fetchClients();
//                 await fetchProducts();
//             }
//             setIsLoading(false);
//         };
//         loadInitialData();
//     }, [userId, toast]);

//     useEffect(() => {
//         const handleOutsideClick = (event: MouseEvent) => {
//             if (activeProductSuggestion === null) return;
//             const activeRef = productSuggestionRefs.current[activeProductSuggestion];
//             if (activeRef && !activeRef.contains(event.target as Node)) { setActiveProductSuggestion(null); }
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

//     const handleSelectClient = (client: Client) => {
//         const matchedState = indianStates.find((s) => s.name.toLowerCase() === (client.state || '').toLowerCase().trim());
//         setFormState(prev => ({ ...prev, client_name: client.name, client_address: client.address, client_gstin: client.gstin || "", client_state_name: matchedState ? matchedState.name : client.state || "", client_phone: client.phone_no || "", client_email: client.email || "", }));
//         setIsClientListVisible(false);
//     };
    
//     // const incremented_invoice_no = async (sellerId: string) => {
//     //     const { data: invoiceData } = await supabase.from("invoices_record").select("number, date").eq("seller_id", sellerId).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1).single();
//     //     const today = new Date();
//     //     const year = today.getFullYear();
//     //     const month = today.getMonth();
//     //     const fyStart = month >= 3 ? year : year - 1;
//     //     const fyEnd = (fyStart + 1) % 100;
//     //     const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
//     //     if (!invoiceData?.number) { setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return; }
//     //     const lastInvoice = invoiceData.number;
//     //     const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?/);
//     //     if (!match) { setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return; }
//     //     const numberPart = match[1];
//     //     const fyInInvoice = match[2];
//     //     let newNumber = (fyInInvoice && fyInInvoice !== currentFY) ? "001" : (parseInt(numberPart, 10) + 1).toString().padStart(numberPart.length > 0 ? numberPart.length : 3, '0');
//     //     setFormState(prev => ({ ...prev, invoice_no: `${newNumber}/${currentFY}` }));
//     // };

//     const incremented_invoice_no = async (sellerId: string) => {
//     const { data: invoiceData } = await supabase
//         .from("invoices_record")
//         .select("number, date")
//         .eq("seller_id", sellerId)
//         .order("date", { ascending: false })
//         .order("created_at", { ascending: false })
//         .limit(1)
//         .single();

//     // --- Financial Year Calculation (remains the same) ---
//     const today = new Date();
//     const year = today.getFullYear();
//     const month = today.getMonth(); // 0-11
//     const fyStart = month >= 3 ? year : year - 1; // FY starts in April (month 3)
//     const fyEnd = (fyStart + 1) % 100;
//     const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;

//     // --- Case 1: No previous invoices exist ---
//     if (!invoiceData?.number) {
//         setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` }));
//         return;
//     }

//     const lastInvoice = invoiceData.number;

//     // --- New Robust Logic ---
//     // This regex captures three parts:
//     // 1. (.*?)  -> The Prefix (e.g., "CEW/" or "INV-")
//     // 2. (\d+)    -> The Number part (e.g., "001")
//     // 3. ([^d]*)$ -> The Suffix (e.g., "/2025-26" or "")
//     const match = lastInvoice.match(/^(.*?)(\d+)([^d]*)$/);

//     // --- Case 2: Last invoice number doesn't have a number to increment ---
//     if (!match) {
//         setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` }));
//         return;
//     }
    
//     // Deconstruct the last invoice number
//     const prefix = match[1] || "";
//     const numberPart = match[2];
//     const suffix = match[3] || "";

//     // Check for a financial year in the suffix
//     const fyMatch = suffix.match(/(\d{4}-\d{2})/);
//     const fyInInvoice = fyMatch ? fyMatch[1] : null;

//     let newNumber;
//     let newSuffix = suffix;

//     // --- Case 3: Financial year has changed, so reset the number ---
//     if (fyInInvoice && fyInInvoice !== currentFY) {
//         newNumber = 1;
//         // Update the suffix to reflect the new financial year
//         newSuffix = suffix.replace(fyInInvoice, currentFY);
//     } 
//     // --- Case 4: Same financial year (or no year found), just increment ---
//     else {
//         newNumber = parseInt(numberPart, 10) + 1;
//     }

//     // Pad the new number with leading zeros to match the old number's length
//     const newNumberPadded = newNumber.toString().padStart(numberPart.length, '0');
    
//     // Reconstruct and set the new invoice number
//     const newInvoiceNo = `${prefix}${newNumberPadded}${newSuffix}`;
//     setFormState(prev => ({ ...prev, invoice_no: newInvoiceNo }));
// };
//     // MODIFIED: handleInputChange
//     const handleInputChange = (field: keyof FormState, value: string) => {
//         // Convert GSTIN to uppercase automatically
//         if (field === 'client_gstin') {
//             setFormState(prev => ({ ...prev, [field]: value.toUpperCase() }));
//         } else {
//             setFormState(prev => ({ ...prev, [field]: value }));
//         }
//     };
//     const handleProductChange = (index: number, field: keyof Item, value: string | number) => { const newProducts = [...formState.products]; (newProducts[index] as any)[field] = value; setFormState(prev => ({ ...prev, products: newProducts })); };
//     const handleSelectProduct = (productIndex: number, product: Product) => { const newProducts = [...formState.products]; newProducts[productIndex] = { ...newProducts[productIndex], name: product.name, hsn: product.hsn || "", unit: product.unit || "Pcs", rate: product.rate || '', gst_rate: product.gst || 18, }; setFormState(prev => ({ ...prev, products: newProducts })); setActiveProductSuggestion(null); };
//     const addProductRow = () => setFormState(prev => ({ ...prev, products: [...prev.products, { srNo: prev.products.length + 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }] }));
//     const deleteProductRow = (index: number) => setFormState(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index).map((p, i) => ({...p, srNo: i + 1})) }));
    
//     // UPDATED: validateForm function
// const validateForm = () => {
//     const { invoice_no, invoice_date, client_name, client_address, client_state_name, client_gstin, products } = formState;
    
//     // GSTIN Regular Expression: 2-digit state code, 10-char PAN, 3-digit registration details
//     const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

//     if (!invoice_no.trim()) { toast({ title: "Validation Error", description: "Invoice number is required.", variant: "destructive" }); return false; }
//     if (!invoice_date) { toast({ title: "Validation Error", description: "Invoice date is required.", variant: "destructive" }); return false; }
//     if (!client_name.trim()) { toast({ title: "Validation Error", description: "Client name is required.", variant: "destructive" }); return false; }
//     if (!client_address.trim()) { toast({ title: "Validation Error", description: "Client address is required.", variant: "destructive" }); return false; }
//     if (!client_state_name) { toast({ title: "Validation Error", description: "Client state is required.", variant: "destructive" }); return false; }
    
//     // --- NEW VALIDATION LOGIC ---
//     // Check GSTIN only if it's not empty
//     if (client_gstin && !gstinRegex.test(client_gstin)) {
//         toast({
//             title: "Invalid GSTIN",
//             description: "Please enter a valid 15-character GSTIN format.",
//             variant: "destructive"
//         });
//         return false;
//     }
//     // --- END NEW LOGIC ---

//     for (let i = 0; i < products.length; i++) {
//         const item = products[i];
//         if (!item.name.trim()) { toast({ title: "Validation Error", description: `Item #${i + 1}: Name is required.`, variant: "destructive" }); return false; }
//         if (isNaN(parseFloat(item.quantity as string)) || parseFloat(item.quantity as string) <= 0) { toast({ title: "Validation Error", description: `Item #${i + 1}: Quantity must be > 0.`, variant: "destructive" }); return false; }
//         if (isNaN(parseFloat(item.rate as string)) || parseFloat(item.rate as string) <= 0) { toast({ title: "Validation Error", description: `Item #${i + 1}: Rate must be > 0.`, variant: "destructive" }); return false; }
//     }
//     return true;
// };
    
//     const handleSetDefaultTemplate = async () => {
//         if (!seller) return;
//         setIsSavingDefault(true);
//         const { error } = await supabase.from('sellers_record').update({ default_template: selectedTemplate }).eq('id', seller.id);
//         if (error) {
//             toast({ title: "Error", description: "Could not save default template. " + error.message, variant: "destructive" });
//         } else {
//             toast({ title: "Success", description: `Template '${availableTemplates.find(t => t.id === selectedTemplate)?.name}' is now your default.` });
//             setSeller(prev => prev ? { ...prev, default_template: selectedTemplate } : null);
//         }
//         setIsSavingDefault(false);
//     };

//     const handleCreateInvoice = async () => {
//         if (!validateForm()) return;
//         if (!seller) { toast({ title: "Seller information is not loaded.", variant: "destructive" }); return; }
//         setIsSaving(true);
//         const payload = {
//             template: selectedTemplate,
//             invoice: { title: formState.client_gstin ? "Tax Invoice" : "Retail Invoice", number: formState.invoice_no, date: formState.invoice_date, due_date: formState.due_date },
//             company: { name: seller.name || "", address: seller.address || "", state: seller.state || "", gstin: seller.gstin || "", contact: seller.contact || "", email: seller.email || "", logo_url: seller.logo_url|| "", sign_url: seller.sign_url,stamp: seller.stamp },
//             buyer: { name: formState.client_name, address: formState.client_address, state: formState.client_state_name, gstin: formState.client_gstin, phone_no: formState.client_phone, email: formState.client_email, signature_path: "" },
//             items: formState.products.map(p => ({ name: p.name, hsn: p.hsn, unit: p.unit, quantity: parseFloat(p.quantity as string) || 0, rate: parseFloat(p.rate as string) || 0, gst_rate: parseFloat(p.gst_rate as string) || 0 })),
//             bank: { name: seller.bank_name || "", account: seller.account_no || "", branch_ifsc: seller.ifsc_code || "" },
//             terms_and_conditions: formState.terms_and_conditions.split('\n').filter(line => line.trim() !== ""),
//             auto_send_email: autoSendEmail, set_payment_reminder: setPaymentReminder, generate_copies: generateCopies,
//         };
//         try {
//             const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/create`, {
//                 method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` }, body: JSON.stringify(payload),
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
//                         {/* Form Sections remain here... */}
//                          <FormSectionCard title="Client Details" icon={<User className="h-5 w-5"/>}>
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
//                         <FormSectionCard title="Seller Details" icon={<Building className="h-5 w-5"/>}>{seller ? <div className="space-y-2 text-sm text-muted-foreground"><p className="font-semibold text-primary">{seller.name}</p><p>{seller.address}</p>{seller.gstin && <p>GST: {seller.gstin}</p>}{seller.contact && <p className="flex items-center gap-2"><Phone size={14} /> {seller.contact}</p>}{seller.email && <p className="flex items-center gap-2"><Mail size={14} /> {seller.email}</p>}</div> : <Skeleton className="h-20 w-full" />}</FormSectionCard>
//                         <FormSectionCard title="Bank Details" icon={<Banknote className="h-5 w-5"/>}>{seller ? <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> {seller.bank_name}</p><p><span className="font-semibold text-primary">A/C No:</span> {seller.account_no}</p><p><span className="font-semibold text-primary">IFSC:</span> {seller.ifsc_code}</p></div> : <Skeleton className="h-12 w-full" />}</FormSectionCard>
//                         <FormSectionCard title="Automation & Copies" icon={<Settings className="h-5 w-5"/>}><div className="space-y-4"><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="auto-send" className="flex items-center gap-2 cursor-pointer"><Send size={16}/>Auto Send Invoice</Label><Switch id="auto-send" checked={autoSendEmail} onCheckedChange={setAutoSendEmail} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="payment-reminder" className="flex items-center gap-2 cursor-pointer"><Bell size={16}/>Set Payment Reminder</Label><Switch id="payment-reminder" checked={setPaymentReminder} onCheckedChange={setSetPaymentReminder} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="generate-copies" className="flex items-center gap-2 cursor-pointer"><Copy size={16}/>Generate Duplicate/Triplicate</Label><Switch id="generate-copies" checked={generateCopies} onCheckedChange={setGenerateCopies} /></div></div></FormSectionCard>
//                     </div>
//                 </div>
//             </div>
//             <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t">
//                 <div className="container mx-auto flex items-center justify-end h-16 px-4 md:px-6 gap-4">
//                     <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
//                         <Palette className="mr-2 h-4 w-4" /> Choose Template
//                     </Button>
//                     <Button onClick={handleCreateInvoice} disabled={isSaving || isLoading} size="lg">
//                         {isSaving ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />Create Invoice</>}
//                     </Button>
//                 </div>
//             </div>
//             <TemplateDialog 
//                 isOpen={isTemplateDialogOpen} 
//                 onClose={() => setIsTemplateDialogOpen(false)} 
//                 currentTemplate={selectedTemplate} 
//                 onSelectTemplate={setSelectedTemplate}
//                 onSetDefault={handleSetDefaultTemplate}
//                 isSavingDefault={isSavingDefault}
//             />
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import SvgLoader from "./ui/loader";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { useToast } from "../hooks/use-toast";
import { indianStates } from "@/lib/indianStates";
import { FileText, User, Building, Banknote, Trash2, PlusCircle, Save, Bell, Send, Copy, Settings, Phone, Mail, Palette, Stamp } from 'lucide-react';
import Image from "next/image";

// --- TYPE DEFINITIONS ---
interface Item {
    srNo: number; name: string; hsn: string; quantity: number | ''; unit: string; rate: number | ''; gst_rate: number | '';
}
interface Product {
    name: string; hsn: string | null; unit: string | null; rate: number | null; gst: number | null;
}
interface Seller {
    id: string; name?: string; address?: string; state?: string; gstin?: string; contact?: string | null; email?: string | null; logo_url?: string; sign_url?: string; stamp?: string; bank_name?: string; account_no?: string; ifsc_code?: string; default_auto_send_invoice?: boolean | null; default_payment_reminder?: boolean | null;
    default_template?: string | null;
}
interface Client {
    id: number; name: string; address: string; gstin: string | null; state: string | null; email: string | null; phone_no: string | null;
}
interface FormState {
    invoice_no: string; invoice_date: string; due_date: string; client_name: string; client_address: string; client_gstin: string; client_state_name: string; client_phone: string; client_email: string; products: Item[]; terms_and_conditions: string; seller_id: string | null;
}
interface InvoiceTemplate {
    id: string; name: string; imageUrl: string;
}

// --- CONSTANTS & HELPERS ---
const availableTemplates: InvoiceTemplate[] = [
    { id: 'template1', name: 'Professional Invoice', imageUrl: '/template/temp1.png' },
    { id: 'template2', name: 'Simple Elegant Invoice', imageUrl: '/template/temp2.png' },
];

const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
    useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) { callback(); } };
        document.addEventListener("mousedown", handleMouseDown);
        return () => { document.removeEventListener("mousedown", handleMouseDown); };
    }, [ref, callback]);
};

// --- UI SUB-COMPONENTS ---
const PageHeader = () => ( <div><h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Invoice</h1><p className="text-muted-foreground">Fill in the details below to generate a new invoice.</p></div> );
const FormSectionCard = ({ title, icon, children }: { title: string, icon?: React.ReactNode, children: React.ReactNode }) => ( <Card><CardHeader><div className="flex items-center gap-3">{icon} <CardTitle>{title}</CardTitle></div></CardHeader><CardContent>{children}</CardContent></Card> );
const LoadingSkeleton = () => ( <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><Skeleton className="h-10 w-1/3" /></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"><div className="lg:col-span-2 space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-56 w-full" /><Skeleton className="h-64 w-full" /></div><div className="lg:col-span-1 space-y-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div></div></div> );
const TemplateDialog = ({ isOpen, onClose, currentTemplate, onSelectTemplate, onSetDefault, isSavingDefault }: { isOpen: boolean; onClose: () => void; currentTemplate: string; onSelectTemplate: (id: string) => void; onSetDefault: () => void; isSavingDefault: boolean; }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader><DialogTitle>Choose Invoice Template</DialogTitle><DialogDescription>Select a layout for your invoice. You can set one as your default for future use.</DialogDescription></DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-4 overflow-y-auto">
                    {availableTemplates.map((template) => (
                        <div key={template.id} className="group cursor-pointer" onClick={() => onSelectTemplate(template.id)}>
                            <div className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${currentTemplate === template.id ? 'border-primary ring-4 ring-primary/30' : 'border-muted hover:border-primary/50'}`}>
                                <Image src={template.imageUrl} alt={template.name} layout="fill" objectFit="cover" />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all" />
                            </div>
                            <p className={`text-sm font-medium text-center mt-2 ${currentTemplate === template.id ? 'text-primary' : 'text-muted-foreground'}`}>{template.name}</p>
                        </div>
                    ))}
                </div>
                <DialogFooter className="mt-auto pt-4 border-t">
                    <Button variant="outline" onClick={onSetDefault} disabled={isSavingDefault}>{isSavingDefault ? <SvgLoader /> : <><Save size={16} className="mr-2" /> Save as Default</>}</Button>
                    <DialogClose asChild><Button>Done</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

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
    const [selectedTemplate, setSelectedTemplate] = useState<string>('template1');
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [isSavingDefault, setIsSavingDefault] = useState(false);
    const clientDetailsRef = useRef<HTMLDivElement>(null);
    const productSuggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [formState, setFormState] = useState<FormState>({
        invoice_no: "", invoice_date: today, due_date: defaultDueDate, client_name: "", client_address: "", client_gstin: "", client_state_name: "", client_phone: "", client_email: "",
        products: [{ srNo: 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 0 }],
        terms_and_conditions: "1. Payment is due within 15 days.\n2. All goods remain the property of the seller until paid in full.", seller_id: null,
    });

    useEffect(() => {
        if (!userId) return;
        const loadInitialData = async () => {
            setIsLoading(true);
            const { data: sellerData, error: sellerError } = await supabase.from("sellers_record").select("id, name, address, state, gstin, contact, email, logo_url,sign_url,stamp, bank_name, account_no, ifsc_code, default_auto_send_invoice, default_payment_reminder, default_template").eq("user_id", userId).single();
            if (sellerError || !sellerData) { toast({ title: "Seller Error", description: `Seller info not found! Please fill out company details.`, variant: "destructive" }); setIsLoading(false); return; }
            setSeller(sellerData);
            setAutoSendEmail(sellerData.default_auto_send_invoice ?? false);
            setSetPaymentReminder(sellerData.default_payment_reminder ?? false);
            setSelectedTemplate(sellerData.default_template || 'template1');
            setFormState(prev => ({ ...prev, seller_id: sellerData.id }));
            await Promise.all([
                 incremented_invoice_no(sellerData.id),
                 fetchClients(),
                 fetchProducts()
            ]);
            setIsLoading(false);
        };
        const fetchClients = async () => {
            const { data: invoices, error } = await supabase.from("invoices_record").select("buyer_id").eq("user_id", userId);
            if (error || !invoices || invoices.length === 0) return;
            const buyerIds = [...new Set((invoices as any[]).map(inv => inv.buyer_id).filter(id => id !== null))];
            if (buyerIds.length === 0) return;
            const { data: buyers, error: buyersError } = await supabase.from("buyers_record").select("id, name, address, gstin, state, email, phone_no").in("id", buyerIds);
            if (buyersError) { console.error("Error fetching buyers:", buyersError); return; }
            if (buyers) { const uniqueClients = buyers.filter((client, index, self) => index === self.findIndex((c) => c.name === client.name)); setExistingClients(uniqueClients); }
        };
        const fetchProducts = async () => {
            const { data, error } = await supabase.from('products').select('name, hsn, unit, rate, gst').eq('user_id', userId);
            if (error) { toast({ title: "Could not fetch products", description: error.message, variant: "destructive" }); return; }
            if (data) setInventory(data);
        };
        loadInitialData();
    }, [userId, toast]);
    
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
        const matchedState = indianStates.find((s) => s.name.toLowerCase() === (client.state || '').toLowerCase().trim());
        setFormState(prev => ({ ...prev, client_name: client.name, client_address: client.address, client_gstin: client.gstin || "", client_state_name: matchedState ? matchedState.name : client.state || "", client_phone: client.phone_no || "", client_email: client.email || "", }));
        setIsClientListVisible(false);
    };
    
    const incremented_invoice_no = async (sellerId: string) => {
        const { data: invoiceData } = await supabase.from("invoices_record").select("number, date").eq("seller_id", sellerId).order("date", { ascending: false }).order("created_at", { ascending: false }).limit(1).single();
        const today = new Date(); const year = today.getFullYear(); const month = today.getMonth(); const fyStart = month >= 3 ? year : year - 1; const fyEnd = (fyStart + 1) % 100; const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
        if (!invoiceData?.number) { setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return; }
        const lastInvoice = invoiceData.number;
        const match = lastInvoice.match(/^(.*?)(\d+)([^d]*)$/);
        if (!match) { setFormState(prev => ({ ...prev, invoice_no: `001/${currentFY}` })); return; }
        const prefix = match[1] || ""; const numberPart = match[2]; const suffix = match[3] || "";
        const fyMatch = suffix.match(/(\d{4}-\d{2})/); const fyInInvoice = fyMatch ? fyMatch[1] : null;
        let newNumber; let newSuffix = suffix;
        if (fyInInvoice && fyInInvoice !== currentFY) { newNumber = 1; newSuffix = suffix.replace(fyInInvoice, currentFY); } 
        else { newNumber = parseInt(numberPart, 10) + 1; }
        const newNumberPadded = newNumber.toString().padStart(numberPart.length, '0');
        const newInvoiceNo = `${prefix}${newNumberPadded}${newSuffix}`;
        setFormState(prev => ({ ...prev, invoice_no: newInvoiceNo }));
    };

    const handleInputChange = (field: keyof FormState, value: string) => {
        if (field === 'client_gstin') {
            setFormState(prev => ({ ...prev, [field]: value.toUpperCase() }));
        } else {
            setFormState(prev => ({ ...prev, [field]: value }));
        }
    };
    const handleProductChange = (index: number, field: keyof Item, value: string | number) => { const newProducts = [...formState.products]; (newProducts[index] as any)[field] = value; setFormState(prev => ({ ...prev, products: newProducts })); };
    const handleSelectProduct = (productIndex: number, product: Product) => { const newProducts = [...formState.products]; newProducts[productIndex] = { ...newProducts[productIndex], name: product.name, hsn: product.hsn || "", unit: product.unit || "Pcs", rate: product.rate || '', gst_rate: product.gst || 18, }; setFormState(prev => ({ ...prev, products: newProducts })); setActiveProductSuggestion(null); };
    const addProductRow = () => setFormState(prev => ({ ...prev, products: [...prev.products, { srNo: prev.products.length + 1, name: "", hsn: "", quantity: 1, unit: "Pcs", rate: '', gst_rate: 18 }] }));
    const deleteProductRow = (index: number) => setFormState(prev => ({ ...prev, products: prev.products.filter((_, i) => i !== index).map((p, i) => ({...p, srNo: i + 1})) }));
    
    const validateForm = () => {
        const { invoice_no, invoice_date, client_name, client_gstin, products } = formState;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!invoice_no.trim()) { toast({ title: "Validation Error", description: "Invoice number is required.", variant: "destructive" }); return false; }
        if (!invoice_date) { toast({ title: "Validation Error", description: "Invoice date is required.", variant: "destructive" }); return false; }
        if (!client_name.trim()) { toast({ title: "Validation Error", description: "Client name is required.", variant: "destructive" }); return false; }
        if (client_gstin && !gstinRegex.test(client_gstin)) { toast({ title: "Invalid GSTIN", description: "Please enter a valid 15-character GSTIN format.", variant: "destructive" }); return false; }
        for (let i = 0; i < products.length; i++) {
            const item = products[i];
            if (!item.name.trim()) { toast({ title: "Validation Error", description: `Item #${i + 1}: Name is required.`, variant: "destructive" }); return false; }
            if (isNaN(parseFloat(item.quantity as string)) || parseFloat(item.quantity as string) <= 0) { toast({ title: "Validation Error", description: `Item #${i + 1}: Quantity must be > 0.`, variant: "destructive" }); return false; }
            if (isNaN(parseFloat(item.rate as string)) || parseFloat(item.rate as string) <= 0) { toast({ title: "Validation Error", description: `Item #${i + 1}: Rate must be > 0.`, variant: "destructive" }); return false; }
        }
        return true;
    };
    
    const handleSetDefaultTemplate = async () => { /* ... */ };

    const handleCreateInvoice = async () => {
        if (!validateForm() || !seller) return;
        setIsSaving(true);
        const payload = {
            template: selectedTemplate,
            invoice: { title: formState.client_gstin ? "Tax Invoice" : "Retail Invoice", number: formState.invoice_no, date: formState.invoice_date, due_date: formState.due_date },
            company: { name: seller.name || "", address: seller.address || "", state: seller.state || "", gstin: seller.gstin || "", contact: seller.contact || "", email: seller.email || "", logo_url: seller.logo_url|| "", sign_url: seller.sign_url,stamp: seller.stamp },
            buyer: { name: formState.client_name, address: formState.client_address, state: formState.client_state_name, gstin: formState.client_gstin, phone_no: formState.client_phone, email: formState.client_email, signature_path: "" },
            items: formState.products.map(p => ({ name: p.name, hsn: p.hsn, unit: p.unit, quantity: parseFloat(p.quantity as string) || 0, rate: parseFloat(p.rate as string) || 0, gst_rate: parseFloat(p.gst_rate as string) || 0 })),
            bank: { name: seller.bank_name || "", account: seller.account_no || "", branch_ifsc: seller.ifsc_code || "" },
            terms_and_conditions: formState.terms_and_conditions.split('\n').filter(line => line.trim() !== ""),
            auto_send_email: autoSendEmail, set_payment_reminder: setPaymentReminder, generate_copies: generateCopies,
        };
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/create`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` }, body: JSON.stringify(payload),
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
                                {/* RESPONSIVE FIX: This grid now stacks on small screens */}
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
                                {/* RESPONSIVE FIX: This grid now stacks on small screens */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="client_phone">Phone No.</Label><Input id="client_phone" type="tel" value={formState.client_phone} onChange={(e) => handleInputChange('client_phone', e.target.value)} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="client_email">Email</Label><Input id="client_email" type="email" value={formState.client_email} onChange={(e) => handleInputChange('client_email', e.target.value)} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="client_state_name">State</Label><Select value={formState.client_state_name} onValueChange={(v) => handleInputChange('client_state_name', v)} required><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{indianStates.map((s) => (<SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                            </div>
                        </FormSectionCard>

                        <FormSectionCard title="Products / Services" icon={<FileText className="h-5 w-5"/>}>
                            {/* --- RESPONSIVE FIX: The desktop table is wrapped to allow scrolling if needed --- */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            {/* RESPONSIVE FIX: min-w classes added to prevent squishing */}
                                            <th className="p-2 min-w-[200px] w-[35%] text-left">Item Name</th>
                                            <th className="p-2 min-w-[100px] w-[15%] text-left">HSN</th>
                                            <th className="p-2 w-[10%] text-left">Qty</th>
                                            <th className="p-2 w-[10%] text-left">Unit</th>
                                            <th className="p-2 min-w-[120px] w-[15%] text-left">Rate</th>
                                            <th className="p-2 w-[10%] text-left">GST %</th>
                                            <th className="p-2 w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formState.products.map((p, i) => (
                                            <tr key={i}>
                                                <td className="p-1 relative" ref={el => productSuggestionRefs.current[i] = el as HTMLTableCellElement}>{/* ... */}</td>
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
                            {/* --- RESPONSIVE FIX: The mobile view is already a good pattern --- */}
                            <div className="block md:hidden space-y-4">
                                {formState.products.map((p, i) => (
                                            <tr key={i}>
                                                <td className="p-1 relative" ref={el => productSuggestionRefs.current[i] = el as HTMLTableCellElement}>{/* ... */}</td>
                                                <td className="p-1"><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} /></td>
                                                <td className="p-1"><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} /></td>
                                                <td className="p-1"><Input value={p.unit} onChange={(e) => handleProductChange(i, "unit", e.target.value)} /></td>
                                                <td className="p-1"><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} /></td>
                                                <td className="p-1"><Input type="number" value={p.gst_rate} onChange={(e) => handleProductChange(i, "gst_rate", e.target.value)} /></td>
                                                <td className="p-1 text-center"><Button variant="ghost" size="icon" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button></td>
                                            </tr>
                                ))}
                            </div>
                            <Button onClick={addProductRow} className="mt-4" variant="outline"><PlusCircle size={16} className="mr-2" />Add Item</Button>
                        </FormSectionCard>
                        
                        <FormSectionCard title="Terms & Conditions" icon={<FileText className="h-5 w-5"/>}><Textarea value={formState.terms_and_conditions} onChange={(e) => handleInputChange('terms_and_conditions', e.target.value)} rows={5} /></FormSectionCard>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <FormSectionCard title="Invoice Meta" icon={<FileText className="h-5 w-5"/>}>
                            <div className="space-y-4">
                                <div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={formState.invoice_no} onChange={(e) => handleInputChange('invoice_no', e.target.value)} /></div>
                                {/* RESPONSIVE FIX: Grid now stacks on small screens */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={formState.invoice_date} onChange={(e) => handleInputChange('invoice_date', e.target.value)} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" type="date" value={formState.due_date} onChange={(e) => handleInputChange('due_date', e.target.value)} /></div>
                                </div>
                            </div>
                        </FormSectionCard>
                        
                        {/* ... Other sidebar cards ... */}
                         <FormSectionCard title="Seller Details" icon={<Building className="h-5 w-5"/>}>{seller ? <div className="space-y-2 text-sm text-muted-foreground"><p className="font-semibold text-primary">{seller.name}</p><p>{seller.address}</p>{seller.gstin && <p>GST: {seller.gstin}</p>}{seller.contact && <p className="flex items-center gap-2"><Phone size={14} /> {seller.contact}</p>}{seller.email && <p className="flex items-center gap-2"><Mail size={14} /> {seller.email}</p>}</div> : <Skeleton className="h-20 w-full" />}</FormSectionCard>
                         <FormSectionCard title="Bank Details" icon={<Banknote className="h-5 w-5"/>}>{seller ? <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> {seller.bank_name}</p><p><span className="font-semibold text-primary">A/C No:</span> {seller.account_no}</p><p><span className="font-semibold text-primary">IFSC:</span> {seller.ifsc_code}</p></div> : <Skeleton className="h-12 w-full" />}</FormSectionCard>
                         <FormSectionCard title="Automation & Copies" icon={<Settings className="h-5 w-5"/>}><div className="space-y-4"><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="auto-send" className="flex items-center gap-2 cursor-pointer"><Send size={16}/>Auto Send Invoice</Label><Switch id="auto-send" checked={autoSendEmail} onCheckedChange={setAutoSendEmail} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="payment-reminder" className="flex items-center gap-2 cursor-pointer"><Bell size={16}/>Set Payment Reminder</Label><Switch id="payment-reminder" checked={setPaymentReminder} onCheckedChange={setSetPaymentReminder} /></div><div className="flex items-center justify-between p-2 rounded-md border"><Label htmlFor="generate-copies" className="flex items-center gap-2 cursor-pointer"><Copy size={16}/>Generate Duplicate/Triplicate</Label><Switch id="generate-copies" checked={generateCopies} onCheckedChange={setGenerateCopies} /></div></div></FormSectionCard>
                    </div>
                </div>
            </div>
            {/* RESPONSIVE FIX: Sticky footer is centered on mobile and buttons take up more width */}
            <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t">
                <div className="container mx-auto flex items-center justify-center sm:justify-end h-20 px-4 md:px-6 gap-2">
                    <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)} className="w-1/2 sm:w-auto">
                        <Palette className="mr-2 h-4 w-4" /> Template
                    </Button>
                    <Button onClick={handleCreateInvoice} disabled={isSaving || isLoading} size="lg" className="w-1/2 sm:w-auto">
                        {isSaving ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />Create Invoice</>}
                    </Button>
                </div>
            </div>
            <TemplateDialog 
                isOpen={isTemplateDialogOpen} 
                onClose={() => setIsTemplateDialogOpen(false)} 
                currentTemplate={selectedTemplate} 
                onSelectTemplate={setSelectedTemplate}
                onSetDefault={handleSetDefaultTemplate}
                isSavingDefault={isSavingDefault}
            />
        </DashboardLayout>
    );
}