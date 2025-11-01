


// "use client";

// import { DashboardLayout } from "@/components/dashboard-layout";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
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
// import { MoreVertical, Share2, Eye, FileSearch, User, Calendar, Mail, MessageCircle } from "lucide-react";

// import { useEffect, useState, memo } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import SvgLoader from "@/components/ui/loader";

// // Interface updated to include buyer's name
// interface Invoice {
//   id: string;
//   date: string;
//   invoiceNumber: string;
//   pdf_url?: string;
//   buyerName?: string;
// }

// // Memoized InvoiceCard component for performance and cleaner code
// const InvoiceCard = memo(
//   ({
//     invoice,
//     onPreview,
//     onEdit,
//     onDelete,
//     isLoading,
//   }: {
//     invoice: Invoice;
//     onPreview: (id: string) => void;
//     onEdit: (id: string) => void;
//     onDelete: (id: string, invoiceNumber: string) => void;
//     isLoading: boolean;
//   }) => {
    
//     const handleShare = (platform: "whatsapp" | "gmail") => {
//       const subject = `Invoice #${invoice.invoiceNumber}`;
//       const body = `Hello, please find the invoice attached:\n${invoice.pdf_url}`;
//       let url = "";

//       if (platform === "whatsapp") {
//         url = `https://wa.me/?text=${encodeURIComponent(body)}`;
//       } else if (platform === "gmail") {
//         url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
//           subject
//         )}&body=${encodeURIComponent(body)}`;
//       }
//       if(url) window.open(url, "_blank");
//     };

//     return (
//       <Card
//         key={invoice.id}
//         className="relative group hover:shadow-xl transition-shadow flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border-t-4 border-indigo-500"
//       >
//         <div className="absolute top-1 right-1 z-10">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
//                 <MoreVertical className="h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//               <DropdownMenuItem onClick={() => onEdit(invoice.id)}>
//                 Edit
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => onDelete(invoice.id, invoice.invoiceNumber)} className="text-red-500">
//                 Delete
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>

//         <CardHeader className="pb-2">
//           <CardTitle className="text-lg tracking-tight">
//              #{invoice.invoiceNumber}
//           </CardTitle>
//           <CardDescription className="flex items-center pt-1">
//              <User className="h-3 w-3 mr-2" /> {invoice.buyerName || 'N/A'}
//           </CardDescription>
//         </CardHeader>

//         <CardContent>
//           <div className="text-sm text-muted-foreground flex items-center">
//             <Calendar className="h-3 w-3 mr-2" />
//             <span>{new Date(invoice.date).toLocaleDateString()}</span>
//           </div>
//         </CardContent>

//         <CardFooter className="flex justify-center items-center space-x-2 pt-0 mt-auto">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => onPreview(invoice.id)}
//             disabled={isLoading}
//             className="flex-1"
//           >
//             {isLoading ? "Loading..." : <><Eye className="h-4 w-4 mr-2" /> Preview</>}
//           </Button>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="default" size="sm" className="flex-1">
//                 <Share2 className="h-4 w-4 mr-2" /> Share
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//                 <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
//                     <MessageCircle className="h-4 w-4 mr-2" /> Share on WhatsApp
//                 </DropdownMenuItem>
//                 <DropdownMenuItem onClick={() => handleShare('gmail')}>
//                     <Mail className="h-4 w-4 mr-2" /> Share via Gmail
//                 </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </CardFooter>
//       </Card>
//     );
//   }
// );

// export default function EditBilling() {
//   const { userId } = useUserId();
//   const router = useRouter();
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
//   const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
//   const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
//   const [filterText, setFilterText] = useState("");

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!userId) return;
      
//       // Fetch invoices and join with buyers table to get buyer name
//       const { data, error } = await supabase
//         .from("invoices_record")
//         .select("*, buyers_record(name)")
//         .eq("user_id", userId)
//         .order('invoice_date', { ascending: false });

//       if (error) {
//         console.error("Error fetching invoices:", error);
//       } else {
//         const mappedInvoices: Invoice[] = data.map((item: any) => ({
//           id: item.id,
//           date: item.invoice_date,
//           invoiceNumber: item.invoice_no,
//           pdf_url: item.invoice_url,
//           buyerName: item.buyers_record?.name || "N/A",
//         }));
//         setInvoices(mappedInvoices);
//         setFilteredInvoices(mappedInvoices);
//       }
//       setIsLoadingPage(false);
//     };
//     fetchData();
//   }, [userId]);

//   useEffect(() => {
//     const filtered = invoices.filter(
//       (invoice) =>
//         invoice.invoiceNumber.toLowerCase().includes(filterText.toLowerCase()) ||
//         invoice.date.includes(filterText) ||
//         invoice.buyerName?.toLowerCase().includes(filterText.toLowerCase())
//     );
//     setFilteredInvoices(filtered);
//   }, [filterText, invoices]);

//   const handlePreviewClick = async (invoiceId: string) => {
//     setLoadingPdfId(invoiceId);
//     try {
//       const invoice = invoices.find(inv => inv.id === invoiceId);
//       if (invoice?.pdf_url) {
//         window.open(invoice.pdf_url, "_blank");
//       } else {
//         alert("PDF URL not found for this invoice.");
//       }
//     } catch {
//       alert("An unexpected error occurred.");
//     } finally {
//       setLoadingPdfId(null);
//     }
//   };

//   const handleEditClick = (id: string) => {
//     setIsLoadingPage(true);
//     router.push(`edit/${id}`);
//   };

//   const handleDeleteClick = async (id: string, invoice_number: string) => {
//     const confirmed = confirm("Are you sure you want to delete this invoice?");
//     if (!confirmed) return;

//     setIsLoadingPage(true);
//     try {
//         // Delete from storage
//         const safeInvoiceNo = invoice_number.replaceAll(/\W+/g, "-");
//         await supabase.storage
//           .from("invoices")
//           .remove([`${userId}/${safeInvoiceNo}.pdf`]);
        
//         // Delete record from DB
//         await supabase.from("invoices_record").delete().eq("id", id);
        
//         setInvoices((prev) => prev.filter((i) => i.id !== id));
//     } catch (err) {
//       console.error(err);
//       alert("An unexpected error occurred during deletion.");
//     } finally {
//       setIsLoadingPage(false);
//     }
//   };

//   const renderContent = () => {
//     if (isLoadingPage) {
//       return (
//         <div className="flex justify-center items-center h-64">
//           <SvgLoader />
//         </div>
//       );
//     }

//     if (filteredInvoices.length === 0) {
//       return (
//         <div className="col-span-full text-center text-muted-foreground py-16 flex flex-col items-center">
//             <FileSearch className="h-16 w-16 mb-4 text-gray-400" />
//             <h3 className="text-xl font-semibold">No Invoices Found</h3>
//             <p>Try adjusting your search or create a new invoice.</p>
//         </div>
//       );
//     }

//     return (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//         {filteredInvoices.map((invoice) => (
//             <InvoiceCard
//             key={invoice.id}
//             invoice={invoice}
//             onPreview={handlePreviewClick}
//             onEdit={handleEditClick}
//             onDelete={handleDeleteClick}
//             isLoading={loadingPdfId === invoice.id}
//             />
//         ))}
//         </div>
//     );
//   };
  
//   return (
//     <DashboardLayout>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">Manage Invoices</h1>
//           <p className="text-muted-foreground mt-2">
//             Quickly find, preview, edit, share or delete your invoices.
//           </p>
//         </div>

//         <div className="flex items-center">
//           <Input
//             placeholder="Search by invoice #, date, or buyer name..."
//             value={filterText}
//             onChange={(e) => setFilterText(e.target.value)}
//             className="max-w-md"
//           />
//         </div>

//         <Card className="p-4 sm:p-6">
//             <CardContent className="p-0">
//                {renderContent()}
//             </CardContent>
//         </Card>
//       </div>
//     </DashboardLayout>
//   );
// }


// "use client";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
// import { MoreVertical, Share2, Eye, FileSearch, User, Calendar, Mail, MessageCircle } from "lucide-react";
// import { useEffect, useState, memo } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import SvgLoader from "@/components/ui/loader";

// // Interface for Invoice data
// interface Invoice {
//   id: string;
//   date: string;
//   number: string;
//   pdf_url?: string;
//   buyerName?: string;
// }

// // Memoized InvoiceCard component for performance
// const InvoiceCard = memo(
//   ({ invoice, onPreview, onEdit, onDelete, isLoading }: {
//     invoice: Invoice;
//     onPreview: (url: string) => void;
//     onEdit: (id: string) => void;
//     onDelete: (id: string, invoiceNumber: string) => void;
//     isLoading: boolean;
//   }) => {
//     // Share handler logic...
//     const handleShare = (platform: "whatsapp" | "gmail") => {
//       const subject = `Invoice #${invoice.number}`;
//       const body = `Hello, please find your invoice attached:\n${invoice.pdf_url}`;
//       let url = "";
//       if (platform === "whatsapp") url = `https://wa.me/?text=${encodeURIComponent(body)}`;
//       else if (platform === "gmail") url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
//       if(url) window.open(url, "_blank");
//     };

//     return (
//       <Card key={invoice.id} className="relative group hover:shadow-xl transition-shadow flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border-t-4 border-indigo-500">
//         <div className="absolute top-1 right-1 z-10">
//           <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(invoice.id)}>Edit</DropdownMenuItem><DropdownMenuItem onClick={() => onDelete(invoice.id, invoice.number)} className="text-red-500">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
//         </div>
//         <CardHeader className="pb-2">
//           <CardTitle className="text-lg tracking-tight">#{invoice.number}</CardTitle>
//           <CardDescription className="flex items-center pt-1"><User className="h-3 w-3 mr-2" /> {invoice.buyerName || 'N/A'}</CardDescription>
//         </CardHeader>
//         <CardContent><div className="text-sm text-muted-foreground flex items-center"><Calendar className="h-3 w-3 mr-2" /><span>{new Date(invoice.date).toLocaleDateString()}</span></div></CardContent>
//         <CardFooter className="flex justify-center items-center space-x-2 pt-0 mt-auto">
//           <Button variant="outline" size="sm" onClick={() => invoice.pdf_url && onPreview(invoice.pdf_url)} disabled={isLoading || !invoice.pdf_url} className="flex-1">{isLoading ? "Loading..." : <><Eye className="h-4 w-4 mr-2" /> Preview</>}</Button>
//           <DropdownMenu><DropdownMenuTrigger asChild><Button variant="default" size="sm" className="flex-1"><Share2 className="h-4 w-4 mr-2" /> Share</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleShare('whatsapp')}><MessageCircle className="h-4 w-4 mr-2" /> WhatsApp</DropdownMenuItem><DropdownMenuItem onClick={() => handleShare('gmail')}><Mail className="h-4 w-4 mr-2" /> Gmail</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
//         </CardFooter>
//       </Card>
//     );
//   }
// );

// export default function EditBilling() {
//   const { userId } = useUserId();
//   const router = useRouter();
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
//   const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
//   const [filterText, setFilterText] = useState("");
  
//   // --- ADDED: State for sorting ---
//   const [sortBy, setSortBy] = useState('number_desc');

//   // --- MODIFIED: useEffect now depends on 'sortBy' ---
// // --- MODIFIED: useEffect now handles compound sorting for invoice numbers ---
// useEffect(() => {
//     const fetchData = async () => {
//       if (!userId) return;
//       setIsLoadingPage(true);

//       const [column, order] = sortBy.split('_');
//       const ascending = order === 'asc';
      
//       let query = supabase
//         .from("invoices_record")
//         .select(`
//           id, 
//           date, 
//           number, 
//           invoice_url,
//           buyers_record ( name )
//         `)
//         .eq("user_id", userId);

//       // Handle the different sort options
//       if (sortBy === 'number_desc') {
//         // For a true numerical sort across years, sort by date then by number
//         query = query.order('date', { ascending: false }).order('number', { ascending: false });
//       } else {
//         // For simple date sorting
//         query = query.order(column, { ascending: ascending });
//       }
      
//       const { data, error } = await query;

//       if (error) {
//         console.error("Error fetching invoices:", error);
//       } else {
//         const mappedInvoices: Invoice[] = data.map((item: any) => ({
//           id: item.id,
//           date: item.date,
//           number: item.number,
//           pdf_url: item.invoice_url,
//           buyerName: item.buyers_record?.name || "N/A",
//         }));
//         setInvoices(mappedInvoices);
//       }
//       setIsLoadingPage(false);
//     };
//     fetchData();
//   }, [userId, sortBy]); // Re-fetch when sortBy changes
//   useEffect(() => {
//     const filtered = invoices.filter(
//       (invoice) =>
//         invoice.number.toLowerCase().includes(filterText.toLowerCase()) ||
//         invoice.date.includes(filterText) ||
//         invoice.buyerName?.toLowerCase().includes(filterText.toLowerCase())
//     );
//     setFilteredInvoices(filtered);
//   }, [filterText, invoices]);

//   const handlePreviewClick = (url: string) => window.open(url, "_blank");
//   const handleEditClick = (id: string) => router.push(`edit/${id}`);
//   const handleDeleteClick = async (id: string, invoice_number: string) => {
//     if (!confirm("Are you sure?")) return;
//     setIsLoadingPage(true);
//     try {
//       const safeInvoiceNo = invoice_number.replaceAll(/\W+/g, "-");
//       await supabase.storage.from("invoices").remove([`${userId}/${safeInvoiceNo}.pdf`]);
//       await supabase.from("invoices_record").delete().eq("id", id);
//       setInvoices((prev) => prev.filter((i) => i.id !== id));
//     } finally {
//       setIsLoadingPage(false);
//     }
//   };

//   const renderContent = () => {
//     if (isLoadingPage) return <div className="flex justify-center items-center h-64"><SvgLoader /></div>;
//     if (filteredInvoices.length === 0) return <div className="col-span-full text-center py-16"><FileSearch className="h-16 w-16 mx-auto mb-4 text-gray-400" /><h3>No Invoices Found</h3></div>;
//     return (
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//         {filteredInvoices.map((invoice) => (
//           <InvoiceCard key={invoice.id} invoice={invoice} onPreview={handlePreviewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} isLoading={false} />
//         ))}
//       </div>
//     );
//   };
  
//   return (
//     <DashboardLayout>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">Manage Invoices</h1>
//           <p className="text-muted-foreground mt-2">Quickly find, preview, edit, share or delete your invoices.</p>
//         </div>
        
//         {/* --- ADDED: Search and Sort controls --- */}
//         <div className="flex flex-col sm:flex-row gap-4">
//           <Input
//             placeholder="Search by invoice #, date, or buyer..."
//             value={filterText}
//             onChange={(e) => setFilterText(e.target.value)}
//             className="max-w-md"
//           />
//           <Select value={sortBy} onValueChange={setSortBy}>
//             <SelectTrigger className="w-full sm:w-[180px]">
//               <SelectValue placeholder="Sort by" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="date_desc">Latest First</SelectItem>
//               <SelectItem value="date_asc">Oldest First</SelectItem>
//               <SelectItem value="number_desc">By Invoice Number</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <Card className="p-4 sm:p-6">
//           <CardContent className="p-0">{renderContent()}</CardContent>
//         </Card>
//       </div>
//     </DashboardLayout>
//   );
// }


// "use client";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
// import { Input } from "@/components/ui/input";
// import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
// import { MoreVertical, Share2, Eye, FileSearch, User, Calendar, Mail, MessageCircle, CheckCircle, XCircle } from "lucide-react";
// import { useEffect, useState, memo } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";
// import { useUserId } from "@/hooks/context/UserContext";
// import SvgLoader from "@/components/ui/loader";
// import { useToast } from "@/hooks/use-toast"; // Ensure you have this hook

// // --- UPDATED: Interface for Invoice data ---
// interface Invoice {
//   id: string;
//   date: string;
//   number: string;
//   invoice_url?: string;
//   buyerName?: string;
//   status: 'paid' | 'unpaid' | null;
//   total_amount: number;
// }

// // --- UPDATED: Memoized InvoiceCard component ---
// const InvoiceCard = memo(
//   ({ invoice, onPreview, onEdit, onDelete, onStatusChange, isUpdating }: {
//     invoice: Invoice;
//     onPreview: (url: string) => void;
//     onEdit: (id: string) => void;
//     onDelete: (id: string, invoiceNumber: string) => void;
//     onStatusChange: (invoice: Invoice, newStatus: 'paid' | 'unpaid') => void;
//     isUpdating: boolean;
//   }) => {
    
//     const handleShare = (platform: "whatsapp" | "gmail") => {
//       const subject = `Invoice #${invoice.number}`;
//       const body = `Hello, please find your invoice attached:\n${invoice.invoice_url}`;
//       let url = "";
//       if (platform === "whatsapp") url = `https://wa.me/?text=${encodeURIComponent(body)}`;
//       else if (platform === "gmail") url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
//       if(url) window.open(url, "_blank");
//     };

//     const isPaid = invoice.status === 'paid';

//     return (
//       <Card key={invoice.id} className={`relative group hover:shadow-xl transition-shadow flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border-t-4 ${isPaid ? 'border-green-500' : 'border-indigo-500'}`}>
//         <div className="absolute top-1 right-1 z-10">
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={isUpdating}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//               <DropdownMenuItem onClick={() => onEdit(invoice.id)} disabled={isUpdating}>Edit</DropdownMenuItem>
//               <DropdownMenuSeparator />
//               {isPaid ? (
//                 <DropdownMenuItem onClick={() => onStatusChange(invoice, 'unpaid')} disabled={isUpdating}>
//                   <XCircle className="mr-2 h-4 w-4" />Unpaid
//                 </DropdownMenuItem>
//               ) : (
//                 <DropdownMenuItem onClick={() => onStatusChange(invoice, 'paid')} disabled={isUpdating}>
//                   <CheckCircle className="mr-2 h-4 w-4" />Paid
//                 </DropdownMenuItem>
//               )}
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onClick={() => onDelete(invoice.id, invoice.number)} className="text-red-500" disabled={isUpdating}>Delete</DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>
//         <CardHeader className="pb-2">
//           <CardTitle className="text-lg tracking-tight">#{invoice.number}</CardTitle>
//           <CardDescription className="flex items-center pt-1"><User className="h-3 w-3 mr-2" /> {invoice.buyerName || 'N/A'}</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="text-sm text-muted-foreground flex items-center">
//             <Calendar className="h-3 w-3 mr-2" />
//             <span>{new Date(invoice.date).toLocaleDateString()}</span>
//           </div>
//         </CardContent>
//         <CardFooter className="flex justify-center items-center space-x-2 pt-0 mt-auto">
//           <Button variant="outline" size="sm" onClick={() => invoice.invoice_url && onPreview(invoice.invoice_url)} disabled={!invoice.invoice_url || isUpdating} className="flex-1"><Eye className="h-4 w-4 mr-2" /> Preview</Button>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild><Button variant="default" size="sm" className="flex-1" disabled={isUpdating}><Share2 className="h-4 w-4 mr-2" /> Share</Button></DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//               <DropdownMenuItem onClick={() => handleShare('whatsapp')}><MessageCircle className="h-4 w-4 mr-2" /> WhatsApp</DropdownMenuItem>
//               <DropdownMenuItem onClick={() => handleShare('gmail')}><Mail className="h-4 w-4 mr-2" /> Gmail</DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </CardFooter>
//       </Card>
//     );
//   }
// );
// InvoiceCard.displayName = 'InvoiceCard';


// export default function EditBilling() {
//   const { userId } = useUserId();
//   const router = useRouter();
//   const { toast } = useToast();
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
//   const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
//   const [filterText, setFilterText] = useState("");
//   const [sortBy, setSortBy] = useState('number_desc');
//   const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!userId) return;
//       setIsLoadingPage(true);
      
//       const [column, order] = sortBy.split('_');
//       const ascending = order === 'asc';
      
//       // Query invoices with related buyer and items
//       let query = supabase
//         .from("invoices_record")
//         .select(`
//           id, 
//           date, 
//           number, 
//           invoice_url,
//           status,
//           buyers_record ( name ),
//           items_record ( rate, quantity, gst_rate )
//         `)
//         .eq("user_id", userId);

//       // Handle sort options
//       if (sortBy === 'number_desc') {
//         query = query.order('date', { ascending: false }).order('number', { ascending: false });
//       } else {
//         query = query.order(column, { ascending });
//       }
      
//       const { data, error } = await query;

//       if (error) {
//         console.error("Error fetching invoices:", error);
//         toast({ title: "Error", description: "Could not fetch invoices. Check RLS policies.", variant: "destructive" });
//       } else if (data) {
//         // Map data and calculate total amount for each invoice
//         const mappedInvoices: Invoice[] = data.map((item: any) => {
          
//           const totalAmount = (item.items_record || []).reduce((acc: number, currentItem: any) => {
//               const rate = Number(currentItem.rate) || 0;
//               const quantity = Number(currentItem.quantity) || 0;
//               const gst_rate = Number(currentItem.gst_rate) || 0;
              
//               const itemTotal = rate * quantity;
//               const gstAmount = itemTotal * (gst_rate / 100);
//               return acc + itemTotal + gstAmount;
//           }, 0);

//           return {
//             id: item.id,
//             date: item.date,
//             number: item.number,
//             invoice_url: item.invoice_url,
//             buyerName: item.buyers_record?.name || "N/A",
//             status: item.status,
//             total_amount: totalAmount,
//           };
//         });
//         setInvoices(mappedInvoices);
//       }
//       setIsLoadingPage(false);
//     };
//     fetchData();
//   }, [userId, sortBy, toast]);

//   useEffect(() => {
//     const filtered = invoices.filter(
//       (invoice) =>
//         invoice.number.toLowerCase().includes(filterText.toLowerCase()) ||
//         invoice.date.includes(filterText) ||
//         invoice.buyerName?.toLowerCase().includes(filterText.toLowerCase())
//     );
//     setFilteredInvoices(filtered);
//   }, [filterText, invoices]);

//   const handlePreviewClick = (url: string) => window.open(url, "_blank");
//   const handleEditClick = (id: string) => router.push(`/dashboard/invoices/edit/${id}`);

//   const handleDeleteClick = async (id: string, invoice_number: string) => {
//     if (!confirm("Are you sure? This will delete the invoice and any associated payment records.")) return;
//     setUpdatingStatusId(id);
//     try {
//       // First, delete the ledger entry associated with this invoice
//       const { error: ledgerError } = await supabase.from('ledger_entries').delete().eq('user_id', userId).contains('tags', [`invoice_id:${id}`]);
//       if (ledgerError) throw new Error(`Ledger Error: ${ledgerError.message}`);
      
//       // Then, delete the invoice record itself (items are deleted via CASCADE)
//       const { error: invoiceError } = await supabase.from("invoices_record").delete().eq("id", id);
//       if (invoiceError) throw new Error(`Invoice Error: ${invoiceError.message}`);

//       setInvoices((prev) => prev.filter((i) => i.id !== id));
//       toast({ title: "Success", description: `Invoice #${invoice_number} deleted.` });
//     } catch (error: any) {
//         toast({ title: "Error", description: `Failed to delete invoice: ${error.message}`, variant: "destructive" });
//     } finally {
//       setUpdatingStatusId(null);
//     }
//   };

//   const handleStatusChange = async (invoice: Invoice, newStatus: 'paid' | 'unpaid') => {
//     if (!userId) return;
//     setUpdatingStatusId(invoice.id);
//     try {
//         if (newStatus === 'paid') {
//             // Add to ledger
//             const { error: ledgerError } = await supabase.from('ledger_entries').insert({
//                 user_id: userId,
//                 type: 'credit',
//                 amount: invoice.total_amount,
//                 description: `Invoice #${invoice.number}`,
//                 tags: [`invoice no:${invoice.number}`]
//             });
//             if (ledgerError) throw ledgerError;
//         } else { // Unpaid
//             // Remove from ledger
//             const { error: ledgerError } = await supabase.from('ledger_entries').delete().eq('user_id', userId).contains('tags', [`invoice_id:${invoice.id}`]);
//             if (ledgerError) throw ledgerError;
//         }

//         // Update the invoice status after ledger operation is successful
//         const { error: invoiceError } = await supabase.from('invoices_record').update({ status: newStatus }).eq('id', invoice.id);
//         if (invoiceError) throw invoiceError;

//         // Update local state for immediate UI feedback
//         setInvoices(prevInvoices =>
//             prevInvoices.map(inv =>
//                 inv.id === invoice.id ? { ...inv, status: newStatus } : inv
//             )
//         );
//         toast({ title: "Status Updated", description: `Invoice #${invoice.number} marked as ${newStatus}.` });

//     } catch (error: any) {
//         toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: "destructive" });
//         // Optional: Revert local state on failure
//         setInvoices(prev => [...prev]); 
//     } finally {
//         setUpdatingStatusId(null);
//     }
//   };

//   const renderContent = () => {
//     if (isLoadingPage) return <div className="flex justify-center items-center h-64"><SvgLoader /></div>;
//     if (invoices.length > 0 && filteredInvoices.length === 0) {
//         return <div className="col-span-full text-center py-16"><FileSearch className="h-16 w-16 mx-auto mb-4 text-gray-400" /><h3>No Invoices Match Your Search</h3></div>;
//     }
//     if (invoices.length === 0) return <div className="col-span-full text-center py-16"><FileSearch className="h-16 w-16 mx-auto mb-4 text-gray-400" /><h3>No Invoices Found</h3><p>Create your first invoice to see it here.</p></div>;
    
//     return (
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//         {filteredInvoices.map((invoice) => (
//           <InvoiceCard 
//             key={invoice.id} 
//             invoice={invoice} 
//             onPreview={handlePreviewClick} 
//             onEdit={handleEditClick} 
//             onDelete={handleDeleteClick} 
//             onStatusChange={handleStatusChange}
//             isUpdating={updatingStatusId === invoice.id}
//           />
//         ))}
//       </div>
//     );
//   };
  
//   return (
//     <DashboardLayout>
//       <div className="p-4 md:p-6 space-y-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">Manage Invoices</h1>
//           <p className="text-muted-foreground mt-2">Quickly find, preview, edit, share or delete your invoices.</p>
//         </div>
        
//         <div className="flex flex-col sm:flex-row gap-4">
//           <Input
//             placeholder="Search by invoice #, date, or buyer..."
//             value={filterText}
//             onChange={(e) => setFilterText(e.target.value)}
//             className="flex-grow"
//           />
//           <Select value={sortBy} onValueChange={setSortBy}>
//             <SelectTrigger className="w-full sm:w-[200px]">
//               <SelectValue placeholder="Sort by" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="date_desc">Latest First</SelectItem>
//               <SelectItem value="date_asc">Oldest First</SelectItem>
//               <SelectItem value="number_desc">By Invoice Number</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <Card>
//           <CardContent className="p-4 sm:p-6">{renderContent()}</CardContent>
//         </Card>
//       </div>
//     </DashboardLayout>
//   );
// }

"use client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Share2, Eye, FileSearch, User, Calendar, Mail, MessageCircle, CheckCircle, XCircle, Edit, Trash2, Sparkles, Filter, Search } from "lucide-react";
import { useEffect, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
import SvgLoader from "@/components/ui/loader";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

// --- Interface for Invoice data ---
interface Invoice {
  id: string;
  date: string;
  number: string;
  invoice_url?: string;
  buyerName?: string;
  status: 'paid' | 'unpaid' | null;
  total_amount: number;
}

// --- Memoized InvoiceCard component ---
const InvoiceCard = memo(
  ({ invoice, onPreview, onEdit, onDelete, onStatusChange, isUpdating }: {
    invoice: Invoice;
    onPreview: (url: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string, invoiceNumber: string) => void;
    onStatusChange: (invoice: Invoice, newStatus: 'paid' | 'unpaid') => void;
    isUpdating: boolean;
  }) => {
    
    const handleShare = (platform: "whatsapp" | "gmail") => {
      const subject = `Invoice #${invoice.number}`;
      const body = `Hello, please find your invoice attached:\n${invoice.invoice_url}`;
      let url = "";
      if (platform === "whatsapp") url = `https://wa.me/?text=${encodeURIComponent(body)}`;
      else if (platform === "gmail") url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if(url) window.open(url, "_blank");
    };

    const isPaid = invoice.status === 'paid';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
      >
        <Card className={`relative group overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ${
          isPaid ? 'hover:shadow-emerald-500/10 border-t-4 border-t-emerald-500' : 'hover:shadow-indigo-500/10 border-t-4 border-t-indigo-500'
        }`}>
          
          {/* Decorative gradient overlay */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${
            isPaid ? 'bg-emerald-500' : 'bg-indigo-500'
          }`} />
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4 z-10">
            <Badge className={`${
              isPaid 
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' 
                : 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400'
            } border backdrop-blur-sm`}>
              {isPaid ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Paid
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Unpaid
                </>
              )}
            </Badge>
          </div>

          {/* Action Menu */}
          <div className="absolute top-4 right-4 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background border border-border/50 shadow-lg" 
                  disabled={isUpdating}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={() => onEdit(invoice.id)} disabled={isUpdating} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isPaid ? (
                  <DropdownMenuItem onClick={() => onStatusChange(invoice, 'unpaid')} disabled={isUpdating} className="cursor-pointer">
                    <XCircle className="mr-2 h-4 w-4 text-amber-500" />
                    Mark as Unpaid
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onStatusChange(invoice, 'paid')} disabled={isUpdating} className="cursor-pointer">
                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                    Mark as Paid
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(invoice.id, invoice.number)} 
                  className="text-red-500 focus:text-red-600 cursor-pointer" 
                  disabled={isUpdating}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardHeader className="pb-3 pt-16">
            <CardTitle className="text-xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              #{invoice.number}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium">{invoice.buyerName || 'N/A'}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="p-1.5 rounded-lg bg-muted">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span>{new Date(invoice.date).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}</span>
            </div>
            
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold text-primary ml-auto">
                  ₹{invoice.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 pt-0 pb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => invoice.invoice_url && onPreview(invoice.invoice_url)} 
              disabled={!invoice.invoice_url || isUpdating} 
              className="flex-1 group/btn hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
            >
              <Eye className="h-4 w-4 mr-2 group-hover/btn:text-primary transition-colors" />
              Preview
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300" 
                  disabled={isUpdating}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-background/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('gmail')} className="cursor-pointer">
                  <Mail className="h-4 w-4 mr-2 text-red-500" />
                  Gmail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }
);
InvoiceCard.displayName = 'InvoiceCard';


export default function EditBilling() {
  const { userId } = useUserId();
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState('number_desc');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setIsLoadingPage(true);
      
      const [column, order] = sortBy.split('_');
      const ascending = order === 'asc';
      
      let query = supabase
        .from("invoices_record")
        .select(`
          id, 
          date, 
          number, 
          invoice_url,
          status,
          buyers_record ( name ),
          items_record ( rate, quantity, gst_rate )
        `)
        .eq("user_id", userId);

      if (sortBy === 'number_desc') {
        query = query.order('date', { ascending: false }).order('number', { ascending: false });
      } else {
        query = query.order(column, { ascending });
      }
      
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching invoices:", error);
        toast({ title: "Error", description: "Could not fetch invoices. Check RLS policies.", variant: "destructive" });
      } else if (data) {
        const mappedInvoices: Invoice[] = data.map((item: any) => {
          const totalAmount = (item.items_record || []).reduce((acc: number, currentItem: any) => {
              const rate = Number(currentItem.rate) || 0;
              const quantity = Number(currentItem.quantity) || 0;
              const gst_rate = Number(currentItem.gst_rate) || 0;
              
              const itemTotal = rate * quantity;
              const gstAmount = itemTotal * (gst_rate / 100);
              return acc + itemTotal + gstAmount;
          }, 0);

          return {
            id: item.id,
            date: item.date,
            number: item.number,
            invoice_url: item.invoice_url,
            buyerName: item.buyers_record?.name || "N/A",
            status: item.status,
            total_amount: totalAmount,
          };
        });
        setInvoices(mappedInvoices);
      }
      setIsLoadingPage(false);
    };
    fetchData();
  }, [userId, sortBy, toast]);

  useEffect(() => {
    const filtered = invoices.filter(
      (invoice) =>
        invoice.number.toLowerCase().includes(filterText.toLowerCase()) ||
        invoice.date.includes(filterText) ||
        invoice.buyerName?.toLowerCase().includes(filterText.toLowerCase())
    );
    setFilteredInvoices(filtered);
  }, [filterText, invoices]);

  const handlePreviewClick = (url: string) => window.open(url, "_blank");
  const handleEditClick = (id: string) => router.push(`/dashboard/invoices/edit/${id}`);

  const handleDeleteClick = async (id: string, invoice_number: string) => {
    if (!confirm("Are you sure? This will delete the invoice and any associated payment records.")) return;
    setUpdatingStatusId(id);
    try {
      const { error: ledgerError } = await supabase.from('ledger_entries').delete().eq('user_id', userId).contains('tags', [`invoice_id:${id}`]);
      if (ledgerError) throw new Error(`Ledger Error: ${ledgerError.message}`);
      
      const { error: invoiceError } = await supabase.from("invoices_record").delete().eq("id", id);
      if (invoiceError) throw new Error(`Invoice Error: ${invoiceError.message}`);

      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Success", description: `Invoice #${invoice_number} deleted successfully.` });
    } catch (error: any) {
        toast({ title: "Error", description: `Failed to delete invoice: ${error.message}`, variant: "destructive" });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: 'paid' | 'unpaid') => {
    if (!userId) return;
    setUpdatingStatusId(invoice.id);
    try {
        if (newStatus === 'paid') {
            const { error: ledgerError } = await supabase.from('ledger_entries').insert({
                user_id: userId,
                type: 'credit',
                amount: invoice.total_amount,
                description: `Invoice #${invoice.number}`,
                tags: [`invoice no:${invoice.number}`]
            });
            if (ledgerError) throw ledgerError;
        } else {
            const { error: ledgerError } = await supabase.from('ledger_entries').delete().eq('user_id', userId).contains('tags', [`invoice_id:${invoice.id}`]);
            if (ledgerError) throw ledgerError;
        }

        const { error: invoiceError } = await supabase.from('invoices_record').update({ status: newStatus }).eq('id', invoice.id);
        if (invoiceError) throw invoiceError;

        setInvoices(prevInvoices =>
            prevInvoices.map(inv =>
                inv.id === invoice.id ? { ...inv, status: newStatus } : inv
            )
        );
        toast({ title: "Status Updated", description: `Invoice #${invoice.number} marked as ${newStatus}.` });

    } catch (error: any) {
        toast({ title: "Error", description: `Failed to update status: ${error.message}`, variant: "destructive" });
        setInvoices(prev => [...prev]); 
    } finally {
        setUpdatingStatusId(null);
    }
  };

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    unpaid: invoices.filter(i => i.status === 'unpaid').length,
  };

  const renderContent = () => {
    if (isLoadingPage) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 animate-pulse" />
          ))}
        </div>
      );
    }
    
    if (invoices.length > 0 && filteredInvoices.length === 0) {
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full text-center py-20"
          >
            <div className="p-4 rounded-full bg-muted/30 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <FileSearch className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Invoices Match Your Search</h3>
            <p className="text-muted-foreground">Try adjusting your search filters</p>
          </motion.div>
        );
    }
    
    if (invoices.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="col-span-full text-center py-20"
        >
          <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <FileSearch className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Invoices Found</h3>
          <p className="text-muted-foreground mb-6">Create your first invoice to see it here</p>
          <Button onClick={() => router.push('/dashboard/invoices/create')} className="bg-gradient-to-r from-primary to-primary/90">
            <Sparkles className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </motion.div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredInvoices.map((invoice) => (
            <InvoiceCard 
              key={invoice.id} 
              invoice={invoice} 
              onPreview={handlePreviewClick} 
              onEdit={handleEditClick} 
              onDelete={handleDeleteClick} 
              onStatusChange={handleStatusChange}
              isUpdating={updatingStatusId === invoice.id}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Invoice Management
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage, track, and organize all your invoices in one place
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                  <p className="text-3xl font-bold mt-2">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileSearch className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 backdrop-blur-sm hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paid Invoices</p>
                  <p className="text-3xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">{stats.paid}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10 backdrop-blur-sm hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unpaid Invoices</p>
                  <p className="text-3xl font-bold mt-2 text-amber-600 dark:text-amber-400">{stats.unpaid}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <XCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Search and Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-grow group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by invoice #, date, or buyer name..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-10 h-11 border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background transition-all duration-300"
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[220px] h-11 border-border/50 bg-background/50 backdrop-blur-sm">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50">
              <SelectItem value="date_desc">Latest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
              <SelectItem value="number_desc">By Invoice Number</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Invoices Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}