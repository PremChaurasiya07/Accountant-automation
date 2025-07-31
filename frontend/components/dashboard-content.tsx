"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText, Package, BookOpen, Truck, Receipt, BarChart3,
  Plus, Edit, Eye, FileBarChart,
  Group,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

const dashboardCards = [
  {
    id: "billing", title: "Billing", description: "Manage invoices and billing", icon: FileText, color: "bg-blue-500",
    actions: [
      { name: "Create", icon: Plus, href: "/billing/create" },
      { name: "Edit/Delete", icon: Edit, href: "/billing/edit" },
    ],
  },
  {
    id: "ledger", title: "Ledger", description: "Financial records and transactions", icon: BookOpen,
    color: "bg-purple-500", 
    actions: [
      { name: "General", icon: Group, href: "/ledger" },
      { name: "Buyer", icon: Group, href: "/ledger/buyer" },
    ],
  },
  {
    id: "inventory", title: "Inventory", description: "Track products and stock", icon: Package, color: "bg-green-500",
    actions: [
      { name: "Add Product", icon: Plus, href: "/inventory/add-product" },
      { name: "View Stock", icon: Eye, href: "/inventory/view-stock" },
    ],
  },
  
  {
    id: "analytics", title: "Analytics", description: "Business insights and reports", icon: BarChart3, color: "bg-indigo-500",
    actions: [
      { name: "View Reports", icon: FileBarChart, href: "/analytics/report" },
    ],
  },
  {
    id: "income-tax", title: "Income Tax Filing", description: "Tax filing and documentation", icon: Receipt, color: "bg-red-500", 
     actions: [
      { name: "Download ITR Reports", icon: FileBarChart, href: "/ITR/report" },
    ],
  },
  // {
  //   id: "eway-bill", title: "E-Way Bill", description: "Electronic waybill management", icon: Truck, color: "bg-orange-500", comingSoon: true,
  // },
  
]

export function DashboardContent() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  const handleCardClick = (cardId: string, href?: string, comingSoon?: boolean) => {
    if (comingSoon) return
    if (href) {
      setLoading(true)
      startTransition(() => {
        router.push(href)
      })
    } else {
      setExpandedCard(expandedCard === cardId ? null : cardId)
    }
  }

  const handleActionClick = (actionName: string, cardTitle: string) => {
    toast({
      title: "Action Triggered",
      description: `${actionName} action for ${cardTitle}`,
    })
  }

  return (
    <TooltipProvider>
      {loading && (
        <div className="fixed inset-0 z-50 bg-white/70 dark:bg-black/70 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your business management dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map((card) => {
            const cardBody = (
              <Card
                className={`
                  transition-shadow
                  ${card.comingSoon ? "cursor-not-allowed opacity-70" : "hover:shadow-lg cursor-pointer"}
                `}
                onClick={() => handleCardClick(card.id, card.href, card.comingSoon)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${card.color} text-white`}>
                      <card.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {card.title}
                        {card.comingSoon && <span className="text-xs text-muted-foreground">(Coming Soon)</span>}
                      </CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {expandedCard === card.id && card.actions && !card.comingSoon && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-2">
                          {card.actions.map((action) => (
                            <Button
                              key={action.name}
                              variant="outline"
                              size="sm"
                              className="justify-start"
                              asChild
                              onClick={() => handleActionClick(action.name, card.title)}
                            >
                              <Link href={action.href}>
                                <action.icon className="mr-2 h-4 w-4" />
                                {action.name}
                              </Link>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {card.comingSoon ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{cardBody}</TooltipTrigger>
                    <TooltipContent>Coming Soon</TooltipContent>
                  </Tooltip>
                ) : (
                  cardBody
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
