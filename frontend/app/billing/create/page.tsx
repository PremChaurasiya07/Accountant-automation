

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