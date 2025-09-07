
// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import Image from 'next/image';
// import Link from 'next/link';

// // --- UI Components ---
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Card, CardContent, CardTitle } from "@/components/ui/card";
// import SvgLoader from "./ui/loader";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// // --- Icons ---
// import { Building, Landmark, Image as ImageIcon, UploadCloud, Mail, Info, ExternalLink } from "lucide-react";

// // --- Libs & Hooks ---
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext"; // Ensure this path is correct
// import { useToast } from "@/hooks/use-toast";

// // --- Type Definitions ---
// interface SellerFormData {
//     companyName: string;
//     address: string;
//     gstin: string;
//     contact: string;
//     email: string;
//     logo: File | null;
//     signature: File | null;
//     stamp: File | null;
//     bankName: string;
//     accountNo: string;
//     ifscCode: string;
//     senderEmail: string;
//     senderPassword: string; // Only used to send to backend, not stored in state
// }

// interface Previews {
//     logo: string;
//     signature: string;
//     stamp: string;
// }

// /**
//  * Helper function to upload an asset to Supabase Storage and clean up the old file.
//  */
// const uploadAsset = async (
//     file: File | null,
//     existingUrl: string | null,
//     storagePath: string,
//     userId: string
// ): Promise<string | null> => {
//     if (!file) return existingUrl;

//     if (existingUrl) {
//         try {
//             const oldFilePath = existingUrl.split('/company-assets/')[1]?.split('?')[0];
//             if (oldFilePath) {
//                 await supabase.storage.from('company-assets').remove([oldFilePath]);
//             }
//         } catch (cleanupError) {
//             console.warn(`Failed to delete old asset:`, cleanupError);
//         }
//     }

//     const newFilePath = `${userId}/${storagePath}/${Date.now()}_${file.name}`;
//     const { error: uploadError } = await supabase.storage.from('company-assets').upload(newFilePath, file);

//     if (uploadError) {
//         throw new Error(`Failed to upload ${storagePath}: ${uploadError.message}`);
//     }

//     const { data } = supabase.storage.from('company-assets').getPublicUrl(newFilePath);
//     return data.publicUrl;
// };


// export default function CompanyInfoForm() {
//     const { userId, sellerDetails, setSellerDetails } = useUserId();
//     const router = useRouter();
//     const { toast } = useToast();

//     const [loading, setLoading] = useState(true);
//     const [isUpdate, setIsUpdate] = useState(false);
//     const [activeSection, setActiveSection] = useState('company');
    
//     const [formData, setFormData] = useState<SellerFormData>({
//         companyName: "", address: "", gstin: "", contact: "", email: "",
//         logo: null, signature: null, stamp: null, bankName: "",
//         accountNo: "", ifscCode: "", senderEmail: "", senderPassword: ""
//     });

//     const [previews, setPreviews] = useState<Previews>({ logo: "", signature: "", stamp: "" });

//     useEffect(() => {
//         if (sellerDetails) {
//             setIsUpdate(true);
//             setFormData(prev => ({
//                 ...prev,
//                 companyName: sellerDetails.name || "",
//                 address: sellerDetails.address || "",
//                 gstin: sellerDetails.gstin || "",
//                 contact: sellerDetails.contact || "",
//                 email: sellerDetails.email || "",
//                 bankName: sellerDetails.bank_name || "",
//                 accountNo: sellerDetails.account_no || "",
//                 ifscCode: sellerDetails.ifsc_code || "",
//                 senderEmail: sellerDetails.sender_email || ""
//             }));
//             setPreviews({
//                 logo: sellerDetails.logo_url || "",
//                 signature: sellerDetails.sign || "",
//                 stamp: sellerDetails.stamp || "",
//             });
//         } else {
//              setIsUpdate(false);
//         }
//         setLoading(false);
//     }, [sellerDetails]);

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
//     };

//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const { name, files } = e.target as { name: keyof SellerFormData, files: FileList | null };
//         if (files && files[0]) {
//             setFormData(prev => ({ ...prev, [name]: files[0] }));
//             setPreviews(prev => ({ ...prev, [name as keyof Previews]: URL.createObjectURL(files[0]) }));
//         }
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (!userId) {
//             toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
//             return;
//         }
//         setLoading(true);

//         try {
//             const [logoUrl, signatureUrl, stampUrl] = await Promise.all([
//                 uploadAsset(formData.logo, previews.logo, 'logos', userId),
//                 uploadAsset(formData.signature, previews.signature, 'signatures', userId),
//                 uploadAsset(formData.stamp, previews.stamp, 'stamps', userId)
//             ]);

//             const profilePayload = {
//                 name: formData.companyName, address: formData.address, gst_no: formData.gstin,
//                 contact: formData.contact, email: formData.email, bank_name: formData.bankName,
//                 account_no: formData.accountNo, ifsc_code: formData.ifscCode,
//                 logo: logoUrl, sign: signatureUrl, stamp: stampUrl,
//                 sender_email: formData.senderEmail,
//                 sender_password: formData.senderPassword || undefined,
//             };

//             const session = (await supabase.auth.getSession()).data.session;
//             const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profile/update-seller-profile`, {
//                 method: 'POST',
//                 headers: { 
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${session?.access_token}`
//                 },
//                 body: JSON.stringify(profilePayload)
//             });

//             const savedData = await response.json();
//             if (!response.ok) throw new Error(savedData.detail || "Failed to save profile.");
            
//             if (savedData && setSellerDetails) setSellerDetails(savedData);

//             toast({ title: "Success", description: `Company profile saved successfully.` });
//             router.push("/billing/create");

//         } catch (err: any) {
//             toast({ title: "Submission Error", description: err.message, variant: "destructive" });
//         } finally {
//             setLoading(false);
//         }
//     };
    
//     const sections = [
//         { id: 'company', label: 'Company Details', icon: Building },
//         { id: 'bank', label: 'Bank Information', icon: Landmark },
//         { id: 'email', label: 'Email Settings', icon: Mail },
//         { id: 'branding', label: 'Branding Assets', icon: ImageIcon },
//     ];
    
//     const FileInputCard = ({ id, label, previewSrc }: { id: keyof SellerFormData, label: string, previewSrc: string }) => (
//         <div className="space-y-2">
//             <Label htmlFor={id as string}>{label}</Label>
//             <div className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50">
//                 {!previewSrc && <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />}
//                 <p className={`text-sm text-slate-500 ${previewSrc ? 'hidden' : ''}`}>
//                     <span className="font-semibold">Click to upload</span>
//                 </p>
//                 <Input id={id as string} name={id as string} type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
//                 {previewSrc && (
//                     <Image src={previewSrc} alt={`${label} preview`} layout="fill" objectFit="contain" className="absolute inset-0 w-full h-full p-2 rounded-lg" />
//                 )}
//             </div>
//         </div>
//     );

//     if (loading && !isUpdate) {
//         return <div className="flex justify-center items-center h-screen"><SvgLoader /></div>;
//     }

//     return (
//         <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
//              <header className="mb-8">
//                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Company Profile</h1>
//                  <p className="text-muted-foreground mt-1">Manage your company's information for invoicing and billing.</p>
//              </header>

//              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
//                  <aside className="lg:col-span-1">
//                      <nav className="space-y-1 sticky top-24">
//                          {sections.map(section => (
//                              <Button
//                                  key={section.id}
//                                  variant={activeSection === section.id ? 'secondary' : 'ghost'}
//                                  className="w-full justify-start text-md py-6"
//                                  onClick={() => setActiveSection(section.id)}
//                              >
//                                  <section.icon className="mr-3 h-5 w-5" />
//                                  {section.label}
//                              </Button>
//                          ))}
//                      </nav>
//                  </aside>

//                  <div className="lg:col-span-3">
//                      <form onSubmit={handleSubmit}>
//                          <Card className="shadow-lg rounded-xl">
//                              <CardContent className="p-6 sm:p-8 space-y-8">
//                                  {activeSection === 'company' && (
//                                      <section className="space-y-6 animate-fade-in">
//                                          <CardTitle>Company Details</CardTitle>
//                                          <div className="space-y-2"><Label htmlFor="companyName">Company Name *</Label><Input id="companyName" name="companyName" required value={formData.companyName} onChange={handleChange} placeholder="Your registered company name" /></div>
//                                          <div className="space-y-2"><Label htmlFor="address">Address</Label><Textarea id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Your company's full address" /></div>
//                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                              <div className="space-y-2"><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" name="gstin" value={formData.gstin} onChange={handleChange} placeholder="e.g., 29ABCDE1234F1Z5" /></div>
//                                              <div className="space-y-2"><Label htmlFor="contact">Contact Number</Label><Input id="contact" name="contact" value={formData.contact} onChange={handleChange} placeholder="e.g., 9876543210" /></div>
//                                          </div>
//                                          <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="e.g., contact@yourcompany.com" /></div>
//                                      </section>
//                                  )}
//                                  {activeSection === 'bank' && (
//                                      <section className="space-y-6 animate-fade-in">
//                                          <CardTitle>Bank Information</CardTitle>
//                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                               <div className="space-y-2"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g., State Bank of India" /></div>
//                                               <div className="space-y-2"><Label htmlFor="accountNo">Account Number</Label><Input id="accountNo" name="accountNo" value={formData.accountNo} onChange={handleChange} placeholder="Your bank account number" /></div>
//                                           </div>
//                                           <div className="space-y-2"><Label htmlFor="ifscCode">IFSC Code</Label><Input id="ifscCode" name="ifscCode" value={formData.ifscCode} onChange={handleChange} placeholder="e.g., SBIN0001234" /></div>
//                                      </section>
//                                  )}
//                                   {activeSection === 'email' && (
//                                      <section className="space-y-6 animate-fade-in">
//                                          <CardTitle>Email Sending Settings</CardTitle>
//                                          <Alert variant="default" className="bg-blue-50 border-blue-200">
//                                              <Info className="h-4 w-4 text-blue-600" />
//                                              <AlertTitle className="text-blue-800">Why is this needed?</AlertTitle>
//                                              <AlertDescription className="text-blue-700">
//                                                  To send invoices from your own Gmail account, Google requires a special, 16-character "App Password". Your regular password will not work and is never stored by us.
//                                              </AlertDescription>
//                                          </Alert>
//                                          <div className="p-6 border rounded-lg space-y-4 bg-slate-50">
//                                              <h3 className="font-semibold text-slate-800">How to Generate Your App Password:</h3>
//                                              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
//                                                  <li>Click the button below to go to the Google App Passwords page.</li>
//                                                  <li>In "Select app", choose <strong>Other (Custom name)</strong>.</li>
//                                                  <li>Name it "Vyapari AI" and click <strong>GENERATE</strong>.</li>
//                                                  <li>Copy the 16-character password from the yellow box and paste it below.</li>
//                                              </ol>
//                                              <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">
//                                                  <Button type="button" variant="outline" className="w-full">
//                                                      <ExternalLink className="mr-2 h-4 w-4" />
//                                                      Go to Google App Passwords Page
//                                                  </Button>
//                                              </Link>
//                                          </div>
//                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="senderEmail">Your Sender Email (Gmail)</Label>
//                                                 <Input id="senderEmail" name="senderEmail" type="email" value={formData.senderEmail} onChange={handleChange} placeholder="e.g., your.company@gmail.com" />
//                                             </div>
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="senderPassword">Your Google App Password</Label>
//                                                 <Input id="senderPassword" name="senderPassword" type="password" value={formData.senderPassword} onChange={handleChange} placeholder="Paste the 16-character password" />
//                                             </div>
//                                          </div>
//                                      </section>
//                                  )}
//                                  {activeSection === 'branding' && (
//                                      <section className="space-y-6 animate-fade-in">
//                                          <CardTitle>Branding Assets</CardTitle>
//                                          <p className="text-sm text-muted-foreground">Upload your company's logo, signature, and stamp for invoices.</p>
//                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
//                                              <FileInputCard id="logo" label="Company Logo" previewSrc={previews.logo} />
//                                              <FileInputCard id="signature" label="Signature" previewSrc={previews.signature} />
//                                              <FileInputCard id="stamp" label="Company Stamp" previewSrc={previews.stamp} />
//                                          </div>
//                                      </section>
//                                  )}
//                              </CardContent>
//                              <div className="p-6 sm:p-8 border-t flex justify-end">
//                                  <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
//                                      {loading ? <SvgLoader /> : (isUpdate ? "Update Profile" : "Save Profile")}
//                                  </Button>
//                              </div>
//                          </Card>
//                      </form>
//                  </div>
//              </div>
//          </div>
//     );
// }


// src/components/forms/CompanyInfoForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import Link from 'next/link';

// --- UI Components ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import SvgLoader from "./ui/loader"; // Assuming you have this component
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- Icons ---
import { Building, Landmark, Image as ImageIcon, UploadCloud, Mail, Info, ExternalLink, XCircle, Save } from "lucide-react";

// --- Libs & Hooks ---
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext"; // Assuming this hook provides sellerDetails type
import { useToast } from "@/hooks/use-toast";

// --- TYPE DEFINITIONS ---
interface FormState {
    name: string; address: string; state: string; gstin: string;
    contact: string; email: string;
    bank_name: string; account_no: string; ifsc_code: string;
    sender_email: string; senderPassword: string;
}

interface FileState {
    logo: File | null;
    signature: File | null;
    stamp: File | null;
}

interface PreviewState {
    logo: string | null;
    signature: string | null;
    stamp: string | null;
}

// --- HELPER: ASSET UPLOAD FUNCTION ---
const uploadAsset = async (
    file: File | null,
    existingUrl: string | null,
    storagePath: string,
    userId: string
): Promise<string | null> => {
    // If no new file is selected, return the existing URL.
    if (!file) {
        return existingUrl;
    }

    // If there was an old file, try to delete it from storage to prevent orphans.
    if (existingUrl) {
        try {
            // Extract the file path from the full URL.
            // e.g., 'public/company-assets/user_id/logos/timestamp_name.png'
            const oldFilePath = new URL(existingUrl).pathname.split('/company-assets/')[1];
            if (oldFilePath) {
                await supabase.storage.from('company-assets').remove([oldFilePath]);
            }
        } catch (e) {
            console.warn(`Could not parse or delete old asset. It may not exist.`, e);
        }
    }

    // Create a new, unique file path.
    const newFilePath = `${userId}/${storagePath}/${Date.now()}_${file.name}`;

    // Upload the new file.
    const { error: uploadError } = await supabase.storage.from('company-assets').upload(newFilePath, file);
    if (uploadError) {
        throw new Error(`Failed to upload ${storagePath}: ${uploadError.message}`);
    }

    // Return the public URL for the newly uploaded file.
    const { data } = supabase.storage.from('company-assets').getPublicUrl(newFilePath);
    return data.publicUrl;
};


// --- Reusable File Input Component ---
const FileInputCard = ({ id, label, previewSrc, onFileChange, onCancel }: {
    id: keyof FileState,
    label: string,
    previewSrc: string | null,
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onCancel: () => void,
}) => (
    <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/50">
            <Input id={id} name={id} type="file" accept="image/png, image/jpeg, image/webp" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            {previewSrc ? (
                <>
                    <Image src={previewSrc} alt={`${label} preview`} layout="fill" objectFit="contain" className="absolute inset-0 w-full h-full p-2 rounded-lg" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 z-20" onClick={onCancel}>
                        <XCircle size={16} />
                    </Button>
                </>
            ) : (
                <div className="text-center text-muted-foreground">
                    <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                    <span className="font-semibold">Click to upload</span>
                </div>
            )}
        </div>
    </div>
);


export default function CompanyInfoForm() {
    const { userId, sellerDetails, setSellerDetails } = useUserId();
    const router = useRouter();
    const { toast } = useToast();

    const [isSaving, setIsSaving] = useState(false);
    const [isUpdate, setIsUpdate] = useState(false);
    const [activeSection, setActiveSection] = useState('company');
    
    const [formState, setFormState] = useState<FormState>({
        name: "", address: "", state: "", gstin: "", contact: "", email: "",
        bank_name: "", account_no: "", ifsc_code: "", sender_email: "", senderPassword: ""
    });
    const [files, setFiles] = useState<FileState>({ logo: null, signature: null, stamp: null });
    const [previews, setPreviews] = useState<PreviewState>({ logo: null, signature: null, stamp: null });

    useEffect(() => {
        if (sellerDetails) {
            setIsUpdate(true);
            setFormState(prev => ({
                ...prev,
                name: sellerDetails.name || "",
                address: sellerDetails.address || "",
                state: sellerDetails.state || "",
                gstin: sellerDetails.gstin || "",
                contact: sellerDetails.contact || "",
                email: sellerDetails.email || "",
                bank_name: sellerDetails.bank_name || "",
                account_no: sellerDetails.account_no || "",
                ifsc_code: sellerDetails.ifsc_code || "",
                sender_email: sellerDetails.sender_email || ""
            }));
            setPreviews({
                logo: sellerDetails.logo_url || null,
                signature: sellerDetails.sign_url || null,
                stamp: sellerDetails.stamp || null,
            });
        }
    }, [sellerDetails]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: selectedFiles } = e.target as { name: keyof FileState, files: FileList | null };
        if (selectedFiles && selectedFiles[0]) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
            setPreviews(prev => ({ ...prev, [name]: URL.createObjectURL(selectedFiles[0]) }));
        }
    };

    const handleCancelFile = (name: keyof FileState) => {
        setFiles(prev => ({ ...prev, [name]: null }));

        let detailKey: keyof typeof sellerDetails;
        if (name === 'logo') detailKey = 'logo_url';
        else if (name === 'signature') detailKey = 'sign_url';
        else detailKey = 'stamp'; // Corrected key

        setPreviews(prev => ({
            ...prev,
            [name]: sellerDetails?.[detailKey] as string | null || null
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            toast({ title: "Authentication Error", description: "You must be logged in to save.", variant: "destructive" });
            return;
        }
        setIsSaving(true);

        try {
            const [logoUrl, signatureUrl, stampUrl] = await Promise.all([
                uploadAsset(files.logo, sellerDetails?.logo_url || null, 'logos', userId),
                uploadAsset(files.signature, sellerDetails?.sign_url || null, 'signatures', userId),
                uploadAsset(files.stamp, sellerDetails?.stamp || null, 'stamps', userId)
            ]);
            
            const profilePayload = {
                name: formState.name,
                address: formState.address,
                state: formState.state,
                gstin: formState.gstin,
                contact: formState.contact,
                email: formState.email,
                bank_name: formState.bank_name,
                account_no: formState.account_no,
                ifsc_code: formState.ifsc_code,
                logo_url: logoUrl,
                sign_url: signatureUrl,
                stamp: stampUrl,
                sender_email: formState.sender_email,
                ...(formState.senderPassword && { encrypted_sender_password: formState.senderPassword })
            };

            const { data, error } = await supabase
                .from('sellers_record')
                .upsert({ ...profilePayload, user_id: userId }, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            
            if (data && setSellerDetails) {
                setSellerDetails(data);
            }
            
            toast({ title: "Success!", description: `Company profile has been ${isUpdate ? 'updated' : 'saved'}.` });
            router.push("/");

        } catch (err: any) {
            toast({ title: "Submission Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const sections = [
        { id: 'company', label: 'Company Details', icon: Building },
        { id: 'bank', label: 'Bank Information', icon: Landmark },
        { id: 'email', label: 'Email Settings', icon: Mail },
        { id: 'branding', label: 'Branding Assets', icon: ImageIcon }
    ];
    
    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
                <p className="text-muted-foreground mt-1">Manage your information for invoicing and billing.</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <nav className="space-y-1 sticky top-24">
                        {sections.map(section => (
                            <Button
                                key={section.id}
                                variant={activeSection === section.id ? 'secondary' : 'ghost'}
                                className="w-full justify-start text-md py-6"
                                onClick={() => setActiveSection(section.id)}
                            >
                                <section.icon className="mr-3 h-5 w-5" />
                                {section.label}
                            </Button>
                        ))}
                    </nav>
                </aside>
                <div className="lg:col-span-3">
                    <form onSubmit={handleSubmit}>
                        <Card className="shadow-lg rounded-xl">
                            <CardContent className="p-6 sm:p-8 space-y-8">
                                {activeSection === 'company' && (
                                    <section className="space-y-6">
                                        <CardTitle>Company Details</CardTitle>
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Company Name *</Label>
                                            <Input id="name" name="name" required value={formState.name} onChange={handleChange} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="address">Address</Label>
                                            <Textarea id="address" name="address" value={formState.address} onChange={handleChange} />
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="gstin">GSTIN</Label>
                                                <Input id="gstin" name="gstin" value={formState.gstin} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="contact">Contact Number</Label>
                                                <Input id="contact" name="contact" value={formState.contact} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" name="email" type="email" value={formState.email} onChange={handleChange} />
                                        </div>
                                    </section>
                                )}
                                {activeSection === 'bank' && (
                                    <section className="space-y-6">
                                        <CardTitle>Bank Information</CardTitle>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="bank_name">Bank Name</Label>
                                                <Input id="bank_name" name="bank_name" value={formState.bank_name} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="account_no">Account Number</Label>
                                                <Input id="account_no" name="account_no" value={formState.account_no} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ifsc_code">IFSC Code</Label>
                                            <Input id="ifsc_code" name="ifsc_code" value={formState.ifsc_code} onChange={handleChange} />
                                        </div>
                                    </section>
                                )}
                                {activeSection === 'email' && (
                                    <section className="space-y-6">
                                        <CardTitle>Email Sending Settings</CardTitle>
                                        <Alert variant="default" className="bg-blue-50 border-blue-200">
                                            <Info className="h-4 w-4 text-blue-600" />
                                            <AlertTitle className="text-blue-800">Why is this needed?</AlertTitle>
                                            <AlertDescription className="text-blue-700">To send invoices from your own Gmail account, Google requires a special, 16-character "App Password". Your regular password will not work and is never stored by us.</AlertDescription>
                                        </Alert>
                                        <div className="p-6 border rounded-lg space-y-4 bg-slate-50">
                                            <h3 className="font-semibold text-slate-800">How to Generate Your App Password:</h3>
                                            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                                                <li>Click the button below to go to the Google App Passwords page.</li>
                                                <li>In "Select app", choose <strong>Other (Custom name)</strong>.</li>
                                                <li>Name it "Vyapari AI" and click <strong>GENERATE</strong>.</li>
                                                <li>Copy the 16-character password from the yellow box and paste it below.</li>
                                            </ol>
                                            <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">
                                                <Button type="button" variant="outline" className="w-full">
                                                    <ExternalLink className="mr-2 h-4 w-4" />Go to Google App Passwords Page
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="sender_email">Your Sender Email (Gmail)</Label>
                                                <Input id="sender_email" name="sender_email" type="email" value={formState.sender_email} onChange={handleChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="senderPassword">Your Google App Password</Label>
                                                <Input id="senderPassword" name="senderPassword" type="password" value={formState.senderPassword} onChange={handleChange} />
                                            </div>
                                        </div>
                                    </section>
                                )}
                                {activeSection === 'branding' && (
                                    <section className="space-y-6">
                                        <CardTitle>Branding Assets</CardTitle>
                                        <p className="text-sm text-muted-foreground">Upload your company's logo, signature, and stamp for invoices.</p>
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            <FileInputCard id="logo" label="Company Logo" previewSrc={previews.logo} onFileChange={handleFileChange} onCancel={() => handleCancelFile('logo')} />
                                            <FileInputCard id="signature" label="Signature" previewSrc={previews.signature} onFileChange={handleFileChange} onCancel={() => handleCancelFile('signature')} />
                                            <FileInputCard id="stamp" label="Company Stamp" previewSrc={previews.stamp} onFileChange={handleFileChange} onCancel={() => handleCancelFile('stamp')} />
                                        </div>
                                    </section>
                                )}
                            </CardContent>
                            <div className="p-6 sm:p-8 border-t flex justify-end">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <SvgLoader /> : <><Save className="mr-2 h-4 w-4" />{isUpdate ? "Update Profile" : "Save Profile"}</>}
                                </Button>
                            </div>
                        </Card>
                    </form>
                </div>
            </div>
        </div>
    );
}