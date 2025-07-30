// "use client"

// import { useEffect, useState } from "react"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Button } from "@/components/ui/button"
// import { Textarea } from "@/components/ui/textarea"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { useUserId } from "@/hooks/context/UserContext"
// import { supabase } from "@/lib/supabase"
// import { useRouter } from "next/navigation"
// import { useToast } from "@/components/ui/use-toast"

// export default function CompanyInfoForm() {
//   const { userId } = useUserId()
//   const router = useRouter()
//   const { toast } = useToast()

//   const [loading, setLoading] = useState(false)
//   const [isUpdate, setIsUpdate] = useState(false)

//   const [formData, setFormData] = useState({
//     companyName: "",
//     address: "",
//     gstin: "",
//     contact: "",
//     email: "",
//     logo: null as File | null,
//     signature: null as File | null,
//     stamp: null as File | null,
//     bankName: "",
//     accountNo: "",
//     ifscCode: "",
//   })

//   const [previews, setPreviews] = useState({
//     logo: "",
//     signature: "",
//     stamp: "",
//   })

//   useEffect(() => {
//     if (!userId) return

//     const fetchSellerData = async () => {
//       try {
//         const { data, error } = await supabase
//           .from("sellers_record")
//           .select("*")
//           .eq("user_id", userId)
//           .single()

//         if (error || !data) return

//         setIsUpdate(true)
//         setFormData(prev => ({
//           ...prev,
//           companyName: data.name || "",
//           address: data.address || "",
//           gstin: data.gst_no || "",
//           contact: data.contact || "",
//           email: data.email || "",
//           bankName: data.bank_name || "",
//           accountNo: data.account_no || "",
//           ifscCode: data.ifsc_code || "",
//         }))

//         const parseAndSetPreview = (field: "logo" | "signature" | "stamp", value: string) => {
//           try {
//             const parsed = JSON.parse(value)
//             if (parsed?.url) {
//               setPreviews(prev => ({ ...prev, [field]: parsed.url }))
//             }
//           } catch {}
//         }

//         if (data.logo) parseAndSetPreview("logo", data.logo)
//         if (data.signature) parseAndSetPreview("signature", data.signature)
//         if (data.stamp) parseAndSetPreview("stamp", data.stamp)

//       } catch (err) {
//         console.error("Failed to fetch seller info:", err)
//       }
//     }

//     fetchSellerData()
//   }, [userId])

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     const { name, value } = e.target
//     setFormData(prev => ({ ...prev, [name]: value }))
//   }

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, files } = e.target
//     if (files && files[0]) {
//       const file = files[0]
//       setFormData(prev => ({ ...prev, [name]: file }))
//       const reader = new FileReader()
//       reader.onloadend = () => {
//         setPreviews(prev => ({ ...prev, [name]: reader.result as string }))
//       }
//       reader.readAsDataURL(file)
//     }
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()

//     if (!userId) {
//       toast({ title: "Error", description: "User not logged in", variant: "destructive" })
//       return
//     }

//     setLoading(true)

//     const form = new FormData()
//     form.append("token", userId)
//     form.append("company_name", formData.companyName)
//     form.append("address", formData.address)
//     form.append("gstin", formData.gstin)
//     form.append("contact", formData.contact)
//     form.append("email", formData.email)
//     form.append("bank_name", formData.bankName)
//     form.append("account_no", formData.accountNo)
//     form.append("ifsc_code", formData.ifscCode)
//     if (formData.logo) form.append("logo", formData.logo)
//     if (formData.signature) form.append("signature", formData.signature)
//     if (formData.stamp) form.append("stamp", formData.stamp)

//     try {
//       const { data: { session } } = await supabase.auth.getSession()
//       const token = session?.access_token

//       const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/seller${isUpdate ? "/update" : ""}`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         body: form,
//       })

//       const result = await res.json()

//       if (res.ok) {
//         toast({ title: "Success", description: isUpdate ? "Updated successfully" : "Saved successfully" })
//         router.push("/billing/create")
//       } else {
//         toast({
//           title: "Failed",
//           description: result.detail || "Try again later.",
//           variant: "destructive"
//         })
//       }

//     } catch (err) {
//       console.error("Error:", err)
//       toast({
//         title: "Server error",
//         description: "Something went wrong while saving.",
//         variant: "destructive"
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="max-w-4xl mx-auto p-6">
//       <Card className="shadow-xl rounded-2xl border bg-background">
//         <CardHeader>
//           <CardTitle className="text-2xl font-bold">Seller Details</CardTitle>
//           <p className="text-sm text-muted-foreground">Enter your company's information</p>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-6">
//             <div className="space-y-2">
//               <Label htmlFor="companyName">Company Name *</Label>
//               <Input
//                 id="companyName"
//                 name="companyName"
//                 required
//                 value={formData.companyName}
//                 onChange={handleChange}
//                 placeholder="e.g., HINDUJA PHARMA"
//               />
//             </div>

//             <div className="space-y-2">
//               <Label htmlFor="address">Address</Label>
//               <Textarea
//                 id="address"
//                 name="address"
//                 value={formData.address}
//                 onChange={handleChange}
//                 placeholder="Company address..."
//               />
//             </div>

//             <div className="grid md:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="gstin">GSTIN</Label>
//                 <Input
//                   id="gstin"
//                   name="gstin"
//                   value={formData.gstin}
//                   onChange={handleChange}
//                   placeholder="e.g., 28AHNPC6120F1ZJ"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="contact">Contact Numbers</Label>
//                 <Input
//                   id="contact"
//                   name="contact"
//                   value={formData.contact}
//                   onChange={handleChange}
//                   placeholder="e.g., 7806164180"
//                 />
//               </div>
//               <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 name="email"
//                 type="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 placeholder="e.g., company@email.com"
//               />
//             </div>
//             </div>

            

//             <div className="grid md:grid-cols-3 gap-4">
//               {["logo", "signature", "stamp"].map(type => (
//                 <div className="space-y-2" key={type}>
//                   <Label htmlFor={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Label>
//                   <Input
//                     id={type}
//                     name={type}
//                     type="file"
//                     accept="image/*"
//                     onChange={handleFileChange}
//                   />
//                   {previews[type as keyof typeof previews] && (
//                     <img
//                       src={previews[type as keyof typeof previews]}
//                       alt={`${type} preview`}
//                       className="mt-2 w-24 h-24 object-contain border rounded-md"
//                     />
//                   )}
//                 </div>
//               ))}
//             </div>

//             <div className="grid md:grid-cols-3 gap-4">
//               <div className="space-y-2 ">
//               <Label htmlFor="bankName">Bank Name</Label>
//               <Input
//                 id="bankName"
//                 name="bankName"
//                 value={formData.bankName}
//                 onChange={handleChange}
//                 placeholder="e.g., HDFC Bank"
//               />
//               </div>
//               <div className="space-y-2 ">
//               <Label htmlFor="accountNo">A/c Number</Label>
//               <Input
//                 id="accountNo"
//                 name="accountNo"
//                 value={formData.accountNo}
//                 onChange={handleChange}
//                 placeholder="e.g., 1234567890"
//               />
//               </div>
//               <div className="space-y-2 ">
//               <Label htmlFor="ifscCode">Branch & IFSC Code</Label>
//               <Input
//                 id="ifscCode"
//                 name="ifscCode"
//                 value={formData.ifscCode}
//                 onChange={handleChange}
//                 placeholder="e.g., HDFC0001234"
//               />
//               </div>
//             </div>

//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading ? (isUpdate ? "Updating..." : "Saving...") : (isUpdate ? "Update Info" : "Save Info")}
//             </Button>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }


"use client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import { ChevronLeft, ChevronRight, CheckCircle, Search, PlusCircle, Trash2, FileInvoice, Building, Landmark, Image as ImageIcon, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import SvgLoader from "./ui/loader";
import { indianStates } from "@/lib/indianStates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";


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
    client_name: string;
    client_address: string;
    client_gstin: string;
    client_phone: string;
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
}

// Enhanced Company Info Form Component
export default function CompanyInfoForm() {
    const { userId } = useUserId();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [isUpdate, setIsUpdate] = useState(false);
    const [activeSection, setActiveSection] = useState('company');

    const [formData, setFormData] = useState({
        companyName: "",
        address: "",
        gstin: "",
        contact: "",
        email: "",
        logo: null as File | null,
        signature: null as File | null,
        stamp: null as File | null,
        bankName: "",
        accountNo: "",
        ifscCode: "",
    });

    const [previews, setPreviews] = useState({
        logo: "",
        signature: "",
        stamp: "",
    });

    useEffect(() => {
        if (!userId) return;

        const fetchSellerData = async () => {
            try {
                const { data, error } = await supabase
                    .from("sellers_record")
                    .select("*")
                    .eq("user_id", userId)
                    .single();

                if (error || !data) {
                    console.log("No existing seller data found. Ready for new entry.");
                    return;
                }

                setIsUpdate(true);
                setFormData(prev => ({
                    ...prev,
                    companyName: data.name || "",
                    address: data.address || "",
                    gstin: data.gst_no || "",
                    contact: data.contact || "",
                    email: data.email || "",
                    bankName: data.bank_name || "",
                    accountNo: data.account_no || "",
                    ifscCode: data.ifsc_code || "",
                }));
                
                // Safely set previews from stored URLs
                if (data.logo) setPreviews(prev => ({ ...prev, logo: data.logo }));
                if (data.sign) setPreviews(prev => ({ ...prev, signature: data.sign }));
                if (data.stamp) setPreviews(prev => ({ ...prev, stamp: data.stamp }));

            } catch (err) {
                console.error("Failed to fetch seller info:", err);
            }
        };

        fetchSellerData();
    }, [userId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const file = files[0];
            setFormData(prev => ({ ...prev, [name]: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [name]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
            return;
        }
        setLoading(true);

        // This function handles the complex logic of uploading files and getting URLs
        const uploadFileAndGetData = async (file: File | null, existingUrl: string, storagePath: string) => {
            if (!file) return existingUrl; // Return existing URL if no new file
            
            const filePath = `${userId}/${storagePath}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('company-assets').upload(filePath, file);

            if (uploadError) {
                throw new Error(`Failed to upload ${storagePath}: ${uploadError.message}`);
            }

            const { data } = supabase.storage.from('company-assets').getPublicUrl(filePath);
            return data.publicUrl;
        };

        try {
            const logoUrl = await uploadFileAndGetData(formData.logo, previews.logo, 'logos');
            const signatureUrl = await uploadFileAndGetData(formData.signature, previews.signature, 'signatures');
            const stampUrl = await uploadFileAndGetData(formData.stamp, previews.stamp, 'stamps');

            const sellerRecord = {
                user_id: userId,
                name: formData.companyName,
                address: formData.address,
                gst_no: formData.gstin,
                contact: formData.contact,
                email: formData.email,
                bank_name: formData.bankName,
                account_no: formData.accountNo,
                ifsc_code: formData.ifscCode,
                logo: logoUrl,
                sign: signatureUrl,
                stamp: stampUrl,
            };
            
            const { error } = await supabase.from('sellers_record').upsert(sellerRecord, { onConflict: 'user_id' });

            if (error) throw error;

            toast({ title: "Success", description: `Company details ${isUpdate ? 'updated' : 'saved'} successfully.` });
            router.push("/billing/create");

        } catch (err: any) {
            console.error("Error submitting form:", err);
            toast({ title: "Submission Error", description: err.message || "Something went wrong.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const sections = [
        { id: 'company', label: 'Company Details', icon: Building },
        { id: 'bank', label: 'Bank Information', icon: Landmark },
        { id: 'branding', label: 'Branding Assets', icon: ImageIcon },
    ];
    
    const FileInputCard = ({ id, label, previewSrc }: { id: keyof typeof formData, label: string, previewSrc: string }) => (
        <div className="space-y-2">
            <Label htmlFor={id as string}>{label}</Label>
            <div className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, or WEBP</p>
                <Input id={id as string} name={id as string} type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {previewSrc && (
                    <Image src={previewSrc} alt={`${label} preview`} layout="fill" objectFit="contain" className="absolute inset-0 w-full h-full p-2 rounded-lg bg-white" />
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
             <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Company Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your company's information for invoicing.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <aside className="lg:col-span-1">
                    <nav className="space-y-1">
                        {sections.map(section => (
                            <Button
                                key={section.id}
                                variant={activeSection === section.id ? 'default' : 'ghost'}
                                className="w-full justify-start"
                                onClick={() => setActiveSection(section.id)}
                            >
                                <section.icon className="mr-3 h-5 w-5" />
                                {section.label}
                            </Button>
                        ))}
                    </nav>
                </aside>

                {/* Form Content */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleSubmit}>
                        <Card className="shadow-lg rounded-xl">
                            <CardContent className="p-6 sm:p-8 space-y-8">
                                {activeSection === 'company' && (
                                    <section className="space-y-6 animate-fade-in">
                                        <CardTitle>Company Details</CardTitle>
                                        <div className="space-y-2">
                                            <Label htmlFor="companyName">Company Name *</Label>
                                            <Input id="companyName" name="companyName" required value={formData.companyName} onChange={handleChange} placeholder="e.g., HINDUJA PHARMA" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Address</Label>
                                            <Textarea id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Company address..." />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="gstin">GSTIN</Label>
                                                <Input id="gstin" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="e.g., 28AHNPC6120F1ZJ" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="contact">Contact Number</Label>
                                                <Input id="contact" name="contact" value={formData.contact} onChange={handleChange} placeholder="e.g., 9876543210" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="e.g., contact@company.com" />
                                        </div>
                                    </section>
                                )}

                                {activeSection === 'bank' && (
                                    <section className="space-y-6 animate-fade-in">
                                        <CardTitle>Bank Information</CardTitle>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="bankName">Bank Name</Label>
                                                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g., HDFC Bank" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="accountNo">Account Number</Label>
                                                <Input id="accountNo" name="accountNo" value={formData.accountNo} onChange={handleChange} placeholder="e.g., 1234567890" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ifscCode">IFSC Code</Label>
                                            <Input id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} placeholder="e.g., HDFC0001234" />
                                        </div>
                                    </section>
                                )}

                                {activeSection === 'branding' && (
                                    <section className="space-y-6 animate-fade-in">
                                        <CardTitle>Branding Assets</CardTitle>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <FileInputCard id="logo" label="Company Logo" previewSrc={previews.logo} />
                                            <FileInputCard id="signature" label="Signature" previewSrc={previews.signature} />
                                            <FileInputCard id="stamp" label="Company Stamp" previewSrc={previews.stamp} />
                                        </div>
                                    </section>
                                )}
                            </CardContent>
                            <div className="p-6 sm:p-8 border-t flex justify-end">
                                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                                    {loading ? <SvgLoader /> : (isUpdate ? "Update Information" : "Save Information")}
                                </Button>
                            </div>
                        </Card>
                    </form>
                </div>
            </div>
        </div>
    );
}
a
