// "use client";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";
// import { Button } from "@/components/ui/button";

// // Updated Invoice interface with only the required fields
// interface Invoice {
//   id: string; // Unique ID for each invoice (this is the invoice record ID)
//   date: string; // Directly date, not nested in invoiceDetails
//   invoiceNumber: string; // Directly invoiceNumber, not nested in invoiceDetails
//   pdf_url?: string; // Add a field for the PDF URL
//   // clientName: string; // Added clientName for display purposes
//   // totalAmount: number; // Added totalAmount for display purposes
//   // gstPercentage: number; // Added gstPercentage for total amount calculation
// }

// export default function EditBilling() {
//   const router = useRouter();
//   const [invoicedata, setInvoicedata] = useState<Invoice[]>([]);
//   const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const { data, error } = await supabase
//         .from('invoices_record')
//         .select('*'); // Select all necessary fields
//         console.log("Fetched data:", data);

//       if (error) {
//         console.error("Error fetching invoices:", error);
//       } else {
//         // Map the fetched data to the simplified Invoice interface
//         const simplifiedInvoices: Invoice[] = data.map((item: any) => ({
//           id: item.id,
//           date: item.invoice_date,
//           invoiceNumber: item.invoice_no,
//           pdf_url: item.pdf_url,
//           // clientName: item.clientDetails.name, // Extract client name
//           // // Calculate total amount from products and GST
//           // totalAmount: item.products.reduce((sum: number, p: any) => sum + p.amount, 0) * (1 + (item.gstPercentage * 2) / 100),
//           // gstPercentage: item.gstPercentage,
//         }));
//         setInvoicedata(simplifiedInvoices);
//         console.log("Fetched and simplified invoices:", simplifiedInvoices);
//       }
//     };
//     fetchData();
//   }, []);

//   const handlePreviewClick = async (invoiceId: string) => {
//     setLoadingPdfId(invoiceId);
//     try {
//       const { data, error } = await supabase
//         .from('invoices_record')
//         .select('invoice_url')
//         .eq('id', invoiceId)
//         .single();

//       if (error) {
//         console.error("Error fetching PDF URL:", error);
//         alert("Failed to load PDF preview. Please try again.");
//       } else if (data?.invoice_url) {
//         window.open(data.invoice_url, '_blank');
//       } else {
//         alert("No PDF URL found for this invoice.");
//       }
//     } catch (err) {
//       console.error("Error during PDF preview:", err);
//       alert("An unexpected error occurred while loading the PDF.");
//     } finally {
//       setLoadingPdfId(null);
//     }
//   };

//   const handleEditClick = (invoiceId: string) => {
//     router.push(`edit/${invoiceId}`);
//   };

//   return (
//     <DashboardLayout>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">Edit Billing</h1>
//           <p className="text-muted-foreground">Select an invoice to view its preview or edit its details.</p>
//         </div>

//         <Card>
//           <CardHeader>
//             <CardTitle>Invoice Previews</CardTitle>
//             <CardDescription>A list of your existing invoices</CardDescription>
//           </CardHeader>
//           <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[200px]">
//             {invoicedata.length === 0 ? (
//               <div className="col-span-full flex items-center justify-center min-h-[150px] text-muted-foreground">
//                 No invoices found.
//               </div>
//             ) : (
//               invoicedata.map((invoice) => (
//                 <Card
//                   key={invoice.id}
//                   className="hover:shadow-lg transition-shadow flex flex-col justify-between"
//                 >
//                   <CardHeader className="pb-2">
//                     <CardTitle className="text-xl">Invoice No: {invoice.invoiceNumber}</CardTitle>
//                     {/* <CardDescription>{invoice.clientName}</CardDescription> */}
//                   </CardHeader>
//                   <CardContent>
//                     <p className="text-sm text-muted-foreground">ID: {invoice.id}</p>
//                     <p className="text-sm text-muted-foreground">Date: {invoice.date}</p>
//                     {/* <p className="text-sm text-muted-foreground">
//                       Total: ₹ {invoice.totalAmount.toFixed(2)}
//                     </p> */}
//                     <div className="flex items-center text-xs text-muted-foreground mt-2">
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         width="16"
//                         height="16"
//                         viewBox="0 0 24 24"
//                         fill="none"
//                         stroke="currentColor"
//                         strokeWidth="2"
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         className="lucide lucide-file-text mr-1"
//                       >
//                         <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
//                         <path d="M14 2v4a2 2 0 0 0 2 2h4" />
//                         <path d="M10 9H8" />
//                         <path d="M16 13H8" />
//                         <path d="M16 17H8" />
//                       </svg>
//                       Invoice Details
//                     </div>
//                   </CardContent>
//                   <div className="p-4 pt-0 flex justify-end gap-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handlePreviewClick(invoice.id);
//                       }}
//                       disabled={loadingPdfId === invoice.id}
//                     >
//                       {loadingPdfId === invoice.id ? (
//                         <>
//                           <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
//                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                           </svg>
//                           Loading...
//                         </>
//                       ) : (
//                         "Preview"
//                       )}
//                     </Button>
//                     <Button
//                       size="sm"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleEditClick(invoice.id);
//                       }}
//                     >
//                       Edit
//                     </Button>
//                   </div>
//                 </Card>
//               ))
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </DashboardLayout>
//   );
// }


"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
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
import { MoreVertical } from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import SvgLoader from "@/components/ui/loader";

interface Invoice {
  id: string;
  date: string;
  invoiceNumber: string;
  pdf_url?: string;
  name?: string;
}

export default function EditBilling() {
  const { userId } = useUserId();
  const router = useRouter();
  const [invoicedata, setInvoicedata] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [loading, setloading] = useState<boolean>(false);
  const [getinvoice, setinvoice] = useState<boolean>(false);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setinvoice(true);
      if (!userId) return;
      const { data, error } = await supabase
        .from("invoices_record")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching invoices:", error);
      } else {
        const simplifiedInvoices: Invoice[] = data.map((item: any) => ({
          id: item.id,
          date: item.invoice_date,
          invoiceNumber: item.invoice_no,
          pdf_url: item.invoice_url,
          name: item.sellers_record?.name,
        }));
        setInvoicedata(simplifiedInvoices);
        setFilteredInvoices(simplifiedInvoices);
        setinvoice(false);
      }
    };
    fetchData();
  }, [userId]);

  useEffect(() => {
    const filtered = invoicedata.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(filterText.toLowerCase()) ||
        invoice.date.includes(filterText)
    );
    setFilteredInvoices(filtered);
  }, [filterText, invoicedata]);

  const handlePreviewClick = async (invoiceId: string) => {
    setLoadingPdfId(invoiceId);
    try {
      const { data, error } = await supabase
        .from("invoices_record")
        .select("invoice_url")
        .eq("id", invoiceId)
        .single();

      if (error) {
        alert("Failed to load PDF preview.");
      } else if (data?.invoice_url) {
        window.open(data.invoice_url, "_blank");
      }
    } catch {
      alert("Unexpected error occurred.");
    } finally {
      setLoadingPdfId(null);
    }
  };

  const handleEditClick = (id: string) => {
    router.push(`edit/${id}`);
    setloading(true);
  };

  const handleDeleteClick = async (id: string, invoice_number: string) => {
    setloading(true);
    const confirmed = confirm("Are you sure you want to delete this invoice?");
    if (!confirmed) return;

    try {
      const { data: invoiceData, error: fetchError } = await supabase
        .from("invoices_record")
        .select("buyer_id, invoice_url")
        .eq("id", id)
        .single();

      if (fetchError || !invoiceData) {
        alert("Failed to fetch invoice details.");
        return;
      }

      const { error: invoiceDeleteError } = await supabase
        .from("invoices_record")
        .delete()
        .eq("id", id);

      if (invoiceDeleteError) {
        alert("Failed to delete invoice record.");
        return;
      }

      const safeInvoiceNo = invoice_number.replaceAll(/\W+/g, "-");
      const { error: storageError } = await supabase.storage
        .from("invoices")
        .remove([`${userId}/${safeInvoiceNo}.pdf`]);

      if (storageError) {
        alert("Invoice deleted but failed to remove PDF from storage.");
      }

      setInvoicedata((prev) => prev.filter((i) => i.id !== id));
      setloading(false);
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred during deletion.");
    }
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center align-middle flex-1 mt-64">
          <SvgLoader />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Billing</h1>
            <p className="text-muted-foreground">
              Select an invoice to preview, edit, or delete.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search by invoice number or date"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-6">
              {filteredInvoices.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground py-10">
                  {getinvoice ? <div className="flex justify-center"><SvgLoader /></div> : "No invoices found."}
                </div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <Card
                    key={invoice.id}
                    className="relative group hover:shadow-lg transition-shadow flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(invoice.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(invoice.id, invoice.invoiceNumber)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Invoice #{invoice.invoiceNumber}</CardTitle>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm text-muted-foreground">Date: {invoice.date}</p>
                    </CardContent>

                    <div className="p-4 pt-0 mt-auto flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewClick(invoice.id);
                        }}
                        disabled={loadingPdfId === invoice.id}
                      >
                        {loadingPdfId === invoice.id ? "Loading..." : "Preview"}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
