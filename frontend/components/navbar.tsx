"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function Navbar() {
  const { setTheme } = useTheme()
  const router = useRouter()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Fetch logo URL on mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data, error } = await supabase
            .from("sellers_record")
            .select("logo")
            .eq("user_id", user.id) // Adjust if your user ID field is named differently
            .single()
          
          if (error) {
            console.error("Error fetching logo:", error)
          } else if (data?.logo) {
            // If you stored a public URL directly
            setLogoUrl(data.logo)

          }
        }
      } catch (err) {
        console.error("Error fetching user:", err)
      }
    }

    fetchLogo()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (err) {
      console.error("Logout failed", err)
    }
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <div className="font-semibold">Vyapari</div>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          {/* Theme Switch */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  {logoUrl ? (
                    <AvatarImage src={logoUrl} alt="User logo" />
                  ) : (
                    <AvatarImage
                      src={`https://source.boringavatars.com/marble/32?colors=264653,2a9d8f,e9c46a,f4a261,e76f51`}
                      alt="Default avatar"
                    />
                  )}
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
