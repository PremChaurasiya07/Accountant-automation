// "use client"

// import { useEffect, useState } from "react"
// import { Card, CardContent } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Skeleton } from "@/components/ui/skeleton"
// import { useRouter } from "next/navigation"

// import { supabase } from "@/lib/supabase"
// import { useUserId } from "@/hooks/context/UserContext"
// import { useToast } from "@/components/ui/use-toast"
// import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
// import { Loader2 } from "lucide-react"

// interface SellerData {
//   name: string
//   gst_no: string
//   contact: string
//   email: string
//   address: string
//   logo: string
//   pan_no: string
//   bank_name: string
//   ifsc_code: string
//   account_no: string
// }

// export default function SellerProfile() {
//   const router = useRouter()
//   const { userId } = useUserId()
//   const { toast } = useToast()

//   const [profile, setProfile] = useState<SellerData | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState("")
//   const [userEmail, setUserEmail] = useState<string | null>(null)
//   const [showDeleteModal, setShowDeleteModal] = useState(false)
//   const [deleting, setDeleting] = useState(false)

//   useEffect(() => {
//     if (!userId) return

//     const fetchSeller = async () => {
//       try {
//         setLoading(true)

//         const { data, error } = await supabase
//           .from("sellers_record")
//           .select("*")
//           .eq("user_id", userId)
//           .single()

//         if (error) throw error
//         setProfile(data)

//       } catch (err: any) {
//         console.error(err)
//         setError("Profile not found.")
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchSeller()
//   }, [userId])

//   const handleEdit = () => {
//     router.push("/company_details")
//   }

//   const handleDeleteAccount = async () => {
//     setDeleting(true)

//     try {
//       const { data: { session } } = await supabase.auth.getSession()

//       const res = await fetch(`{process.env.NEXT_PUBLIC_API_BASE_URL}/delete-user`, {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${session?.access_token}`,
//         },
//       })

//       if (res.ok) {
//         toast({ title: "Account Deleted", description: "Redirecting to login..." })
//         router.push("/login")
//       } else {
//         throw new Error("No profile created")
//       }
//     } catch (err) {
//       console.error(err)
//       toast({
//         title: "Error deleting account",
//         description: "Something went wrong.",
//         variant: "destructive",
//       })
//     } finally {
//       setDeleting(false)
//       setShowDeleteModal(false)
//     }
//   }

//   const getLogoUrl = () => {
//     try {
//       return profile?.logo ? JSON.parse(profile.logo)?.url : "/default-avatar.png"
//     } catch {
//       return "/default-avatar.png"
//     }
//   }

//   return (
//     <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
//       <Card className="rounded-2xl shadow-lg border border-border bg-card">
//         <CardContent className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 p-6">
//           <div className="flex justify-center sm:justify-start w-full sm:w-auto">
//             <img
//               src={getLogoUrl()}
//               alt=""
//               className="w-32 h-32 rounded-full object-cover border-4 border-primary"
//             />
//           </div>

//           <div className="flex-1 w-full space-y-4">
//             {loading ? (
//               <>
//                 <Skeleton className="h-10 w-full" />
//                 <Skeleton className="h-10 w-full" />
//                 <Skeleton className="h-10 w-full" />
//                 <Skeleton className="h-10 w-full" />
//               </>
//             ) : profile ? (
//               <>
//                 <div>
//                   <Label className="text-muted-foreground">Name</Label>
//                   <Input value={profile.name} readOnly className="bg-muted cursor-default" />
//                 </div>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <Label className="text-muted-foreground">GST Number</Label>
//                     <Input value={profile.gst_no} readOnly className="bg-muted cursor-default" />
//                   </div>
//                   <div>
//                     <Label className="text-muted-foreground">Phone</Label>
//                     <Input value={profile.contact} readOnly className="bg-muted cursor-default" />
//                   </div>
//                   <div className="sm:col-span-2">
//                     <Label className="text-muted-foreground">Email</Label>
//                     <Input value={profile.email} readOnly className="bg-muted cursor-default" />
//                   </div>
//                   <div className="sm:col-span-2">
//                     <Label className="text-muted-foreground">Address</Label>
//                     <Input value={profile.address} readOnly className="bg-muted cursor-default" />
//                   </div>
//                 </div>

//                 <div className="pt-6 border-t mt-4">
//                   <Label className="text-muted-foreground">Account Details</Label>
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
//                     <div>
//                     <Label className="text-muted-foreground">Bank Name</Label>
//                     <Input value={profile.bank_name ?? ""} readOnly className="bg-muted text-xs cursor-default" />
//                     </div>
//                     <div>
//                     <Label className="text-muted-foreground">Bank A/C</Label>
//                     <Input value={profile.account_no ?? ""} readOnly className="bg-muted text-xs cursor-default" />
//                     </div>
//                     <div>
//                     <Label className="text-muted-foreground">IFSC code</Label>
//                     <Input value={profile.ifsc_code ?? ""} readOnly className="bg-muted text-xs cursor-default" />
//                   </div>
//                   </div>
//                 </div>

//                 <div className="flex justify-between items-center pt-6">
//                   <Button onClick={handleEdit}>Edit Profile</Button>
//                   <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
//                     {deleting?<Loader2/>:"Delete Account"}
//                   </Button>
//                 </div>
//               </>
//             ) : (
//               <p className="text-red-500">{error || "No profile found"}</p>
//             )}
//           </div>
//         </CardContent>
//       </Card>

//       <DeleteConfirmationModal
//         open={showDeleteModal}
//         onClose={() => setShowDeleteModal(false)}
//         onConfirm={handleDeleteAccount}
//         loading={deleting}
//       />
//     </div>
//   )
// }


"use client"

import { useEffect, useState, ComponentType } from "react"
import { useRouter } from "next/navigation"

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"

// --- Icons ---
import {
  Loader2,
  Copy,
  Check,
  User,
  Mail,
  Phone,
  Building,
  Landmark,
  ShieldCheck,
  Banknote,
  KeyRound,
  LogOut,
  Edit,
  Trash2,
  AlertCircle,
} from "lucide-react"

// --- Project Imports ---
import { supabase } from "@/lib/supabase"
import { useUserId } from "@/hooks/context/UserContext"

// --- Interfaces ---
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

// --- Reusable Detail Row Component ---
// This component makes the main layout much cleaner and adds copy functionality.
const ProfileDetailRow = ({
  icon: Icon,
  label,
  value,
  isCopyable = false,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value?: string | null
  isCopyable?: boolean
}) => {
  const [hasCopied, setHasCopied] = useState(false)
  const { toast } = useToast()

  const onCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value)
      setHasCopied(true)
      toast({ title: "Copied to clipboard!", className: "bg-green-500 text-white" })
      setTimeout(() => setHasCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center text-sm text-muted-foreground">
        <Icon className="mr-2 h-4 w-4" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <p className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono tracking-tight">
          {value || "Not Provided"}
        </p>
        {isCopyable && value && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onCopy}>
                  {hasCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

// --- Main Profile Component ---
export default function SellerProfile() {
  const router = useRouter()
  const { userId } = useUserId()
  const { toast } = useToast()

  const [profile, setProfile] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
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

        if (error) throw new Error("Profile not found or connection issue.")
        setProfile(data)
      } catch (err: any) {
        console.error("Fetch profile error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSeller()
  }, [userId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/delete-user`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!res.ok) throw new Error("Failed to delete account from server.")
      
      toast({ title: "Account Deleted Successfully", description: "You have been logged out." })
      await supabase.auth.signOut()
      router.push("/login")
    } catch (err) {
      console.error(err)
      toast({
        title: "Error deleting account",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const getLogoUrl = (): string | undefined => {
    try {
      return profile?.logo ? JSON.parse(profile.logo)?.url : undefined
    } catch {
      return undefined
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold">Profile Not Found</h2>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/company_details")}>
          Create Your Profile
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* --- Profile Header --- */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={getLogoUrl()} alt={profile.name} />
            <AvatarFallback className="text-3xl font-bold bg-muted">
              {profile.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
            <p className="text-muted-foreground">{profile.email}</p>
            <div className="mt-2 flex gap-2 justify-center sm:justify-start">
              <Badge variant="secondary">Seller</Badge>
              <Badge variant="default">Verified</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/company_details")}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* --- Main Details Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Building className="mr-2"/>Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileDetailRow icon={User} label="Contact Person" value={profile.name} />
            <ProfileDetailRow icon={Phone} label="Contact Phone" value={profile.contact} isCopyable/>
            <ProfileDetailRow icon={Landmark} label="Business Address" value={profile.address} />
            <ProfileDetailRow icon={ShieldCheck} label="GST Number" value={profile.gst_no} isCopyable/>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Banknote className="mr-2"/>Bank Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileDetailRow icon={Landmark} label="Bank Name" value={profile.bank_name} />
            <ProfileDetailRow icon={User} label="Account Number" value={profile.account_no} isCopyable/>
            <ProfileDetailRow icon={KeyRound} label="IFSC Code" value={profile.ifsc_code} isCopyable/>
          </CardContent>
        </Card>
      </div>

      {/* --- Danger Zone --- */}
      <Card className="border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Delete this account</h3>
            <p className="text-sm text-muted-foreground">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            {deleting ? <Loader2 className="animate-spin" /> : <><Trash2 className="mr-2 h-4 w-4"/>Delete Account</>}
          </Button>
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

// --- Skeleton Component for Loading State ---
const ProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
    <Card>
      <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><Skeleton className="h-6 w-40"/></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-6 w-40"/></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
)