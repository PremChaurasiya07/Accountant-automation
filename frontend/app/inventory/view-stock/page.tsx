"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useUserId } from "@/hooks/context/UserContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Trash2, Pencil } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  rate: number;
  stock: number;
  unit: string;
  image_url?: string;
  alert_stock: number;
  gst: number;
  hsn: string;
}

export default function ViewProductsTable() {
  const { userId } = useUserId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [userId]);

  const handleDelete = async (productId: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this product?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      alert("Error deleting product.");
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const handleEdit = (productId: string) => {
    router.push(`/inventory/add-product?id=${productId}`);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">📋 Product List</h1>
            <p className="text-muted-foreground">Row-wise product data with images</p>
          </div>
          <Input
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs rounded-xl border focus:ring-2 focus:ring-primary"
          />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground mt-10">Loading...</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-sm text-left table-auto border-collapse">
              <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 border-b">Image</th>
                  <th className="px-4 py-3 border-b">Name</th>
                  <th className="px-4 py-3 border-b">Description</th>
                  <th className="px-4 py-3 border-b">HSN</th>
                  <th className="px-4 py-3 border-b">GST %</th>
                  <th className="px-4 py-3 border-b">Rate ₹</th>
                  <th className="px-4 py-3 border-b">Stock</th>
                  <th className="px-4 py-3 border-b">Unit</th>
                  <th className="px-4 py-3 border-b">Alert Stock</th>
                  <th className="px-4 py-3 border-b text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition">
                    <td className="p-3 border-b">
                      {product.image_url ? (
                        <div className="w-20 h-20 relative rounded overflow-hidden border">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 border rounded flex items-center justify-center text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="p-3 border-b font-medium">{product.name}</td>
                    <td className="p-3 border-b">{product.description}</td>
                    <td className="p-3 border-b">{product.hsn}</td>
                    <td className="p-3 border-b">{product.gst}%</td>
                    <td className="p-3 border-b">₹{product.rate}</td>
                    <td className="p-3 border-b">{product.stock}</td>
                    <td className="p-3 border-b">{product.unit}</td>
                    <td className="p-3 border-b">{product.alert_stock}</td>
                    <td className="p-3 border-b text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product.id)}
                          className="text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
