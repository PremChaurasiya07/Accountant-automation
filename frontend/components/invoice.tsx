
"use client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { useToast } from "../hooks/use-toast";
import Image from 'next/image';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SvgLoader from "./ui/loader";
import { CheckCircle, ChevronLeft, ChevronRight, FileText, User, Building, Banknote, Trash2, PlusCircle, Save } from 'lucide-react';
import { indianStates } from "@/lib/indianStates";

import temp1 from '../public/template/temp1.png';
import temp2 from '../public/template/temp2.png';

// --- TYPE DEFINITIONS ---
interface Product {
    srNo: number;
    description: string;
    hsn: string;
    quantity: number | '';
    rate: number | '';
    amount: number;
}

interface Seller {
    id: string;
    name?: string;
    address?: string;
    gst_no?: string;
    contact?: string;
    email?: string;
    logo?: string;
    sign?: string;
    stamp?: string;
    pan_no?: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
}

interface Client {
    id: number;
    name: string;
    address: string;
    email: string | null;
    gst_no: string | null;
    phone_no: string | null;
}

interface FullInvoiceData {
    invoice_date: string;
    invoice_no: string;
    client_name: string;
    client_address: string;
    client_gstin: string;
    client_phone: string;
    client_state_name?: string;
    client_state_code?: string;
    client_email?: string;
    products: Product[];
    gst_percentage: number;
    sub_total: number;
    cgst_amount: number;
    sgst_amount: number;
    total_gst_amount: number;
    total_amount: number;
    amount_in_words: string;
    challan_date: string;
    challan_no: string;
    purchase_date: string;
    purchase_no: string;
    vehicle_no: string;
    seller_id: string | null;
    template_id: string | null;
    seller_name?: string;
    seller_address?: string;
    seller_email?: string;
    seller_gst_no?: string;
    seller_pan_no?: string;
    seller_logourl?: string;
    seller_sign?: string;
    seller_stamp?: string;
    seller_contact?: string;
}

// --- UI SUB-COMPONENTS ---

const PageHeader = () => (
    <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-muted-foreground">Fill in the details below to generate a new invoice.</p>
    </div>
);

const FormSectionCard = ({ title, description, icon, children, className = "" }: { title: string, description?: string, icon?: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <Card className={className}>
        <CardHeader>
            <div className="flex items-center gap-3">
                {icon}
                <div>
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </div>
            </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

const LoadingSkeleton = () => (
    <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-1/3" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    </div>
);


// --- MAIN INVOICE COMPONENT ---
export default function Invoice({ invoice_data }: any) {
    const { userId, userSession } = useUserId();
    const { toast } = useToast();

    const today = new Date().toISOString().split('T')[0];

    const [seller, setSeller] = useState<Seller | null>(null);
    const [creating, setCreating] = useState<boolean | null>(false);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>("temp1");

    const [existingClients, setExistingClients] = useState<Client[]>([]);
    const [isClientListVisible, setIsClientListVisible] = useState(false);
    const clientDetailsRef = useRef<HTMLDivElement>(null);

    const [currentSlide, setCurrentSlide] = useState(0);
    const templatesRef = useRef<HTMLDivElement>(null);

    const [fullInvoiceData, setFullInvoiceData] = useState<FullInvoiceData>({
        invoice_date: today,
        invoice_no: "",
        client_name: "",
        client_address: "",
        client_gstin: "",
        client_phone: "",
        client_state_name: "",
        client_state_code: "",
        client_email: "",
        products: [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
        gst_percentage: 18,
        sub_total: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        total_gst_amount: 0,
        total_amount: 0,
        amount_in_words: "",
        challan_date: "",
        challan_no: "",
        purchase_date: "",
        purchase_no: "",
        vehicle_no: "",
        seller_id: null,
        template_id: "temp1",
    });

    function numberToWords(num: number): string {
        if (num === 0) return "Zero Rupees Only.";
        const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        const scales = ["", "Thousand", "Lakh", "Crore"];

        function convertTwoDigits(n: number): string {
            if (n < 10) return units[n];
            if (n < 20) return teens[n - 10];
            return tens[Math.floor(n / 10)] + (n % 10 ? " " + units[n % 10] : "");
        }

        function convertThreeDigits(n: number): string {
            let result = "";
            if (n > 99) {
                result += units[Math.floor(n / 100)] + " Hundred ";
                n %= 100;
            }
            if (n > 0) {
                result += convertTwoDigits(n) + " ";
            }
            return result.trim();
        }

        let result = "";
        let intPart = Math.floor(num);
        const decimalPart = Math.round((num - intPart) * 100);
        let parts = [];
        parts.push(intPart % 1000);
        intPart = Math.floor(intPart / 1000);
        parts.push(intPart % 100);
        intPart = Math.floor(intPart / 100);
        parts.push(intPart % 100);
        intPart = Math.floor(intPart / 100);
        parts.push(intPart);

        for (let i = parts.length - 1; i >= 0; i--) {
            if (parts[i]) {
                const label = scales[i];
                const word = convertThreeDigits(parts[i]);
                result += word + (label ? " " + label + " " : " ");
            }
        }
        result = result.trim();
        if (decimalPart > 0) {
            const paise = convertTwoDigits(decimalPart);
            result += " Rupees And " + paise + " Paise Only.";
        } else {
            result += " Rupees Only.";
        }
        return result.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/\s+/g, ' ');
    }

    useEffect(() => {
        if (!userId) return;
        const fetchClients = async () => {
            const { data: invoices, error: invoicesError } = await supabase.from("invoices_record").select("buyer_id").eq("user_id", userId);
            if (invoicesError) {
                console.error("Error fetching invoice records:", invoicesError);
                return;
            }
            if (invoices && invoices.length > 0) {
                const buyerIds = [...new Set(invoices.map(inv => inv.buyer_id).filter(id => id !== null))];
                if (buyerIds.length === 0) {
                    setExistingClients([]);
                    return;
                }
                const { data: buyers, error: buyersError } = await supabase.from("buyers_record").select("*").in("id", buyerIds);
                if (buyersError) {
                    console.error("Error fetching clients:", buyersError);
                } else if (buyers) {
                    const uniqueClients = buyers.filter((client, index, self) => index === self.findIndex((c) => c.name === client.name));
                    setExistingClients(uniqueClients);
                }
            } else {
                setExistingClients([]);
            }
        };
        fetchClients();
    }, [userId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (clientDetailsRef.current && !clientDetailsRef.current.contains(event.target as Node)) {
                setIsClientListVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [clientDetailsRef]);

    useEffect(() => {
        if (!userId) return;
        const checkCompanyInfo = async () => {
            const { data, error } = await supabase.from("sellers_record").select("*, id").eq("user_id", userId).single();
            if (error || !data) {
                console.error("Error fetching company details:", error);
                toast({ title: "Seller Error", description: `Seller info not found! Please fill out the company details.`, variant: "destructive" });
                window.location.href = "/company_details";
            } else {
                setSeller(data);
                setFullInvoiceData(prev => ({ ...prev, seller_id: data.id }));
            }
        };
        checkCompanyInfo();
    }, [userId, toast]);

    useEffect(() => {
        const calculatedSubTotal = fullInvoiceData.products.reduce((sum, product) => sum + product.amount, 0);
        const calculatedCgst = (calculatedSubTotal * (fullInvoiceData.gst_percentage / 2)) / 100;
        const calculatedSgst = (calculatedSubTotal * (fullInvoiceData.gst_percentage / 2)) / 100;
        const calculatedTotalGst = calculatedCgst + calculatedSgst;
        const calculatedTotalAmount = calculatedSubTotal + calculatedTotalGst;
        setFullInvoiceData(prev => ({
            ...prev,
            sub_total: calculatedSubTotal,
            cgst_amount: calculatedCgst,
            sgst_amount: calculatedSgst,
            total_gst_amount: calculatedTotalGst,
            total_amount: calculatedTotalAmount,
        }));
    }, [fullInvoiceData.products, fullInvoiceData.gst_percentage]);

    const totalAmountInWords = useMemo(() => numberToWords(fullInvoiceData.total_amount), [fullInvoiceData.total_amount]);

    const filteredClients = useMemo(() => {
        const searchInput = fullInvoiceData.client_name.toLowerCase();
        if (!searchInput) return existingClients;
        const filtered = existingClients.filter(client => client.name.toLowerCase().includes(searchInput));
        return filtered.sort((a, b) => {
            const a_starts = a.name.toLowerCase().startsWith(searchInput);
            const b_starts = b.name.toLowerCase().startsWith(searchInput);
            if (a_starts && !b_starts) return -1;
            if (!a_starts && b_starts) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [fullInvoiceData.client_name, existingClients]);

    useEffect(() => {
        if (fullInvoiceData.client_name.trim() && filteredClients.length === 0) {
            setIsClientListVisible(false);
        }
    }, [filteredClients, fullInvoiceData.client_name]);

    const handleProductChange = (index: number, field: keyof Product, value: any) => {
        const newProducts = [...fullInvoiceData.products];
        let parsedValue: string | number = value;
        if (field === 'quantity' || field === 'rate') {
            parsedValue = value === '' ? '' : parseFloat(value) || 0;
        }
        if (field === 'description' || field === 'hsn') {
            newProducts[index][field] = parsedValue as string;
        } else if (field === 'quantity' || field === 'rate') {
            newProducts[index][field] = parsedValue as number | '';
        }
        if (field === 'quantity' || field === 'rate') {
            const currentQuantity = typeof newProducts[index].quantity === 'number' ? newProducts[index].quantity : 0;
            const currentRate = typeof newProducts[index].rate === 'number' ? newProducts[index].rate : 0;
            newProducts[index].amount = currentQuantity * currentRate;
        }
        setFullInvoiceData(prev => ({ ...prev, products: newProducts }));
    };

    const addProductRow = () => {
        setFullInvoiceData((prev) => ({
            ...prev,
            products: [...prev.products, { srNo: prev.products.length + 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
        }));
    };

    const incremented_invoice_no = async () => {
        try {
            const { data: sellerData, error: sellerError } = await supabase.from("sellers_record").select("id").eq("user_id", userId).maybeSingle();
            if (sellerError || !sellerData) { console.error("Seller not found"); return; }
            const sellerId = sellerData.id;
            const { data: invoiceData, error: invoiceError } = await supabase.from("invoices_record").select("invoice_no").eq("seller_id", sellerId).order("invoice_date", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const fyStart = month >= 3 ? year : year - 1;
            const fyEnd = (fyStart + 1) % 100;
            const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
            if (invoiceError || !invoiceData) {
                setFullInvoiceData((prev) => ({ ...prev, invoice_no: `001/${currentFY}` }));
                return;
            }
            const lastInvoice = invoiceData.invoice_no;
            const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?$/);
            if (!match) {
                console.warn("Invalid invoice format, using default");
                setFullInvoiceData((prev) => ({ ...prev, invoice_no: `001/${currentFY}` }));
                return;
            }
            const numberPart = match[1];
            const fyInInvoice = match[2];
            let newNumber: string;
            let newFY = fyInInvoice || currentFY;
            if (fyInInvoice && fyInInvoice !== currentFY) {
                newNumber = "001";
                newFY = currentFY;
            } else {
                const incremented = (parseInt(numberPart) + 1).toString().padStart(numberPart.length, '0');
                newNumber = incremented;
            }
            const updatedInvoice = `${newNumber}/${newFY}`;
            setFullInvoiceData((prev) => ({ ...prev, invoice_no: updatedInvoice }));
        } catch (err) {
            console.error("Unexpected error fetching/incrementing invoice:", err);
            toast({ title: "Error", description: "Unable to generate invoice number.", variant: "destructive" });
        }
    };

    useEffect(() => {
        if (userId) incremented_invoice_no();
    }, [userId]);

    const deleteProductRow = (indexToDelete: number) => {
        setFullInvoiceData((prev) => {
            const updatedProducts = prev.products.filter((_, index) => index !== indexToDelete);
            return { ...prev, products: updatedProducts.map((product, index) => ({ ...product, srNo: index + 1 })) };
        });
    };

    const handleInvoiceDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFullInvoiceData((prev) => ({ ...prev, [id]: value }));
    };

    const handleClientDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFullInvoiceData(prevData => ({ ...prevData, [`client_${id}`]: value }));
        if (id === 'name') setIsClientListVisible(true);
    };

    const handleSelectClient = (client: Client) => {
        setFullInvoiceData(prev => ({
            ...prev,
            client_name: client.name,
            client_address: client.address,
            client_gstin: client.gst_no || "",
            client_phone: client.phone_no || "",
            client_email: client.email || "",
        }));
        setIsClientListVisible(false);
    };

    const handleStateSelectChange = (selectedValue: string) => {
        const selectedState = indianStates.find(state => state.name === selectedValue);
        setFullInvoiceData(prevData => ({ ...prevData, client_state_name: selectedValue, client_state_code: selectedState ? selectedState.code : undefined }));
    };

    useEffect(() => {
        if (fullInvoiceData.client_state_name && !fullInvoiceData.client_state_code) {
            const selectedState = indianStates.find(state => state.name === fullInvoiceData.client_state_name);
            if (selectedState) setFullInvoiceData(prevData => ({ ...prevData, client_state_code: selectedState.code }));
        }
    }, [fullInvoiceData.client_state_name]);

    const handleGstPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFullInvoiceData(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 0 }));
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
    };

    const templates = [
        { id: "temp1", name: "Modern Invoice", description: "A clean and modern invoice design.", image: temp1 },
        { id: "temp2", name: "Classic Invoice", description: "A traditional and formal invoice design.", image: temp2 },
        { id: "temp3", name: "Minimal Invoice", description: "A minimalist design with essential details.", image: null },
        { id: "temp4", name: "Elegant Pro", description: "An elegant and professional layout.", image: null },
    ];

    const templatesPerPage = () => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth;
            if (width >= 1280) return 4;
            if (width >= 1024) return 3;
            if (width >= 768) return 2;
            return 1;
        }
        return 1;
    };

    const totalPages = Math.ceil(templates.length / templatesPerPage());
    const handleNextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, totalPages - 1));
    const handlePrevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

    const handleCreateInvoice = async () => {
        if (!fullInvoiceData.client_name.trim() || !fullInvoiceData.client_address.trim() || !fullInvoiceData.client_state_name.trim()) {
            toast({ title: "Information Missing", description: "Client name, address, and state are required.", variant: "destructive" });
            return;
        }
        setCreating(true);
        if (!seller) {
            toast({ title: "Seller Information Missing", description: "Please complete your company details.", variant: "destructive" });
            setCreating(false);
            return;
        }

        const dataToSend = {
            ...fullInvoiceData,
            template_id: selectedTemplate,
            products_json: fullInvoiceData.products.map(p => ({ ...p })),
            amount_in_words: totalAmountInWords,
            seller_name: seller.name,
            seller_address: seller.address,
            seller_email: seller.email,
            seller_gst_no: seller.gst_no,
            seller_pan_no: seller.pan_no,
            seller_logourl: seller.logo,
            seller_sign: seller.sign,
            seller_stamp: seller.stamp,
            seller_contact: seller.contact,
            seller_Bank_name: seller.bank_name,
            seller_Account_no: seller.account_no,
            seller_IFSC_code: seller.ifsc_code,
        };

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/create`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
                body: JSON.stringify(dataToSend),
            });
            const response = await res.json();
            setCreating(false);
            if (res.ok) {
                toast({ title: "Invoice Created ✅", description: `Invoice has been created successfully.` });
                setFullInvoiceData({
                    invoice_date: today, invoice_no: "", client_name: "", client_address: "", client_gstin: "", client_phone: "", client_state_name: "", client_state_code: "", products: [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }], gst_percentage: 18, sub_total: 0, cgst_amount: 0, sgst_amount: 0, total_gst_amount: 0, total_amount: 0, challan_date: "", challan_no: "", purchase_date: "", purchase_no: "", vehicle_no: "", seller_id: fullInvoiceData.seller_id, template_id: "temp1", amount_in_words: ""
                });
                setSelectedTemplate("temp1");
                incremented_invoice_no();
                if (response.url) window.open(response.url, '_blank');
            } else {
                throw new Error(response.detail || "Failed to create invoice.");
            }
        } catch (e: any) {
            console.error("Error creating invoice", e);
            toast({ title: "Error ❌", description: e.message || "Failed to create invoice.", variant: "destructive" });
            setCreating(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 pb-24">
                <PageHeader />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <FormSectionCard title="Client Details" icon={<User className="h-5 w-5 text-muted-foreground" />} ref={clientDetailsRef}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 relative">
                                        <Label htmlFor="name">Client Name</Label>
                                        <Input id="name" value={fullInvoiceData.client_name} onChange={handleClientDetailChange} onFocus={() => setIsClientListVisible(true)} placeholder="Start typing to search or add new..." required autoComplete="off" />
                                        {isClientListVisible && filteredClients.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {filteredClients.map(client => (
                                                    <div key={client.id} className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer" onClick={() => handleSelectClient(client)}>
                                                        {client.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5"><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" value={fullInvoiceData.client_gstin} onChange={handleClientDetailChange} placeholder="Client's GST number" /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="address">Address</Label><Textarea id="address" value={fullInvoiceData.client_address} onChange={handleClientDetailChange} placeholder="Client's full address" required /></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" value={fullInvoiceData.client_phone} onChange={handleClientDetailChange} placeholder="Client's phone number" /></div>
                                    <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={fullInvoiceData.client_email} onChange={handleClientDetailChange} placeholder="Client's email address" /></div>
                                    <div className="space-y-1.5"><Label htmlFor="clientState">State</Label><Select value={fullInvoiceData.client_state_name} onValueChange={handleStateSelectChange} required><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger><SelectContent>{indianStates.map((s) => (<SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                                </div>
                            </div>
                        </FormSectionCard>

                        <FormSectionCard title="Products / Services" icon={<FileText className="h-5 w-5 text-muted-foreground" />}>
                            {/* Desktop Product Table */}
                            <div className="hidden md:block">
                                <table className="w-full text-sm">
                                    <colgroup>
                                        <col style={{ width: '5%' }} />
                                        <col style={{ width: '40%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '10%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '5%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="border-b">
                                            <th className="p-2 text-left font-semibold">Sr.</th>
                                            <th className="p-2 text-left font-semibold">Description</th>
                                            <th className="p-2 text-left font-semibold">HSN</th>
                                            <th className="p-2 text-left font-semibold">Qty</th>
                                            <th className="p-2 text-left font-semibold">Rate</th>
                                            <th className="p-2 text-right font-semibold">Amount</th>
                                            <th className="p-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fullInvoiceData.products.map((p, i) => (
                                            <tr key={i} className="border-b last:border-b-0">
                                                <td className="p-2 align-top">{p.srNo}</td>
                                                <td className="p-2"><Textarea value={p.description} onChange={(e) => handleProductChange(i, "description", e.target.value)} placeholder="Product description" rows={1} className="min-h-[40px]" /></td>
                                                <td className="p-2"><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} placeholder="HSN" /></td>
                                                <td className="p-2"><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} placeholder="0" min="0" required /></td>
                                                <td className="p-2"><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} placeholder="0.00" min="0" step="0.01" required /></td>
                                                <td className="p-2 text-right font-medium">₹{(p.amount || 0).toFixed(2)}</td>
                                                <td className="p-2 text-center"><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Product Cards */}
                            <div className="block md:hidden space-y-4">
                                {fullInvoiceData.products.map((p, i) => (
                                    <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                                        <p className="font-bold">Item #{p.srNo}</p>
                                        <div className="space-y-1.5"><Label>Description</Label><Textarea value={p.description} onChange={(e) => handleProductChange(i, "description", e.target.value)} placeholder="Product description" rows={2} /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5"><Label>HSN</Label><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} placeholder="HSN" /></div>
                                            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} placeholder="0" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5"><Label>Rate</Label><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} placeholder="0.00" /></div>
                                            <div className="space-y-1.5"><Label>Amount</Label><p className="font-medium h-10 flex items-center">₹{(p.amount || 0).toFixed(2)}</p></div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={addProductRow} className="mt-4" variant="outline"><PlusCircle size={16} className="mr-2" />Add Item</Button>
                        </FormSectionCard>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <FormSectionCard title="Invoice Meta" icon={<FileText className="h-5 w-5 text-muted-foreground" />}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={fullInvoiceData.invoice_date} onChange={handleInvoiceDetailChange} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={fullInvoiceData.invoice_no} onChange={handleInvoiceDetailChange} placeholder="e.g., 001/24-25" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="challan_date">Challan Date</Label><Input id="challan_date" type="date" value={fullInvoiceData.challan_date} onChange={handleInvoiceDetailChange} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="challan_no">Challan No.</Label><Input id="challan_no" value={fullInvoiceData.challan_no} onChange={handleInvoiceDetailChange} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="purchase_date">P.O. Date</Label><Input id="purchase_date" type="date" value={fullInvoiceData.purchase_date} onChange={handleInvoiceDetailChange} /></div>
                                    <div className="space-y-1.5"><Label htmlFor="purchase_no">P.O. No.</Label><Input id="purchase_no" value={fullInvoiceData.purchase_no} onChange={handleInvoiceDetailChange} /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="vehicle_no">Vehicle No.</Label><Input id="vehicle_no" value={fullInvoiceData.vehicle_no} onChange={handleInvoiceDetailChange} /></div>
                            </div>
                        </FormSectionCard>
                        <Card>
                            <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Sub Total</span><span className="font-medium">₹{fullInvoiceData.sub_total.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">CGST ({fullInvoiceData.gst_percentage / 2}%)</span><span className="font-medium">₹{fullInvoiceData.cgst_amount.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">SGST ({fullInvoiceData.gst_percentage / 2}%)</span><span className="font-medium">₹{fullInvoiceData.sgst_amount.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center font-semibold border-t pt-2"><span className="text-muted-foreground">Total GST</span><span>₹{fullInvoiceData.total_gst_amount.toFixed(2)}</span></div>
                                <div className="flex items-center text-sm"><Label htmlFor="gst_percentage" className="text-muted-foreground mr-2">GST Rate:</Label><Input id="gst_percentage" type="number" value={fullInvoiceData.gst_percentage} onChange={handleGstPercentageChange} className="w-24 h-8 text-right" min="0" step="0.1" /><span className="ml-1">%</span></div>
                                <div className="border-t pt-3 mt-3">
                                    <div className="flex justify-between text-xl font-bold"><span>Total Amount</span><span>₹{fullInvoiceData.total_amount.toFixed(2)}</span></div>
                                    {fullInvoiceData.total_amount > 0 && (<p className="text-xs text-muted-foreground mt-1">{totalAmountInWords}</p>)}
                                </div>
                            </CardContent>
                        </Card>
                        <FormSectionCard title="Seller Details" icon={<Building className="h-5 w-5 text-muted-foreground" />}>
                            {seller ? <div className="space-y-1 text-sm text-muted-foreground"><p className="font-semibold text-primary">{seller.name}</p><p>{seller.address}</p><p>GST: {seller.gst_no}</p></div> : <Skeleton className="h-16 w-full" />}
                        </FormSectionCard>
                        <FormSectionCard title="Bank Details" icon={<Banknote className="h-5 w-5 text-muted-foreground" />}>
                            {seller ? <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> {seller.bank_name}</p><p><span className="font-semibold text-primary">A/C No:</span> {seller.account_no}</p><p><span className="font-semibold text-primary">IFSC:</span> {seller.ifsc_code}</p></div> : <Skeleton className="h-12 w-full" />}
                        </FormSectionCard>
                    </div>
                </div>
            </div>
            <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t">
                <div className="container flex items-center justify-end h-16 px-4 md:px-6">
                    <Button onClick={handleCreateInvoice} disabled={!creating === false} size="lg">
                        {creating ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />Create Invoice</>}
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}
