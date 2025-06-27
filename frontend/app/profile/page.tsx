"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { useUserId } from "@/hooks/context/UserContext"
import { useToast } from "@/components/ui/use-toast"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import { Loader2 } from "lucide-react"

interface SellerData {
  name: string
  gst_no: string
  contact: string
  email: string
  address: string
  logo: string
  pan_no: string
  bank_name: string
  ifsc_code: string
  account_no: string
}

export default function SellerProfile() {
  const router = useRouter()
  const { userId } = useUserId()
  const { toast } = useToast()

  const [profile, setProfile] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!userId) return

    const fetchSeller = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("sellers_record")
          .select("*")
          .eq("user_id", userId)
          .single()

        if (error) throw error
        setProfile(data)

      } catch (err: any) {
        console.error(err)
        setError("Profile not found.")
      } finally {
        setLoading(false)
      }
    }

    fetchSeller()
  }, [userId])

  const handleEdit = () => {
    router.push("/company_details")
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`{process.env.NEXT_PUBLIC_API_BASE_URL}/delete-user`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (res.ok) {
        toast({ title: "Account Deleted", description: "Redirecting to login..." })
        router.push("/login")
      } else {
        throw new Error("No profile created")
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Error deleting account",
        description: "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const getLogoUrl = () => {
    try {
      return profile?.logo ? JSON.parse(profile.logo)?.url : "/default-avatar.png"
    } catch {
      return "/default-avatar.png"
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="rounded-2xl shadow-lg border border-border bg-card">
        <CardContent className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 p-6">
          <div className="flex justify-center sm:justify-start w-full sm:w-auto">
            <img
              src={getLogoUrl()}
              alt=""
              className="w-32 h-32 rounded-full object-cover border-4 border-primary"
            />
          </div>

          <div className="flex-1 w-full space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : profile ? (
              <>
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <Input value={profile.name} readOnly className="bg-muted cursor-default" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">GST Number</Label>
                    <Input value={profile.gst_no} readOnly className="bg-muted cursor-default" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <Input value={profile.contact} readOnly className="bg-muted cursor-default" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <Input value={profile.email} readOnly className="bg-muted cursor-default" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <Input value={profile.address} readOnly className="bg-muted cursor-default" />
                  </div>
                </div>

                <div className="pt-6 border-t mt-4">
                  <Label className="text-muted-foreground">Account Details</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div>
                    <Label className="text-muted-foreground">Bank Name</Label>
                    <Input value={profile.bank_name ?? ""} readOnly className="bg-muted text-xs cursor-default" />
                    </div>
                    <div>
                    <Label className="text-muted-foreground">Bank A/C</Label>
                    <Input value={profile.account_no ?? ""} readOnly className="bg-muted text-xs cursor-default" />
                    </div>
                    <div>
                    <Label className="text-muted-foreground">IFSC code</Label>
                    <Input value={profile.ifsc_code ?? ""} readOnly className="bg-muted text-xs cursor-default" />
                  </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6">
                  <Button onClick={handleEdit}>Edit Profile</Button>
                  <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
                    {deleting?<Loader2/>:"Delete Account"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-red-500">{error || "No profile found"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        loading={deleting}
      />
    </div>
  )
}
