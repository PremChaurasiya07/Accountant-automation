'use client'
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Loader, Plus } from "lucide-react";
import { supabase } from "../../lib/supabase"; // ensure you have this client setup
import { DashboardLayout } from "@/components/dashboard-layout";
import { useUserId } from "@/hooks/context/UserContext";

interface LedgerEntryItem {
  type: "debit" | "credit";
  amount: string;
  description: string;
  tags: string[];
}

const Ledger: React.FC = () => {
  const {userId}= useUserId()
  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [newEntry, setNewEntry] = useState<LedgerEntryItem>({
    type: "debit",
    amount: "",
    description: "",
    tags: []
  });

useEffect(() => {
  const fetchInvoiceDebits = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices_record")
      .select(`
        id,
        invoice_no,
        invoice_date,
        buyer_id,
        buyers_record(name),
        items_record(item_rate, qty, gst_rate)
      `)
      .eq("user_id", userId)
      .order("invoice_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoice debits:", error);
      setLoading(false);
      return;
    }

    const formattedEntries: LedgerEntryItem[] = (data || []).map((invoice: any) => {
     const totalAmount = (invoice.items_record || []).reduce(
  (sum: number, item: any) => {
    const totalWithoutGst = Number(item.item_rate) || 0;
    const gstFraction = Number(item.gst_rate) / 100 || 0;
    const itemTotal = totalWithoutGst * (1 + gstFraction);
    // console.log(`Item:`, item, `Item Total With GST:`, itemTotal);
    return sum + itemTotal;
  },
  0
);


      return {
        type: "debit",
        amount: totalAmount.toFixed(2),
        description: `Invoice No: ${invoice.invoice_no} on ${invoice.invoice_date}`,
        tags: [invoice.buyers_record?.name || "Unknown"],
      };
    });

    setEntries(formattedEntries);
    setLoading(false);
  };

  fetchInvoiceDebits();
}, [userId]);




  const handleAddEntry = () => {
    if (!newEntry.amount) return;
    setEntries([...entries, newEntry]);
    setNewEntry({ type: "debit", amount: "", description: "", tags: [] });
    setTagInput("");
    setShowForm(false);
  };

  const handleAddTag = () => {
    if (tagInput && !newEntry.tags.includes(tagInput)) {
      setNewEntry({ ...newEntry, tags: [...newEntry.tags, tagInput] });
      setTagInput("");
    }
  };

  const totalDebit = entries.filter(e => e.type === "debit").reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
  const totalCredit = entries.filter(e => e.type === "credit").reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  return (
    <DashboardLayout>
  
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-background border rounded-xl p-6 shadow-md">
        <h2 className="text-3xl font-bold mb-2">📒 Ledger</h2>
        <p className="text-muted-foreground text-sm">
          Showing all invoice-generated credits as debits with buyer company names
        </p>
      </div>

      {loading ? <div className="flex justify-center pt-32"><Loader size={36}/></div> : entries.map((entry, i) => (
        <Card key={i} className="bg-muted border shadow-sm">
          <CardContent className="p-4 grid gap-2">
            <div className="flex justify-between items-center">
              <span className={`font-medium ${entry.type === "debit" ? "text-red-500" : "text-green-600"}`}>
                {entry.type === "debit" ? "📤 Debit" : "📥 Credit"}
              </span>
              <span className="text-xl font-bold">₹ {entry.amount}</span>
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2">{entry.description}</p>
            <div className="flex gap-2 mt-1 flex-wrap">
              {entry.tags.map((tag, j) => (
                <Badge key={j} variant="outline">🏷️ {tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="fixed bottom-0 left-0 w-full bg-background border-t py-3 px-6 flex flex-col sm:flex-row sm:justify-center sm:gap-12 gap-2 items-center text-sm shadow-lg z-10">
        <div className="text-muted-foreground flex gap-4 sm:gap-6 flex-wrap justify-center">
          <span>Total Debit: ₹ {totalDebit.toFixed(2)}</span>
          <span>Total Credit: ₹ {totalCredit.toFixed(2)}</span>
        </div>
        <div className="text-foreground font-semibold text-lg">
          🧾 Net Balance: ₹ {(totalDebit - totalCredit).toFixed(2)}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm" className="fixed bottom-24 right-48 sm:bottom-24 sm:right-40 rounded-full shadow-lg px-4 py-2 z-20">
            <Plus size={14} /> Add Entry
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="font-semibold text-lg">Add Ledger Entry</DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Type</Label>
              <select
                value={newEntry.type}
                onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as any })}
                className="w-full rounded border p-2 bg-background"
              >
                <option value="debit">Debit (Invoice)</option>
                <option value="credit">Credit (Payment)</option>
              </select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                placeholder="₹0.00"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="e.g. UPI Payment"
              />
            </div>
            <div>
              <Label>Add Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tag"
                />
                <Button size="sm" onClick={handleAddTag}>+ Tag</Button>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {newEntry.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary">🏷️ {tag}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={handleAddEntry} className="mt-2 w-full">Save Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
};

export default Ledger;
