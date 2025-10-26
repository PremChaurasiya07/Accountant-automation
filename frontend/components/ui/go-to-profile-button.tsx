"use client"

import { useRouter } from "next/navigation"
import { useUserId } from "@/hooks/context/UserContext"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function GoToProfileButton() {
  const router = useRouter()
  const { userId } = useUserId()

  const handleClick = () => {
    if (userId) {
      // This navigates to the "EditSellerCardPage" you provided,
      // assuming your route is /card/edit/[id]
      router.push(`/card/edit/${userId}`)
    }
  }

  return (
    <Button onClick={handleClick} className="mt-3">
      Create Your Business Profile
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  )
}