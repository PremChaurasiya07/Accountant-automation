"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserId } from "@/hooks/context/UserContext"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function CompanyInfoForm() {
  const { userId } = useUserId()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)

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
  })

  const [previews, setPreviews] = useState({
    logo: "",
    signature: "",
    stamp: "",
  })

  useEffect(() => {
    if (!userId) return

    const fetchSellerData = async () => {
      try {
        const { data, error } = await supabase
          .from("sellers_record")
          .select("*")
          .eq("user_id", userId)
          .single()

        if (error || !data) return

        setIsUpdate(true)
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
        }))

        const parseAndSetPreview = (field: "logo" | "signature" | "stamp", value: string) => {
          try {
            const parsed = JSON.parse(value)
            if (parsed?.url) {
              setPreviews(prev => ({ ...prev, [field]: parsed.url }))
            }
          } catch {}
        }

        if (data.logo) parseAndSetPreview("logo", data.logo)
        if (data.signature) parseAndSetPreview("signature", data.signature)
        if (data.stamp) parseAndSetPreview("stamp", data.stamp)

      } catch (err) {
        console.error("Failed to fetch seller info:", err)
      }
    }

    fetchSellerData()
  }, [userId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files[0]) {
      const file = files[0]
      setFormData(prev => ({ ...prev, [name]: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [name]: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toast({ title: "Error", description: "User not logged in", variant: "destructive" })
      return
    }

    setLoading(true)

    const form = new FormData()
    form.append("token", userId)
    form.append("company_name", formData.companyName)
    form.append("address", formData.address)
    form.append("gstin", formData.gstin)
    form.append("contact", formData.contact)
    form.append("email", formData.email)
    form.append("bank_name", formData.bankName)
    form.append("account_no", formData.accountNo)
    form.append("ifsc_code", formData.ifscCode)
    if (formData.logo) form.append("logo", formData.logo)
    if (formData.signature) form.append("signature", formData.signature)
    if (formData.stamp) form.append("stamp", formData.stamp)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoice/seller${isUpdate ? "/update" : ""}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      })

      const result = await res.json()

      if (res.ok) {
        toast({ title: "Success", description: isUpdate ? "Updated successfully" : "Saved successfully" })
        router.push("/billing/create")
      } else {
        toast({
          title: "Failed",
          description: result.detail || "Try again later.",
          variant: "destructive"
        })
      }

    } catch (err) {
      console.error("Error:", err)
      toast({
        title: "Server error",
        description: "Something went wrong while saving.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-xl rounded-2xl border bg-background">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Seller Details</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your company's information</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                name="companyName"
                required
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g., HINDUJA PHARMA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Company address..."
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="e.g., 28AHNPC6120F1ZJ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Numbers</Label>
                <Input
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="e.g., 7806164180"
                />
              </div>
              <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g., company@email.com"
              />
            </div>
            </div>

            

            <div className="grid md:grid-cols-3 gap-4">
              {["logo", "signature", "stamp"].map(type => (
                <div className="space-y-2" key={type}>
                  <Label htmlFor={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</Label>
                  <Input
                    id={type}
                    name={type}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {previews[type as keyof typeof previews] && (
                    <img
                      src={previews[type as keyof typeof previews]}
                      alt={`${type} preview`}
                      className="mt-2 w-24 h-24 object-contain border rounded-md"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2 ">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="e.g., HDFC Bank"
              />
              </div>
              <div className="space-y-2 ">
              <Label htmlFor="accountNo">A/c Number</Label>
              <Input
                id="accountNo"
                name="accountNo"
                value={formData.accountNo}
                onChange={handleChange}
                placeholder="e.g., 1234567890"
              />
              </div>
              <div className="space-y-2 ">
              <Label htmlFor="ifscCode">Branch & IFSC Code</Label>
              <Input
                id="ifscCode"
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="e.g., HDFC0001234"
              />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isUpdate ? "Updating..." : "Saving...") : (isUpdate ? "Update Info" : "Save Info")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
