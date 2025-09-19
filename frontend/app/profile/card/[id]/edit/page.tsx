"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Save, Loader2, ArrowLeft, CheckCircle, AlertTriangle, PlusCircle, XCircle, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- TYPESCRIPT INTERFACES ---
interface CustomField {
  label: string;
  value: string;
}

interface SellerRecord {
  user_id: string;
  name?: string;
  description?: string;
  address?: string;
  contact?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  gstin?: string;
  pan_no?: string;
  bank_name?: string;
  ifsc_code?: string;
  account_no?: string;
  custom_fields?: CustomField[];
  // New branding fields
  card_color_start?: string;
  card_color_end?: string;
  text_color?: string;
  [key: string]: any;
}

// --- REUSABLE INPUT COMPONENT ---
const InputField = ({ label, name, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
    <input type={type} id={name} name={name} value={value || ""} onChange={onChange} placeholder={placeholder} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
  </div>
);

// --- LIVE CARD PREVIEW COMPONENT ---
const CardPreview = ({ data }: { data: Partial<SellerRecord> }) => {
    const cardStyles = {
        background: `linear-gradient(135deg, ${data.card_color_start || '#1C1C1E'}, ${data.card_color_end || '#333333'})`,
        color: data.text_color || '#FFFFFF',
    };
    const textColorStyle = { color: data.text_color || '#FFFFFF' };
    const mutedColorStyle = { color: data.text_color ? `${data.text_color}B3` : '#A0A0A0' }; // Add transparency
    const accentColorStyle = { color: data.text_color ? `${data.text_color}E6` : '#C0C0C0' };
    const titleField = data.custom_fields?.find(f => f.label.toLowerCase() === 'title');

    return (
        <div style={cardStyles} className="w-[450px] h-[260px] rounded-2xl shadow-2xl p-6 flex flex-col justify-between overflow-hidden relative font-sans">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-4">
                    {data.logo_url && <img src={data.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg bg-white/10 p-1" />}
                    <div>
                        <h2 className="text-2xl font-bold" style={textColorStyle}>{data.name || "Business Name"}</h2>
                        {titleField?.value && (
                           <p className="font-medium" style={accentColorStyle}>
                               {titleField.value}
                           </p>
                        )}
                    </div>
                </div>
                {data.description && <p className="text-sm mt-2 max-w-xs" style={mutedColorStyle}>{data.description}</p>}
            </div>
            <div className="relative z-10 space-y-1 text-sm">
                 {data.contact && <p style={textColorStyle}>{data.contact}</p>}
                 {data.email && <p style={textColorStyle}>{data.email}</p>}
            </div>
        </div>
    );
};


// --- MAIN EDIT PAGE COMPONENT ---
export default function EditSellerCardPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [formData, setFormData] = useState<Partial<SellerRecord>>({ custom_fields: [], card_color_start: '#1C1C1E', card_color_end: '#333333', text_color: '#FFFFFF' });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSellerData() {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("sellers_record").select("*").eq("user_id", id).single<SellerRecord>();
        if (error) throw error;
        setFormData({ 
            ...data, 
            custom_fields: data?.custom_fields || [],
            card_color_start: data?.card_color_start || '#1C1C1E',
            card_color_end: data?.card_color_end || '#333333',
            text_color: data?.text_color || '#FFFFFF',
        });
      } catch (e: any) {
        setError("Could not load your business profile for editing.");
      } finally {
        setLoading(false);
      }
    }
    loadSellerData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCustomFieldChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const updatedFields = [...(formData.custom_fields || [])];
    updatedFields[index] = { ...updatedFields[index], [name]: value };
    setFormData(prev => ({ ...prev, custom_fields: updatedFields }));
  };

  const handleAddField = () => {
    setFormData(prev => ({ ...prev, custom_fields: [...(prev.custom_fields || []), { label: '', value: '' }] }));
  };

  const handleRemoveField = (indexToRemove: number) => {
    setFormData(prev => ({ ...prev, custom_fields: prev.custom_fields?.filter((_, index) => index !== indexToRemove) }));
  };

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { id: sellerId, user_id, ...updatableData } = formData;
      const payload = {
        ...updatableData,
        custom_fields: updatableData.custom_fields?.filter(field => field.label.trim() !== '' && field.value.trim() !== '') || []
      };
      const { error: updateError } = await supabase.from("sellers_record").update(payload).eq("user_id", id);
      if (updateError) throw updateError;
      setSuccess("Your card has been updated successfully!");
      setTimeout(() => router.push(`/card/${id}`), 1500);
    } catch (e: any) {
      setError(`Save failed: ${e.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  }, [id, formData, router]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <form onSubmit={handleSave}>
        <header className="bg-white shadow-sm sticky top-0 z-20">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <div className="flex items-center">
                    <button type="button" onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-200 mr-4"><ArrowLeft className="w-6 h-6"/></button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Edit Business Card</h1>
                        <p className="text-sm text-gray-500">Changes are previewed live on the right.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {error && <div className="flex items-center text-sm text-red-600"><AlertTriangle size={18} className="mr-2"/>{error}</div>}
                    {success && <div className="flex items-center text-sm text-green-600"><CheckCircle size={18} className="mr-2"/>{success}</div>}
                    <button type="submit" disabled={saving} className="inline-flex items-center justify-center px-4 py-2 text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                        {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </header>
        
        <div className="max-w-7xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 sm:px-6 lg:px-8">
            {/* Column 1: Form Inputs */}
            <div className="bg-white p-6 rounded-xl shadow-lg border space-y-8">
                 {/* Branding Section */}
                <section>
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Palette/> Branding & Colors</h2>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700">Gradient Start</label>
                            <input type="color" name="card_color_start" value={formData.card_color_start} onChange={handleInputChange} className="w-full h-10 p-1 border rounded-md"/>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700">Gradient End</label>
                            <input type="color" name="card_color_end" value={formData.card_color_end} onChange={handleInputChange} className="w-full h-10 p-1 border rounded-md"/>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700">Text Color</label>
                            <input type="color" name="text_color" value={formData.text_color} onChange={handleInputChange} className="w-full h-10 p-1 border rounded-md"/>
                        </div>
                    </div>
                </section>
                
                {/* Business Info Section */}
                <section className="space-y-4 border-t pt-6">
                    <h2 className="text-xl font-semibold text-gray-800">Business Information</h2>
                    <InputField label="Business Name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Your Company Name" />
                    <InputField label="Logo Image URL" name="logo_url" value={formData.logo_url} onChange={handleInputChange} placeholder="https://.../logo.png" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea name="description" rows={3} value={formData.description || ''} onChange={handleInputChange} placeholder="A short description of your business..." className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                    </div>
                </section>
                
                 {/* Contact Info Section */}
                <section className="space-y-4 border-t pt-6">
                    <h2 className="text-xl font-semibold text-gray-800">Contact & Links</h2>
                    <InputField label="Contact Number" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="+1 (555) 123-4567" />
                    <InputField label="Email Address" name="email" value={formData.email} onChange={handleInputChange} placeholder="contact@yourcompany.com" />
                    <InputField label="Website URL" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://yourcompany.com" />
                    <InputField label="Address" name="address" value={formData.address} onChange={handleInputChange} placeholder="123 Main St, Anytown, USA" />
                </section>

                {/* Custom Fields Section */}
                <section className="border-t pt-6">
                     <h2 className="text-xl font-semibold text-gray-800">Custom Fields</h2>
                     <p className="text-sm text-gray-500 mb-4">Add your title or any other info.</p>
                     <div className="space-y-4">
                        {formData.custom_fields?.map((field, index) => (
                            <div key={index} className="flex items-end gap-2">
                                <input name="label" value={field.label} onChange={(e) => handleCustomFieldChange(index, e)} placeholder="Field Name (e.g., Title)" className="flex-1 mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                                <input name="value" value={field.value} onChange={(e) => handleCustomFieldChange(index, e)} placeholder="Value (e.g., CEO)" className="flex-1 mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                                <button type="button" onClick={() => handleRemoveField(index)} className="p-2 text-red-500 hover:text-red-700"><XCircle size={20}/></button>
                            </div>
                        ))}
                     </div>
                     <button type="button" onClick={handleAddField} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"><PlusCircle size={18}/> Add Custom Field</button>
                </section>
            </div>

            {/* Column 2: Live Preview */}
            <div className="flex flex-col items-center">
                 <h2 className="text-xl font-semibold text-gray-800 mb-4">Live Preview</h2>
                 <div className="sticky top-24">
                    <CardPreview data={formData} />
                 </div>
            </div>
        </div>
      </form>
    </div>
  );
}

