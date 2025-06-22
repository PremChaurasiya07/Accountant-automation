'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUserId } from '@/hooks/context/UserContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast' // 👈 import from shadcn

export default function CompanyInfoForm() {
  const { userId } = useUserId()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    gstin: '',
    contact: '',
    email: '',
    logo: null as File | null,
    signature: null as File | null,
    stamp: null as File | null,
  })

  const [previews, setPreviews] = useState({
    logo: '',
    signature: '',
    stamp: '',
  })

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
    if (formData.logo) form.append("logo", formData.logo)
    if (formData.signature) form.append("signature", formData.signature)
    if (formData.stamp) form.append("stamp", formData.stamp)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch("http://localhost:8000/invoice/seller", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: form,
      })

      const data = await res.json()

      if (res.ok) {
        toast({ title: "Saved", description: "Company info saved successfully" })
        router.push("/billing/create")
      } else {
        toast({
          title: "Failed to save company info",
          description: data.detail || "Please try again later.",
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

            <div className="grid md:grid-cols-2 gap-4">
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

            <div className="grid md:grid-cols-3 gap-4">
              {['logo', 'signature', 'stamp'].map(type => (
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Company Info"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
