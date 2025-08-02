

// "use client";

// import { DashboardLayout } from "@/components/dashboard-layout";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { MoreVertical } from "lucide-react";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import SvgLoader from "@/components/ui/loader";

// interface Invoice {
//   id: string;
//   date: string;
//   invoiceNumber: string;
//   pdf_url?: string;
//   name?: string;
// }

// export default function EditBilling() {
//   const { userId } = useUserId();
//   const router = useRouter();
//   const [invoicedata, setInvoicedata] = useState<Invoice[]>([]);
//   const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
//   const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
//   const [loading, setloading] = useState<boolean>(false);
//   const [getinvoice, setinvoice] = useState<boolean>(false);
//   const [filterText, setFilterText] = useState("");

//   useEffect(() => {
//     const fetchData = async () => {
//       setinvoice(true);
//       if (!userId) return;
//       const { data, error } = await supabase
//         .from("invoices_record")
//         .select("*")
//         .eq("user_id", userId);

//       if (error) {
//         console.error("Error fetching invoices:", error);
//       } else {
//         const simplifiedInvoices: Invoice[] = data.map((item: any) => ({
//           id: item.id,
//           date: item.invoice_date,
//           invoiceNumber: item.invoice_no,
//           pdf_url: item.invoice_url,
//           name: item.sellers_record?.name,
//         }));
//         setInvoicedata(simplifiedInvoices);
//         setFilteredInvoices(simplifiedInvoices);
//         setinvoice(false);
//       }
//     };
//     fetchData();
//   }, [userId]);

//   useEffect(() => {
//     const filtered = invoicedata.filter(
//       (invoice) =>
//         invoice.invoiceNumber.toLowerCase().includes(filterText.toLowerCase()) ||
//         invoice.date.includes(filterText)
//     );
//     setFilteredInvoices(filtered);
//   }, [filterText, invoicedata]);

//   const handlePreviewClick = async (invoiceId: string) => {
//     setLoadingPdfId(invoiceId);
//     try {
//       const { data, error } = await supabase
//         .from("invoices_record")
//         .select("invoice_url")
//         .eq("id", invoiceId)
//         .single();

//       if (error) {
//         alert("Failed to load PDF preview.");
//       } else if (data?.invoice_url) {
//         window.open(data.invoice_url, "_blank");
//       }
//     } catch {
//       alert("Unexpected error occurred.");
//     } finally {
//       setLoadingPdfId(null);
//     }
//   };

//   const handleEditClick = (id: string) => {
//     router.push(`edit/${id}`);
//     setloading(true);
//   };

//   const handleDeleteClick = async (id: string, invoice_number: string) => {
//     setloading(true);
//     const confirmed = confirm("Are you sure you want to delete this invoice?");
//     if (!confirmed) return;

//     try {
//       const { data: invoiceData, error: fetchError } = await supabase
//         .from("invoices_record")
//         .select("buyer_id, invoice_url")
//         .eq("id", id)
//         .single();

//       if (fetchError || !invoiceData) {
//         alert("Failed to fetch invoice details.");
//         return;
//       }

//       const { error: invoiceDeleteError } = await supabase
//         .from("invoices_record")
//         .delete()
//         .eq("id", id);

//       if (invoiceDeleteError) {
//         alert("Failed to delete invoice record.");
//         return;
//       }

//       const safeInvoiceNo = invoice_number.replaceAll(/\W+/g, "-");
//       const { error: storageError } = await supabase.storage
//         .from("invoices")
//         .remove([`${userId}/${safeInvoiceNo}.pdf`]);

//       if (storageError) {
//         alert("Invoice deleted but failed to remove PDF from storage.");
//       }

//       setInvoicedata((prev) => prev.filter((i) => i.id !== id));
//       setloading(false);
//     } catch (err) {
//       console.error(err);
//       alert("An unexpected error occurred during deletion.");
//     }
//   };

//   return (
//     <DashboardLayout>
//       {loading ? (
//         <div className="flex justify-center align-middle flex-1 mt-64">
//           <SvgLoader />
//         </div>
//       ) : (
//         <div className="space-y-6">
//           <div>
//             <h1 className="text-3xl font-bold tracking-tight">Edit Billing</h1>
//             <p className="text-muted-foreground">
//               Select an invoice to preview, edit, or delete.
//             </p>
//           </div>

//           <div className="flex items-center space-x-4">
//             <Input
//               placeholder="Search by invoice number or date"
//               value={filterText}
//               onChange={(e) => setFilterText(e.target.value)}
//               className="max-w-sm"
//             />
//           </div>

//           <Card>
//             <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-6">
//               {filteredInvoices.length === 0 ? (
//                 <div className="col-span-full text-center text-muted-foreground py-10">
//                   {getinvoice ? <div className="flex justify-center"><SvgLoader /></div> : "No invoices found."}
//                 </div>
//               ) : (
//                 filteredInvoices.map((invoice) => (
//                   <Card
//                     key={invoice.id}
//                     className="relative group hover:shadow-lg transition-shadow flex flex-col justify-between"
//                   >
//                     <div className="absolute top-0 right-0 z-10">
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="icon" className="rounded-full">
//                             <MoreVertical className="h-4 w-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end">
//                           <DropdownMenuItem onClick={() => handleEditClick(invoice.id)}>
//                             Edit
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onClick={() => handleDeleteClick(invoice.id, invoice.invoiceNumber)}>
//                             Delete
//                           </DropdownMenuItem>
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>

//                     <CardHeader className="pb-2">
//                       <CardTitle className="text-lg">Invoice #{invoice.invoiceNumber}</CardTitle>
//                     </CardHeader>

//                     <CardContent>
//                       <p className="text-sm text-muted-foreground">Date: {invoice.date}</p>
//                     </CardContent>

//                     <div className="p-4 pt-0 mt-auto flex justify-center">
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handlePreviewClick(invoice.id);
//                         }}
//                         disabled={loadingPdfId === invoice.id}
//                       >
//                         {loadingPdfId === invoice.id ? "Loading..." : "Preview"}
//                       </Button>
//                     </div>
//                   </Card>
//                 ))
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       )}
//     </DashboardLayout>
//   );
// }


"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MoreVertical, Share2, Eye, FileSearch, User, Calendar, Mail, MessageCircle } from "lucide-react";

import { useEffect, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import SvgLoader from "@/components/ui/loader";

// Interface updated to include buyer's name
interface Invoice {
  id: string;
  date: string;
  invoiceNumber: string;
  pdf_url?: string;
  buyerName?: string;
}

// Memoized InvoiceCard component for performance and cleaner code
const InvoiceCard = memo(
  ({
    invoice,
    onPreview,
    onEdit,
    onDelete,
    isLoading,
  }: {
    invoice: Invoice;
    onPreview: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string, invoiceNumber: string) => void;
    isLoading: boolean;
  }) => {
    
    const handleShare = (platform: "whatsapp" | "gmail") => {
      const subject = `Invoice #${invoice.invoiceNumber}`;
      const body = `Hello, please find the invoice attached:\n${invoice.pdf_url}`;
      let url = "";

      if (platform === "whatsapp") {
        url = `https://wa.me/?text=${encodeURIComponent(body)}`;
      } else if (platform === "gmail") {
        url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(body)}`;
      }
      if(url) window.open(url, "_blank");
    };

    return (
      <Card
        key={invoice.id}
        className="relative group hover:shadow-xl transition-shadow flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border-t-4 border-indigo-500"
      >
        <div className="absolute top-1 right-1 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(invoice.id, invoice.invoiceNumber)} className="text-red-500">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg tracking-tight">
             #{invoice.invoiceNumber}
          </CardTitle>
          <CardDescription className="flex items-center pt-1">
             <User className="h-3 w-3 mr-2" /> {invoice.buyerName || 'N/A'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="text-sm text-muted-foreground flex items-center">
            <Calendar className="h-3 w-3 mr-2" />
            <span>{new Date(invoice.date).toLocaleDateString()}</span>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center items-center space-x-2 pt-0 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(invoice.id)}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Loading..." : <><Eye className="h-4 w-4 mr-2" /> Preview</>}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Share on WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('gmail')}>
                    <Mail className="h-4 w-4 mr-2" /> Share via Gmail
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    );
  }
);

export default function EditBilling() {
  const { userId } = useUserId();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      
      // Fetch invoices and join with buyers table to get buyer name
      const { data, error } = await supabase
        .from("invoices_record")
        .select("*, buyers_record(name)")
        .eq("user_id", userId)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error);
      } else {
        const mappedInvoices: Invoice[] = data.map((item: any) => ({
          id: item.id,
          date: item.invoice_date,
          invoiceNumber: item.invoice_no,
          pdf_url: item.invoice_url,
          buyerName: item.buyers_record?.name || "N/A",
        }));
        setInvoices(mappedInvoices);
        setFilteredInvoices(mappedInvoices);
      }
      setIsLoadingPage(false);
    };
    fetchData();
  }, [userId]);

  useEffect(() => {
    const filtered = invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(filterText.toLowerCase()) ||
        invoice.date.includes(filterText) ||
        invoice.buyerName?.toLowerCase().includes(filterText.toLowerCase())
    );
    setFilteredInvoices(filtered);
  }, [filterText, invoices]);

  const handlePreviewClick = async (invoiceId: string) => {
    setLoadingPdfId(invoiceId);
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice?.pdf_url) {
        window.open(invoice.pdf_url, "_blank");
      } else {
        alert("PDF URL not found for this invoice.");
      }
    } catch {
      alert("An unexpected error occurred.");
    } finally {
      setLoadingPdfId(null);
    }
  };

  const handleEditClick = (id: string) => {
    setIsLoadingPage(true);
    router.push(`edit/${id}`);
  };

  const handleDeleteClick = async (id: string, invoice_number: string) => {
    const confirmed = confirm("Are you sure you want to delete this invoice?");
    if (!confirmed) return;

    setIsLoadingPage(true);
    try {
        // Delete from storage
        const safeInvoiceNo = invoice_number.replaceAll(/\W+/g, "-");
        await supabase.storage
          .from("invoices")
          .remove([`${userId}/${safeInvoiceNo}.pdf`]);
        
        // Delete record from DB
        await supabase.from("invoices_record").delete().eq("id", id);
        
        setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred during deletion.");
    } finally {
      setIsLoadingPage(false);
    }
  };

  const renderContent = () => {
    if (isLoadingPage) {
      return (
        <div className="flex justify-center items-center h-64">
          <SvgLoader />
        </div>
      );
    }

    if (filteredInvoices.length === 0) {
      return (
        <div className="col-span-full text-center text-muted-foreground py-16 flex flex-col items-center">
            <FileSearch className="h-16 w-16 mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold">No Invoices Found</h3>
            <p>Try adjusting your search or create a new invoice.</p>
        </div>
      );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredInvoices.map((invoice) => (
            <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onPreview={handlePreviewClick}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            isLoading={loadingPdfId === invoice.id}
            />
        ))}
        </div>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Quickly find, preview, edit, share or delete your invoices.
          </p>
        </div>

        <div className="flex items-center">
          <Input
            placeholder="Search by invoice #, date, or buyer name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Card className="p-4 sm:p-6">
            <CardContent className="p-0">
               {renderContent()}
            </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}