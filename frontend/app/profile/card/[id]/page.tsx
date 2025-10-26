"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from "qrcode.react";
import { Download, Edit, Link as LinkIcon, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/dashboard-layout";

// TYPESCRIPT INTERFACE
interface SellerRecord {
  user_id: string;
  name?: string;
  title?: string;
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
}

// MAIN COMPONENT
export default function SellerCard() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // STATE
  const [seller, setSeller] = useState<SellerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Refs for the interactive 3D card (if needed for other purposes)
  const cardContainerRef = useRef<HTMLDivElement | null>(null); 
  
  // Refs for the flat, hidden elements used ONLY for PDF generation
  const cardFrontRef = useRef<HTMLDivElement | null>(null);
  const cardBackRef = useRef<HTMLDivElement | null>(null);


  // DATA FETCHING
  useEffect(() => {
    async function loadSeller() {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("sellers_record").select("*").eq("user_id", id).single<SellerRecord>();
        if (error) throw error;
        setSeller(data);
      } catch (e) {
        console.error("Failed to fetch seller:", e);
        setSeller(null);
      } finally {
        setLoading(false);
      }
    }
    loadSeller();
  }, [id]);

  // ACTIONS
  const handleDownloadPDF = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) return;

    // Capture the front side
    const frontCanvas = await html2canvas(cardFrontRef.current, { scale: 3, backgroundColor: '#1C1C1E' });
    const frontImgData = frontCanvas.toDataURL("image/png");

    // Capture the back side
    const backCanvas = await html2canvas(cardBackRef.current, { scale: 3, backgroundColor: '#1C1C1E' });
    const backImgData = backCanvas.toDataURL("image/png");

    // Initialize jsPDF
    const pdf = new jsPDF({ 
      orientation: "landscape", 
      unit: "px", 
      format: [frontCanvas.width, frontCanvas.height] // Use card dimensions for pages
    });

    // Add front side to PDF
    pdf.addImage(frontImgData, "PNG", 0, 0, frontCanvas.width, frontCanvas.height);
    
    // Add a new page and then the back side
    pdf.addPage([backCanvas.width, backCanvas.height], "landscape"); // Add page with correct dimensions
    pdf.addImage(backImgData, "PNG", 0, 0, backCanvas.width, backCanvas.height);
    
    pdf.save(`${seller?.name || "vyapari-card"}.pdf`);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/card/${seller?.user_id}`;
    navigator.clipboard.writeText(url);
    alert("Shareable link copied to clipboard!");
  };

  const downloadProfileQR = () => {
    const canvas = document.getElementById('profile-qr-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${seller?.name}-Profile-QR.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // RENDER STATES
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!seller) {
    router.push('/company_details');
    return null;
  }
  
  const profileUrl = `${window.location.origin}/card/${seller.user_id}`;
  const cardBackQrUrl = seller.website || profileUrl;

  // Reusable card content for front and back
  const CardFrontContent = () => (
    <div className="relative inset-0 rounded-2xl bg-[#1C1C1E] text-white shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col justify-between overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 sm:gap-5">
          {seller.logo_url && (
            <img src={seller.logo_url} alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain rounded-lg bg-white/10 p-1" />
          )}
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{seller.name}</h2>
            {seller.title && <p className="text-indigo-400 font-medium text-xs sm:text-sm">{seller.title}</p>}
          </div>
        </div>
        {seller.description && <p className="text-xs sm:text-sm text-gray-300 mt-3 max-w-xs">{seller.description}</p>}
      </div>
      <div className="relative z-10 space-y-1 text-xs sm:text-sm">
        {seller.contact && <p className="flex items-center gap-3"><Phone size={14} className="text-gray-400 flex-shrink-0"/><span>{seller.contact}</span></p>}
        {seller.email && <p className="flex items-center gap-3"><Mail size={14} className="text-gray-400 flex-shrink-0"/><span>{seller.email}</span></p>}
        {seller.address && <p className="flex items-center gap-3"><MapPin size={14} className="text-gray-400 flex-shrink-0"/><span>{seller.address}</span></p>}
      </div>
      <a href="https://vyapari.vercel.app/" target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-4 sm:bottom-4 sm:right-6 text-xs text-gray-500 font-semibold hover:text-white z-20">
          Created with <strong>Vyapari AI</strong>
      </a>
    </div>
  );

  const CardBackContent = () => (
    <div className="relative inset-0 rounded-2xl bg-[#1C1C1E] text-white shadow-2xl p-4 sm:p-6 md:p-8 flex items-center justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.04%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div className="relative z-10 w-1/2 space-y-1 text-[10px] sm:text-xs font-mono">
        <h3 className="font-sans text-sm sm:text-lg font-bold text-indigo-400 mb-2">Official Information</h3>
        {seller.gstin && <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center"><span className="text-gray-400">GSTIN:</span><span className="break-all">{seller.gstin}</span></div>}
        {seller.pan_no && <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center"><span className="text-gray-400">PAN:</span><span>{seller.pan_no}</span></div>}
        {(seller.gstin || seller.pan_no) && <div className="border-t border-gray-700 my-1 sm:my-2"></div>}
        {seller.bank_name && <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center"><span className="text-gray-400">Bank:</span><span>{seller.bank_name}</span></div>}
        {seller.account_no && <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center"><span className="text-gray-400">A/c:</span><span>{seller.account_no}</span></div>}
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="p-1 sm:p-2 bg-white rounded-lg">
          <QRCodeCanvas value={cardBackQrUrl} size={110} fgColor={"#1A1A1A"}/>
        </div>
        <span className="mt-2 text-xs text-gray-400 text-center">{seller.website ? "Visit us" : "View Digital Card"}</span>
      </div>
    </div>
  );


  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center p-4 gap-8 lg:flex-row lg:items-start font-sans">
        
        {/* Column 1: The Interactive Card & Actions */}
        <div className="flex flex-col items-center w-full max-w-lg">
          {/* 3D Flip Card Container */}
          <div 
            ref={cardContainerRef} // Ref added here for the interactive card container
            className="w-full aspect-[1.66] perspective-1200 cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <motion.div
              className="relative w-full h-full [transform-style:preserve-3d]"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* FRONT */}
              <div className="absolute inset-0 backface-hidden">
                <CardFrontContent />
              </div>
              
              {/* BACK */}
              <div className="absolute inset-0 [transform:rotateY(180deg)] backface-hidden">
                <CardBackContent />
              </div>
            </motion.div>
          </div>
          
          {/* Action Buttons Below Card */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600 shadow border font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base"><LinkIcon size={16} /> Copy Link</button>
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600 shadow border font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base"><Download size={16} /> Download PDF</button>
            <button onClick={() => router.push(`${seller.user_id}/edit`)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow transition-colors text-sm sm:text-base"><Edit size={16} /> Edit Card</button>
          </div>
        </div>

        {/* Column 2: The Separate Share Panel */}
        <div className="w-full sm:w-72 flex-shrink-0 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border dark:border-gray-700 flex flex-col items-center">
          <h3 className="text-lg font-bold text-center text-gray-800 dark:text-gray-200">Share Your Profile</h3>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">Share this QR to link others directly to your digital card.</p>
          <div className="p-2 bg-white rounded-lg mt-4">
            <QRCodeCanvas id="profile-qr-canvas" value={profileUrl} size={180} />
          </div>
          <button onClick={downloadProfileQR} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors">
            <Download size={16} /> Download QR
          </button>
        </div>

        {/* --- HIDDEN ELEMENTS FOR PDF CAPTURE --- */}
        {/* These divs will always render flat and are used solely by html2canvas */}
        <div ref={cardFrontRef} className="absolute left-[-9999px] top-[-9999px] w-[500px] aspect-[1.66]">
          <CardFrontContent />
        </div>
        <div ref={cardBackRef} className="absolute left-[-9999px] top-[-9999px] w-[500px] aspect-[1.66]">
          <CardBackContent />
        </div>
        {/* --- END HIDDEN ELEMENTS --- */}

        <style jsx global>{`
          .perspective-1200 { perspective: 1200px; }
          .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}