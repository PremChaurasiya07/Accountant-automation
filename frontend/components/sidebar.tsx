"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Package,
  BookOpen,
  Truck,
  Receipt,
  BarChart3,
  MessageCircle,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Billing",
    href: "/billing",
    icon: FileText,
    children: [
      { name: "Create", href: "/billing/create" },
      { name: "Edit / Preview / Delete", href: "/billing/edit" },
      // { name: "List", href: "/billing/list" },
      // { name: "Delete", href: "/billing/delete" },
    ],
  },
  {
    name: "Ledger",
    href: "/ledger",
    icon: BookOpen,
    children: [
      { name: "General", href: "/ledger" },
      // { name: "Sales", href: "/ledger/sales" },
      // { name: "Purchase", href: "/ledger/purchase" },
    ],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
    children: [
      { name: "Add Product", href: "/inventory/add-product" },
      { name: "View Stock", href: "/inventory/view-stock" },
    ],
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    children: [
      { name: "View Reports", href: "/analytics/report" },
      // { name: "Export Data", href: "/analytics/export" },
    ],
  },
  
  // {
  //   name: "E-Way Bill",
  //   href: "/eway-bill",
  //   icon: Truck,
  //   children: [
  //     { name: "Create", href: "/eway-bill/create" },
  //     { name: "Track", href: "/eway-bill/track" },
  //   ],
  // },
  // {
  //   name: "Income Tax Filing",
  //   href: "/income-tax",
  //   icon: Receipt,
  //   children: [
  //     { name: "Upload Docs", href: "/income-tax/upload" },
  //     { name: "Filing Status", href: "/income-tax/status" },
  //   ],
  // },
  
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <SidebarPrimitive>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  {item.children ? (
                    <Collapsible defaultOpen={pathname.startsWith(item.href)}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn("w-full justify-between", pathname.startsWith(item.href) && "bg-accent")}
                        >
                          <div className="flex items-center">
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.name}>
                              <SidebarMenuSubButton asChild>
                                <Link href={child.href} className={cn(pathname === child.href && "bg-accent")}>
                                  {child.name}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild>
                      <Link href={item.href} className={cn(pathname === item.href && "bg-accent")}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarPrimitive>
  )
}
