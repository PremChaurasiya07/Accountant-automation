import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SalesLedger() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Ledger</h1>
          <p className="text-muted-foreground">View and manage sales transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sales Transactions</CardTitle>
            <CardDescription>Recent sales activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Sales ledger data would go here...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
