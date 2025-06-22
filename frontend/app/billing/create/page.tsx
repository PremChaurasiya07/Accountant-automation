// import { DashboardLayout } from "@/components/dashboard-layout"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"

// export default function CreateBilling() {
//   return (
//     <DashboardLayout>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight">Create Billing</h1>
//           <p className="text-muted-foreground">Create a new billing invoice</p>
//         </div>

//         <Card>
//           <CardHeader>
//             <CardTitle>Invoice Details</CardTitle>
//             <CardDescription>Fill in the details for the new invoice</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="client">Client Name</Label>
//                 <Input id="client" placeholder="Enter client name" />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="amount">Amount</Label>
//                 <Input id="amount" type="number" placeholder="0.00" />
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="description">Description</Label>
//               <Textarea id="description" placeholder="Invoice description" />
//             </div>
//             <div className="flex gap-2">
//               <Button>Create Invoice</Button>
//               <Button variant="outline">Save as Draft</Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </DashboardLayout>
//   )
// }

'use client'
import { useState, useEffect } from "react";
import Invoice from "@/components/invoice";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/hooks/context/UserContext";
export default function CreateBilling(){
  const router=useRouter()
  const {userId}= useUserId()

  useEffect(() => {
    const checkCompanyInfo = async () => {

      if (!userId) {
        console.error("User not logged in");
        return;
      }
            // Simulate a check for company info
      const { data, error } = await supabase
        .from('sellers_record')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.log("No company info found:", error);
        router.push("/company_details")
      }
    };
    checkCompanyInfo();
    
  }, [])
  return <Invoice />;
}