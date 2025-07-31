// "use client";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
// import { Button } from "../../../../components/ui/button";
// import { Input } from "../../../../components/ui/input";
// import { Label } from "../../../../components/ui/label";
// import { Textarea } from "../../../../components/ui/textarea";
// import { useState, useMemo, useEffect } from "react";
// import { supabase } from "../../../../lib/supabase";
// import { useUserId } from "../../../../hooks/context/UserContext";
// import { Loader } from "lucide-react";
// import SvgLoader from "../../../../components/ui/loader";
// import { useToast } from "../../../../hooks/use-toast";
// import { useParams } from "next/navigation"; // This import remains as 'next/navigation' for Next.js environments


// // Define a type for your product structure for better type safety
// interface Product {
//   srNo: number;
//   description: string;
//   hsn: string;
//   quantity: number | ''; // Allow empty string for initial input
//   rate: number | '';     // Allow empty string for initial input
//   amount: number;
// }

// interface Seller {
//   id: string; // Assuming seller has an ID
//   name?: string;
//   address?: string;
//   gst_no?: string;
//   contact?: string;
//   email?: string;
// }

// // Define the structure for the full invoice data
// interface FullInvoiceData {
//   invoice_date: string;
//   invoice_no: string;

//   client_name: string;
//   client_address: string;
//   client_gstin: string;
//   client_phone: string;

//   products: Product[];
//   gst_percentage: number;

//   sub_total: number;
//   cgst_amount: number;
//   sgst_amount: number;
//   total_gst_amount: number;
//   total_amount: number;

//   challan_date: string;
//   challan_no: string;
//   purchase_date: string;
//   purchase_no: string;
//   vehicle_no: string;
//   buyer_id: string | null; // This will likely come from a selection or be dynamically set
//   seller_id: string | null; // This will come from the current user's seller record
// }


// /**
//  * Converts a number into its English word representation.
//  * Handles numbers up to trillions.
//  * @param num The number to convert.
//  * @returns The word representation of the number, or an empty string if 0.
//  */
// function numberToWords(num: number): string {
//   if (num === 0) return "Zero Rupees Only."; // Show "Zero Rupees Only." for zero

//   const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
//   const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
//   const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
//   const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

//   // Function to convert a number less than 1000 into words
//   function convertLessThanOneThousand(n: number): string {
//     let result = "";
//     if (n >= 100) {
//       result += units[Math.floor(n / 100)] + " Hundred ";
//       n %= 100;
//     }
//     if (n >= 20) {
//       result += tens[Math.floor(n / 10)] + " ";
//       n %= 10;
//     }
//     if (n >= 10) {
//       result += teens[n - 10] + " ";
//       n = 0;
//     }
//     if (n > 0) {
//       result += units[n] + " ";
//     }
//     return result.trim();
//   }

//   let words = "";
//   let i = 0; // Scale index (thousands, millions, etc.)

//   if (num < 0) {
//     words = "Minus ";
//     num = Math.abs(num);
//   }

//   // Handle decimal part
//   const integerPart = Math.floor(num);
//   const decimalPart = Math.round((num - integerPart) * 100); // Get two decimal places

//   let integerWords = "";
//   let tempNum = integerPart;

//   if (tempNum === 0) {
//       integerWords = "Zero";
//   } else {
//       while (tempNum > 0) {
//           const chunk = tempNum % 1000;
//           if (chunk !== 0) {
//               const chunkWords = convertLessThanOneThousand(chunk);
//               integerWords = chunkWords + " " + scales[i] + " " + integerWords;
//           }
//           tempNum = Math.floor(tempNum / 1000);
//           i++;
//       }
//   }

//   words += integerWords.trim();

//   if (decimalPart > 0) {
//       const decimalWords = convertLessThanOneThousand(decimalPart);
//       words += " And " + decimalWords + " Paise";
//   } else {
//       words += " Rupees"; // If no decimal, just say "Rupees"
//   }

//   // Capitalize the first letter of each word and ensure proper spacing
//   words = words.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
//   words = words.replace(/\s+/g, ' '); // Remove extra spaces

//   return words + " Only.";
// }


// export default function Invoice() {
//   const { id } = useParams();
//   const { userId, userSession } = useUserId();
//   const { toast } = useToast();

//   const today = new Date().toISOString().split('T')[0]; //YYYY-MM-DD

//   const [seller, setSeller] = useState<Seller | null>(null);
//   const [creating, setCreating] = useState<boolean>(false);
//   const [loadingInvoice, setLoadingInvoice] = useState<boolean>(true);


//   const [fullInvoiceData, setFullInvoiceData] = useState<FullInvoiceData>({
//     invoice_date: today,
//     invoice_no: "",

//     client_name: "",
//     client_address: "",
//     client_gstin: "",
//     client_phone: "",

//     products: [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
//     gst_percentage: 18,

//     sub_total: 0,
//     cgst_amount: 0,
//     sgst_amount: 0,
//     total_gst_amount: 0,
//     total_amount: 0,

//     challan_date: "",
//     challan_no: "",
//     purchase_date: "",
//     purchase_no: "",
//     vehicle_no: "",
//     buyer_id: null,
//     seller_id: null,
//   });

//   // Effect to fetch seller details based on userId
//   useEffect(() => {
//     if (!userId) return;

//     const checkCompanyInfo = async () => {
//       const { data, error } = await supabase
//         .from("sellers_record")
//         .select("*, id")
//         .eq("user_id", userId)
//         .single();

//       if (error) {
//         console.error("Error fetching company details:", error);
//         // Handle error, maybe show a message or redirect
//       } else if (!data) {
//         window.location.href = "/company_details"; // Redirect if no company details found
//       } else {
//         setSeller(data);
//         setFullInvoiceData(prev => ({ ...prev, seller_id: data.id }));
//       }
//     };

//     checkCompanyInfo();
//   }, [userId]);

//   // Effect to fetch invoice details when an ID is present
//   useEffect(() => {
//     const fetchDetails = async () => {
//       setLoadingInvoice(true);
//       const { data, error } = await supabase
//         .from("invoices_record")
//         .select(`
//           *,
//           buyers_record (*),
//           sellers_record (*),
//           items_record (*)
//         `)
//         .eq("id", id)
//         .single();

//       if (error) {
//         console.error("Error fetching invoice with relations:", error);
//         toast({
//           title: "Error",
//           description: "Failed to load invoice details.",
//           variant: "destructive",
//         });
//       } else if (data) {
//         console.log("Fetched invoice data:", data);

//         // Map fetched data to fullInvoiceData state
//         setFullInvoiceData(prev => ({
//           ...prev,
//           invoice_date: data.invoice_date || today,
//           invoice_no: data.invoice_no || "",
//           challan_date: data.challan_date || "",
//           challan_no: data.challan_no || "",
//           purchase_date: data.purchase_date || "",
//           purchase_no: data.purchase_no || "",
//           vehicle_no: data.vehicle_no || "",
//           buyer_id: data.buyer_id, // This will be the ID from buyers_record
//           seller_id: data.seller_id, // This will be the ID from sellers_record

//           // Client details from buyers_record
//           client_name: data.buyers_record?.name || "",
//           client_address: data.buyers_record?.address || "",
//           client_gstin: data.buyers_record?.gst_no || "",
//           client_phone: data.buyers_record?.phone_no || "",

//           // Products from items_record, ensuring srNo and amount are calculated/mapped
//           products: data.items_record ? data.items_record.map((item: any, idx: number) => ({
//             srNo: idx + 1,
//             description: item.item_name || "",
//             hsn: item.hsn_code || "",
//             quantity: item.qty || '',
//             rate: item.item_rate || '',
//             amount: item.amount || ( (item.qty || 0) * (item.item_rate || 0) ), // Recalculate if amount is not directly available
//           })) : [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],

//           // Calculated totals from invoices_record, or recalculated by useEffect below
//           gst_percentage: data.gst_percentage || 18,
//           sub_total: data.sub_total || 0,
//           cgst_amount: data.cgst_amount || 0,
//           sgst_amount: data.sgst_amount || 0,
//           total_gst_amount: data.total_gst_amount || 0,
//           total_amount: data.total_amount || 0,
//         }));
//       }
//       setLoadingInvoice(false);
//     };

//     if (id) fetchDetails();
//     else setLoadingInvoice(false); // If no ID, no need to load invoice
//   }, [id, toast, today]);


//   // Recalculate totals and update fullInvoiceData on product or GST change
//   useEffect(() => {
//     const calculatedSubTotal = fullInvoiceData.products.reduce((sum, product) => sum + (typeof product.amount === 'number' ? product.amount : 0), 0);
//     const calculatedCgst = (calculatedSubTotal * (fullInvoiceData.gst_percentage / 2)) / 100;
//     const calculatedSgst = (calculatedSubTotal * (fullInvoiceData.gst_percentage / 2)) / 100;
//     const calculatedTotalGst = calculatedCgst + calculatedSgst;
//     const calculatedTotalAmount = calculatedSubTotal + calculatedTotalGst;

//     setFullInvoiceData(prev => ({
//       ...prev,
//       sub_total: calculatedSubTotal,
//       cgst_amount: calculatedCgst,
//       sgst_amount: calculatedSgst,
//       total_gst_amount: calculatedTotalGst,
//       total_amount: calculatedTotalAmount,
//     }));
//   }, [fullInvoiceData.products, fullInvoiceData.gst_percentage]);


//   const totalAmountInWords = useMemo(() => numberToWords(fullInvoiceData.total_amount), [fullInvoiceData.total_amount]);

//   const handleProductChange = (index: number, field: keyof Product, value: any) => {
//     const newProducts = [...fullInvoiceData.products];
//     let parsedValue: string | number = value;

//     if (field === 'quantity' || field === 'rate') {
//       parsedValue = value === '' ? '' : parseFloat(value) || 0;
//     }

//     if (field === 'description' || field === 'hsn') {
//       newProducts[index][field] = parsedValue as string;
//     } else if (field === 'quantity' || field === 'rate') {
//       newProducts[index][field] = parsedValue as number | '';
//     }

//     if (field === 'quantity' || field === 'rate') {
//       const currentQuantity = typeof newProducts[index].quantity === 'number' ? newProducts[index].quantity : 0;
//       const currentRate = typeof newProducts[index].rate === 'number' ? newProducts[index].rate : 0;
//       newProducts[index].amount = currentQuantity * currentRate;
//     }
//     setFullInvoiceData(prev => ({ ...prev, products: newProducts }));
//   };

//   const addProductRow = () => {
//     setFullInvoiceData((prev) => ({
//       ...prev,
//       products: [
//         ...prev.products,
//         {
//           srNo: prev.products.length + 1,
//           description: "",
//           hsn: "",
//           quantity: '',
//           rate: '',
//           amount: 0,
//         },
//       ],
//     }));
//   };

//   const deleteProductRow = (indexToDelete: number) => {
//     setFullInvoiceData((prev) => {
//       const updatedProducts = prev.products.filter((_, index) => index !== indexToDelete);
//       // Re-serialize srNo
//       return {
//         ...prev,
//         products: updatedProducts.map((product, index) => ({
//           ...product,
//           srNo: index + 1,
//         })),
//       };
//     });
//   };

//   const handleInvoiceDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { id, value } = e.target;
//     if (id === "date") {
//       setFullInvoiceData((prev) => ({ ...prev, invoice_date: value }));
//     } else if (id === "invoiceNumber") {
//       setFullInvoiceData((prev) => ({ ...prev, invoice_no: value }));
//     } else if (id === "challan_date") {
//       setFullInvoiceData((prev) => ({ ...prev, challan_date: value }));
//     } else if (id === "challan_no") {
//       setFullInvoiceData((prev) => ({ ...prev, challan_no: value }));
//     } else if (id === "purchase_date") {
//       setFullInvoiceData((prev) => ({ ...prev, purchase_date: value }));
//     } else if (id === "purchase_no") {
//       setFullInvoiceData((prev) => ({ ...prev, purchase_no: value }));
//     } else if (id === "vehicle_no") {
//       setFullInvoiceData((prev) => ({ ...prev, vehicle_no: value }));
//     }
//   };

//   const handleClientDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     const { id, value } = e.target;
//     if (id === "name") {
//       setFullInvoiceData((prev) => ({ ...prev, client_name: value }));
//     } else if (id === "address") {
//       setFullInvoiceData((prev) => ({ ...prev, client_address: value }));
//     } else if (id === "gstin") {
//       setFullInvoiceData((prev) => ({ ...prev, client_gstin: value }));
//     } else if (id === "phone") {
//       setFullInvoiceData((prev) => ({ ...prev, client_phone: value }));
//     }
//   };

//   const handleGstPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFullInvoiceData(prev => ({
//       ...prev,
//       gst_percentage: parseFloat(e.target.value) || 0
//     }));
//   };

//   const handleCreateInvoice = async () => {
//   setCreating(true);
//   const {data:sellerinfo,error}=await supabase.from('sellers_record').select('*').eq("id",fullInvoiceData.seller_id).single()

//   const dataToSend = {
//     challan_date: fullInvoiceData.challan_date || null,
//     challan_no: fullInvoiceData.challan_no || null,
//     invoice_date: fullInvoiceData.invoice_date,
//     invoice_no: fullInvoiceData.invoice_no,
//     purchase_date: fullInvoiceData.purchase_date || null,
//     purchase_no: fullInvoiceData.purchase_no || null,
//     vehicle_no: fullInvoiceData.vehicle_no || null,
//     buyer_id: fullInvoiceData.buyer_id,
//     seller_id: fullInvoiceData.seller_id,

//     products_json: fullInvoiceData.products.map(p => ({
//       description: p.description,
//       hsn: p.hsn,
//       quantity: typeof p.quantity === 'number' ? p.quantity : 0,
//       rate: typeof p.rate === 'number' ? p.rate : 0,
//       amount: p.amount,
//     })),

//     sub_total: fullInvoiceData.sub_total,
//     cgst_amount: fullInvoiceData.cgst_amount,
//     sgst_amount: fullInvoiceData.sgst_amount,
//     total_gst_amount: fullInvoiceData.total_gst_amount,
//     total_amount: fullInvoiceData.total_amount,
//     gst_percentage: fullInvoiceData.gst_percentage,

//     client_name: fullInvoiceData.client_name,
//     client_address: fullInvoiceData.client_address,
//     client_gstin: fullInvoiceData.client_gstin,
//     client_phone: fullInvoiceData.client_phone,

//     // Include seller details from the state
//       seller_name: sellerinfo.name,
//       seller_address: sellerinfo.address,
//       seller_email: sellerinfo.email,
//       seller_gst_no: sellerinfo.gst_no,
//       seller_pan_no: sellerinfo.pan_no,
//       seller_logourl: sellerinfo.logo,
//       seller_sign: sellerinfo.sign,
//       seller_stamp: sellerinfo.stamp,
//       seller_contact: sellerinfo.contact,
//   };

//   console.log("Invoice data to send:", dataToSend);

//   try {
//     const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/edit`, {
//       method: "POST",
//       credentials: "include",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${userSession?.access_token}`,
//       },
//       body: JSON.stringify(dataToSend),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`HTTP error! status: ${response.status} | ${errorText}`);
//     }

//    const result = await response.json();
//     console.log("Invoice edited successfully", result);

//     toast({
//       title: "Invoice Updated ✅",
//       description: `Invoice #${fullInvoiceData.invoice_no} was successfully edited.`,
//     });

//     // ✅ Redirect to the new invoice PDF (same tab)
//     if (result.url) {
//       console.log("PDF URL to redirect:", result.url);
//       window.location.href = result.url;
//     }


//   } catch (error) {
//     console.error("Failed to Edit invoice:", error);
//     toast({
//       title: "Error",
//       description: `Failed to Edit invoice: ${error instanceof Error ? error.message : String(error)}`,
//       variant: "destructive",
//     });
//   } finally {
//     setCreating(false);
//   }
// };


//   if (loadingInvoice) {
//     return (
//       <DashboardLayout>
//         <div className="flex justify-center items-center h-full">
//           <Loader className="animate-spin h-10 w-10 text-blue-500" />
//           <p className="ml-2">Loading Invoice...</p>
//         </div>
//       </DashboardLayout>
//     );
//   }

//   return (
//     <DashboardLayout>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">Edit Bill</h1>
//           <p className="text-muted-foreground">Edit the billing invoice</p>
//         </div>

//         <Card>
//           <CardHeader>
//             <CardTitle>Invoice Details</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="date">Invoice Date</Label>
//                 <Input
//                   id="date"
//                   type="date"
//                   value={fullInvoiceData.invoice_date}
//                   onChange={handleInvoiceDetailChange}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="invoiceNumber">Invoice Number</Label>
//                 <Input
//                   id="invoiceNumber"
//                   value={fullInvoiceData.invoice_no}
//                   onChange={handleInvoiceDetailChange}
//                   placeholder="110/2025-26"
//                   disabled={true} // Disable editing of invoice number
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="challan_date">Challan Date</Label>
//                 <Input
//                   id="challan_date"
//                   type="date"
//                   value={fullInvoiceData.challan_date}
//                   onChange={handleInvoiceDetailChange}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="challan_no">Challan Number</Label>
//                 <Input
//                   id="challan_no"
//                   value={fullInvoiceData.challan_no}
//                   onChange={handleInvoiceDetailChange}
//                   placeholder="CH/2025/001"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="purchase_date">Purchase Date</Label>
//                 <Input
//                   id="purchase_date"
//                   type="date"
//                   value={fullInvoiceData.purchase_date}
//                   onChange={handleInvoiceDetailChange}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="purchase_no">Purchase Order No.</Label>
//                 <Input
//                   id="purchase_no"
//                   value={fullInvoiceData.purchase_no}
//                   onChange={handleInvoiceDetailChange}
//                   placeholder="PO/2025/001"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="vehicle_no">Vehicle Number</Label>
//                 <Input
//                   id="vehicle_no"
//                   value={fullInvoiceData.vehicle_no}
//                   onChange={handleInvoiceDetailChange}
//                   placeholder="MH12AB1234"
//                 />
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Seller Details</CardTitle>
//             <CardDescription>Your company's information</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-2 text-sm">
//             <p className="font-semibold">{seller?.name}</p>
//             <p>Address: {seller?.address}</p>
//             <p>GSTIN: {seller?.gst_no}</p>
//             <p>Contact: {seller?.contact}</p>
//             <p>Email: {seller?.email}</p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Client Details</CardTitle>
//             <CardDescription>Information about the client</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="name">Client Name</Label>
//                 <Input
//                   id="name"
//                   value={fullInvoiceData.client_name}
//                   onChange={handleClientDetailChange}
//                   placeholder="Aatish Pharma Solution"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="gstin">GSTIN</Label>
//                 <Input
//                   id="gstin"
//                   value={fullInvoiceData.client_gstin}
//                   onChange={handleClientDetailChange}
//                   placeholder="27AHQPC7140E1ZF"
//                 />
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="address">Address</Label>
//               <Textarea
//                 id="address"
//                 value={fullInvoiceData.client_address}
//                 onChange={handleClientDetailChange}
//                 placeholder="GRD Floor, Gala No. 15 Parmar Estate, Vasai phata, Vasai Virar, Palghar, Maharashtra, 401203"
//               />
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="phone">Phone</Label>
//                 <Input
//                   id="phone"
//                   value={fullInvoiceData.client_phone}
//                   onChange={handleClientDetailChange}
//                   placeholder="+91 9165878123"
//                 />
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Products/Services</CardTitle>
//             <CardDescription>Add the items to be billed</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="border-b">
//                     <th className="p-2 text-left">Sr. No.</th>
//                     <th className="p-2 text-left">Description</th>
//                     <th className="p-2 text-left">HSN</th>
//                     <th className="p-2 text-left">Quantity</th>
//                     <th className="p-2 text-left">Rate</th>
//                     <th className="p-2 text-right">Amount</th>
//                     <th className="p-2 text-center" style={{ width: '40px' }}></th> {/* Column for delete button */}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {fullInvoiceData.products.map((product, index) => (
//                     <tr key={index} className="border-b last:border-b-0">
//                       <td className="p-2">{product.srNo}</td>
//                       <td className="p-2">
//                         <Textarea
//                           value={product.description}
//                           onChange={(e) => handleProductChange(index, "description", e.target.value)}
//                           placeholder="Product description"
//                           rows={1}
//                         />
//                       </td>
//                       <td className="p-2">
//                         <Input
//                           value={product.hsn}
//                           onChange={(e) => handleProductChange(index, "hsn", e.target.value)}
//                           placeholder="HSN"
//                         />
//                       </td>
//                       <td className="p-2">
//                         <Input
//                           type="number"
//                           value={product.quantity}
//                           onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
//                           placeholder=""
//                           min="0"
//                           required
//                         />
//                       </td>
//                       <td className="p-2">
//                         <Input
//                           type="number"
//                           value={product.rate}
//                           onChange={(e) => handleProductChange(index, "rate", e.target.value)}
//                           placeholder=""
//                           min="0"
//                           step="0.01"
//                           required
//                         />
//                       </td>
//                       <td className="p-2 text-right">{(product.amount || 0).toFixed(2)}</td>
//                       <td className="p-2 text-center">
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={() => deleteProductRow(index)}
//                           className="p-1 h-auto"
//                         >
//                           X
//                         </Button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//             <Button onClick={addProductRow} className="mt-2">
//               + Add Product
//             </Button>

//             <div className="flex justify-end gap-4 mt-4">
//               <div className="w-1/2 space-y-2">
//                 <div className="flex justify-between">
//                   <Label htmlFor="gstPercent">GST %</Label>
//                   <Input
//                     id="gstPercent"
//                     type="number"
//                     value={fullInvoiceData.gst_percentage}
//                     onChange={handleGstPercentageChange}
//                     className="w-24 text-right"
//                     min="0"
//                     step="0.1"
//                   />
//                 </div>
//                 <div className="flex justify-between font-semibold">
//                   <span>Sub Total:</span>
//                   <span>₹ {fullInvoiceData.sub_total.toFixed(2)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span>CGST ({fullInvoiceData.gst_percentage/2}%):</span>
//                   <span>₹ {fullInvoiceData.cgst_amount.toFixed(2)}</span>
//                 </div>
//                 <div className="flex justify-between text-sm">
//                   <span>SGST ({fullInvoiceData.gst_percentage/2}%):</span>
//                   <span>₹ {fullInvoiceData.sgst_amount.toFixed(2)}</span>
//                 </div>
//                 <div className="flex justify-between font-bold border-t pt-2">
//                   <span>Total GST:</span>
//                   <span>₹ {fullInvoiceData.total_gst_amount.toFixed(2)}</span>
//                 </div>
//                 <div className="flex justify-between text-xl font-bold border-t pt-2">
//                   <span>Total Amount:</span>
//                   <span>₹ {fullInvoiceData.total_amount.toFixed(2)}</span>
//                 </div>
//                 {fullInvoiceData.total_amount > 0 && (
//                   <div className="text-sm text-muted-foreground mt-2">
//                     <p>{totalAmountInWords}</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Bank Details</CardTitle>
//             <CardDescription>Your company's bank information</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-2 text-sm">
//             <p><span className="font-semibold">Bank Name:</span> HDFC BANK</p>
//             <p><span className="font-semibold">Bank A/C No.:</span> 50200097548910</p>
//             <p><span className="font-semibold">IFSC Code:</span> HDFC0008178</p>
//             <p><span className="font-semibold">Branch:</span> Vasai E, Sativali</p>
//           </CardContent>
//         </Card>

//         <div className="flex gap-2">
//           <Button onClick={handleCreateInvoice} disabled={creating}>
//             {creating ? <SvgLoader /> : "Edit Invoice"}
//           </Button>
//           {/* <Button variant="outline">Save as Draft</Button>
//           <Button variant="outline">Select Template</Button> */}
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// }



"use client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { useUserId } from "../../../../hooks/context/UserContext";
import { Loader, FileText, User, Building, Banknote, Trash2, PlusCircle, Save } from "lucide-react";
import { Skeleton } from "../../../../components/ui/skeleton";
import { useToast } from "../../../../hooks/use-toast";
import { useParams } from "next/navigation";

// --- TYPE DEFINITIONS (No changes) ---
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
  pan_no?: string;
  logo?: string;
  sign?: string;
  stamp?: string;
}

interface FullInvoiceData {
  invoice_date: string;
  invoice_no: string;
  client_name: string;
  client_address: string;
  client_gstin: string;
  client_phone: string;
  products: Product[];
  gst_percentage: number;
  sub_total: number;
  cgst_amount: number;
  sgst_amount: number;
  total_gst_amount: number;
  total_amount: number;
  challan_date: string;
  challan_no: string;
  purchase_date: string;
  purchase_no: string;
  vehicle_no: string;
  buyer_id: string | null;
  seller_id: string | null;
}

// --- HELPER FUNCTION (No changes) ---
function numberToWords(num: number): string {
    if (num === 0) return "Zero Rupees Only.";
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

    function convertLessThanOneThousand(n: number): string {
        let result = "";
        if (n >= 100) {
            result += units[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + " ";
            n %= 10;
        }
        if (n >= 10) {
            result += teens[n - 10] + " ";
            n = 0;
        }
        if (n > 0) {
            result += units[n] + " ";
        }
        return result.trim();
    }

    let words = "";
    let i = 0;
    if (num < 0) {
        words = "Minus ";
        num = Math.abs(num);
    }
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    let integerWords = "";
    let tempNum = integerPart;

    if (tempNum === 0) {
        integerWords = "Zero";
    } else {
        while (tempNum > 0) {
            const chunk = tempNum % 1000;
            if (chunk !== 0) {
                const chunkWords = convertLessThanOneThousand(chunk);
                integerWords = chunkWords + " " + scales[i] + " " + integerWords;
            }
            tempNum = Math.floor(tempNum / 1000);
            i++;
        }
    }
    words += integerWords.trim();
    if (decimalPart > 0) {
        const decimalWords = convertLessThanOneThousand(decimalPart);
        words += " And " + decimalWords + " Paise";
    } else {
        words += " Rupees";
    }
    words = words.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    words = words.replace(/\s+/g, ' ');
    return words + " Only.";
}


// --- UI SUB-COMPONENTS for better structure and readability ---

const PageHeader = () => (
    <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Bill</h1>
        <p className="text-muted-foreground">Modify the details of the billing invoice below.</p>
    </div>
);

const FormSectionCard = ({ title, description, icon, children }: { title: string, description?: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="grid gap-1">
                <CardTitle className="flex items-center">
                    {icon}
                    <span className="ml-2">{title}</span>
                </CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
    </Card>
);

const LoadingSkeleton = () => (
    <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    </div>
);


// --- MAIN INVOICE EDIT COMPONENT ---
export default function InvoiceEditPage() {
    const { id } = useParams();
    const { userId, userSession } = useUserId();
    const { toast } = useToast();

    const today = new Date().toISOString().split('T')[0];

    const [seller, setSeller] = useState<Seller | null>(null);
    const [creating, setCreating] = useState<boolean>(false);
    const [loadingInvoice, setLoadingInvoice] = useState<boolean>(true);

    const [fullInvoiceData, setFullInvoiceData] = useState<FullInvoiceData>({
        invoice_date: today,
        invoice_no: "",
        client_name: "",
        client_address: "",
        client_gstin: "",
        client_phone: "",
        products: [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
        gst_percentage: 18,
        sub_total: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        total_gst_amount: 0,
        total_amount: 0,
        challan_date: "",
        challan_no: "",
        purchase_date: "",
        purchase_no: "",
        vehicle_no: "",
        buyer_id: null,
        seller_id: null,
    });

    // --- DATA FETCHING & LOGIC (No changes to functionality) ---
    useEffect(() => {
        if (!userId) return;
        const checkCompanyInfo = async () => {
            const { data, error } = await supabase.from("sellers_record").select("*, id").eq("user_id", userId).single();
            if (error) {
                console.error("Error fetching company details:", error);
            } else if (!data) {
                window.location.href = "/company_details";
            } else {
                setSeller(data);
                setFullInvoiceData(prev => ({ ...prev, seller_id: data.id }));
            }
        };
        checkCompanyInfo();
    }, [userId]);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoadingInvoice(true);
            const { data, error } = await supabase.from("invoices_record").select(`*, buyers_record (*), sellers_record (*), items_record (*)`).eq("id", id).single();
            if (error) {
                console.error("Error fetching invoice:", error);
                toast({ title: "Error", description: "Failed to load invoice details.", variant: "destructive" });
            } else if (data) {
                setFullInvoiceData(prev => ({
                    ...prev,
                    invoice_date: data.invoice_date || today,
                    invoice_no: data.invoice_no || "",
                    challan_date: data.challan_date || "",
                    challan_no: data.challan_no || "",
                    purchase_date: data.purchase_date || "",
                    purchase_no: data.purchase_no || "",
                    vehicle_no: data.vehicle_no || "",
                    buyer_id: data.buyer_id,
                    seller_id: data.seller_id,
                    client_name: data.buyers_record?.name || "",
                    client_address: data.buyers_record?.address || "",
                    client_gstin: data.buyers_record?.gst_no || "",
                    client_phone: data.buyers_record?.phone_no || "",
                    products: data.items_record ? data.items_record.map((item: any, idx: number) => ({
                        srNo: idx + 1,
                        description: item.item_name || "",
                        hsn: item.hsn_code || "",
                        quantity: item.qty || '',
                        rate: item.item_rate || '',
                        amount: item.amount || ((item.qty || 0) * (item.item_rate || 0)),
                    })) : [{ srNo: 1, description: "", hsn: "", quantity: '', rate: '', amount: 0 }],
                    gst_percentage: data.gst_percentage || 18,
                    sub_total: data.sub_total || 0,
                    cgst_amount: data.cgst_amount || 0,
                    sgst_amount: data.sgst_amount || 0,
                    total_gst_amount: data.total_gst_amount || 0,
                    total_amount: data.total_amount || 0,
                }));
            }
            setLoadingInvoice(false);
        };
        if (id) fetchDetails();
        else setLoadingInvoice(false);
    }, [id, toast, today]);

    useEffect(() => {
        const calculatedSubTotal = fullInvoiceData.products.reduce((sum, product) => sum + (typeof product.amount === 'number' ? product.amount : 0), 0);
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

    const deleteProductRow = (indexToDelete: number) => {
        setFullInvoiceData((prev) => {
            const updatedProducts = prev.products.filter((_, index) => index !== indexToDelete);
            return { ...prev, products: updatedProducts.map((product, index) => ({ ...product, srNo: index + 1 })) };
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFullInvoiceData(prev => ({ ...prev, [id]: value }));
    };

    const handleGstPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFullInvoiceData(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 0 }));
    };

    const handleUpdateInvoice = async () => {
        setCreating(true);
        const { data: sellerinfo } = await supabase.from('sellers_record').select('*').eq("id", fullInvoiceData.seller_id).single();
        const dataToSend = {
            challan_date: fullInvoiceData.challan_date || null,
            challan_no: fullInvoiceData.challan_no || null,
            invoice_date: fullInvoiceData.invoice_date,
            invoice_no: fullInvoiceData.invoice_no,
            purchase_date: fullInvoiceData.purchase_date || null,
            purchase_no: fullInvoiceData.purchase_no || null,
            vehicle_no: fullInvoiceData.vehicle_no || null,
            buyer_id: fullInvoiceData.buyer_id,
            seller_id: fullInvoiceData.seller_id,
            products_json: fullInvoiceData.products.map(p => ({
                description: p.description,
                hsn: p.hsn,
                quantity: typeof p.quantity === 'number' ? p.quantity : 0,
                rate: typeof p.rate === 'number' ? p.rate : 0,
                amount: p.amount,
            })),
            sub_total: fullInvoiceData.sub_total,
            cgst_amount: fullInvoiceData.cgst_amount,
            sgst_amount: fullInvoiceData.sgst_amount,
            total_gst_amount: fullInvoiceData.total_gst_amount,
            total_amount: fullInvoiceData.total_amount,
            gst_percentage: fullInvoiceData.gst_percentage,
            client_name: fullInvoiceData.client_name,
            client_address: fullInvoiceData.client_address,
            client_gstin: fullInvoiceData.client_gstin,
            client_phone: fullInvoiceData.client_phone,
            seller_name: sellerinfo?.name,
            seller_address: sellerinfo?.address,
            seller_email: sellerinfo?.email,
            seller_gst_no: sellerinfo?.gst_no,
            seller_pan_no: sellerinfo?.pan_no,
            seller_logourl: sellerinfo?.logo,
            seller_sign: sellerinfo?.sign,
            seller_stamp: sellerinfo?.stamp,
            seller_contact: sellerinfo?.contact,
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/edit`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
                body: JSON.stringify(dataToSend),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} | ${errorText}`);
            }
            const result = await response.json();
            toast({ title: "Invoice Updated ✅", description: `Invoice #${fullInvoiceData.invoice_no} was successfully edited.` });
            if (result.url) window.location.href = result.url;
        } catch (error) {
            console.error("Failed to Edit invoice:", error);
            toast({ title: "Error", description: `Failed to Edit invoice: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    if (loadingInvoice) {
        return <DashboardLayout><LoadingSkeleton /></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 pb-24"> {/* Padding bottom for sticky footer */}
                <PageHeader />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <FormSectionCard title="Client Details" icon={<User size={20} />}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label htmlFor="client_name">Client Name</Label><Input id="client_name" value={fullInvoiceData.client_name} onChange={handleInputChange} placeholder="Aatish Pharma Solution" /></div>
                                    <div className="space-y-1.5"><Label htmlFor="client_gstin">GSTIN</Label><Input id="client_gstin" value={fullInvoiceData.client_gstin} onChange={handleInputChange} placeholder="27AHQPC7140E1ZF" /></div>
                                </div>
                                <div className="space-y-1.5"><Label htmlFor="client_address">Address</Label><Textarea id="client_address" value={fullInvoiceData.client_address} onChange={handleInputChange} placeholder="Client's full address" /></div>
                                <div className="space-y-1.5"><Label htmlFor="client_phone">Phone</Label><Input id="client_phone" value={fullInvoiceData.client_phone} onChange={handleInputChange} placeholder="+91 9165878123" /></div>
                            </div>
                        </FormSectionCard>

                        <FormSectionCard title="Products / Services" icon={<FileText size={20} />}>
                            {/* --- DESKTOP TABLE --- */}
                            <div className="hidden md:block">
                                <table className="w-full text-sm">
                                    <colgroup>
                                        <col style={{ width: '5%' }} />
                                        <col style={{ width: '30%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
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
                            {/* --- MOBILE CARDS --- */}
                            <div className="block md:hidden space-y-4">
                                {fullInvoiceData.products.map((p, i) => (
                                    <div key={i} className="border rounded-lg p-4 space-y-3 relative">
                                        <p className="font-bold">Item #{p.srNo}</p>
                                        <div className="space-y-1.5"><Label>Description</Label><Textarea value={p.description} onChange={(e) => handleProductChange(i, "description", e.target.value)} placeholder="Product description" rows={2} /></div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <div className="space-y-1.5 col-span-2"><Label>HSN</Label><Input value={p.hsn} onChange={(e) => handleProductChange(i, "hsn", e.target.value)} placeholder="HSN" /></div>
                                            <div className="space-y-1.5 col-span-3"><Label>Quantity</Label><Input type="number" value={p.quantity} onChange={(e) => handleProductChange(i, "quantity", e.target.value)} placeholder="0" /></div>
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <div className="space-y-1.5 col-span-3"><Label>Rate</Label><Input type="number" value={p.rate} onChange={(e) => handleProductChange(i, "rate", e.target.value)} placeholder="0.00" /></div>
                                            <div className="space-y-1.5 col-span-2"><Label>Amount</Label><p className="font-medium h-10 flex items-center">₹{(p.amount || 0).toFixed(2)}</p></div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => deleteProductRow(i)}><Trash2 size={16} /></Button>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={addProductRow} className="mt-4" variant="outline"><PlusCircle size={16} className="mr-2" />Add Item</Button>
                        </FormSectionCard>
                    </div>

                    {/* Side Content */}
                    <div className="lg:col-span-1 space-y-6">
                        <FormSectionCard title="Invoice Meta" icon={<FileText size={20} />}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="invoice_date">Invoice Date</Label><Input id="invoice_date" type="date" value={fullInvoiceData.invoice_date} onChange={handleInputChange} /></div><div className="space-y-1.5"><Label htmlFor="invoice_no">Invoice No.</Label><Input id="invoice_no" value={fullInvoiceData.invoice_no} onChange={handleInputChange} placeholder="e.g., 001/24-25" disabled /></div></div>
                                <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="challan_date">Challan Date</Label><Input id="challan_date" type="date" value={fullInvoiceData.challan_date} onChange={handleInputChange} /></div><div className="space-y-1.5"><Label htmlFor="challan_no">Challan No.</Label><Input id="challan_no" value={fullInvoiceData.challan_no} onChange={handleInputChange} /></div></div>
                                <div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label htmlFor="purchase_date">P.O. Date</Label><Input id="purchase_date" type="date" value={fullInvoiceData.purchase_date} onChange={handleInputChange} /></div><div className="space-y-1.5"><Label htmlFor="purchase_no">P.O. No.</Label><Input id="purchase_no" value={fullInvoiceData.purchase_no} onChange={handleInputChange} /></div></div>
                                <div className="space-y-1.5"><Label htmlFor="vehicle_no">Vehicle No.</Label><Input id="vehicle_no" value={fullInvoiceData.vehicle_no} onChange={handleInputChange} /></div>
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

                        <FormSectionCard title="Seller Details" icon={<Building size={20} />}>
                            {seller ? <div className="space-y-1 text-sm text-muted-foreground"><p className="font-semibold text-primary">{seller.name}</p><p>{seller.address}</p><p>GST: {seller.gst_no}</p></div> : <p>Loading seller info...</p>}
                        </FormSectionCard>

                        <FormSectionCard title="Bank Details" icon={<Banknote size={20} />}>
                            <div className="space-y-1 text-sm text-muted-foreground"><p><span className="font-semibold text-primary">Bank:</span> HDFC BANK</p><p><span className="font-semibold text-primary">A/C No:</span> 50200097548910</p><p><span className="font-semibold text-primary">IFSC:</span> HDFC0008178</p></div>
                        </FormSectionCard>
                    </div>
                </div>
            </div>

            {/* Sticky Footer for Actions */}
            <div className="sticky bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-t">
                <div className="container flex items-center justify-end h-16 px-4 md:px-6 gap-4">
                    <Button onClick={handleUpdateInvoice} disabled={creating} size="lg">
                        {creating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Update Invoice
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}

