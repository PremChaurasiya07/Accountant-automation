


"use client";

import { useEffect, useState, memo } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useUserId } from "@/hooks/context/UserContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, PackageSearch, PlusCircle, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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

// A memoized ProductCard for performance and clean code
const ProductCard = memo(
  ({ product, onEdit, onDelete }: { product: Product; onEdit: (id: string) => void; onDelete: (id: string) => void; }) => {
    
    const getStockStatus = (): { variant: "default" | "destructive" | "secondary"; text: string } => {
      if (product.stock === 0) {
        return { variant: "destructive", text: "Out of Stock" };
      }
      if (product.stock <= product.alert_stock) {
        return { variant: "secondary", text: "Low Stock" };
      }
      return { variant: "default", text: "In Stock" };
    };
    const stockStatus = getStockStatus();

    return (
      <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg dark:bg-slate-800/50">
        <CardHeader className="flex flex-row items-start p-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <CardDescription className="line-clamp-2 text-xs">{product.description || 'No description available.'}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product.id)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
            <div className="relative aspect-video w-full rounded-md overflow-hidden mb-4 bg-muted">
                {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover"/>
                ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Image</div>
                )}
            </div>
            <div className="flex justify-between items-center">
                <div className="text-xl font-bold">₹{product.rate.toLocaleString()}</div>
                <Badge variant={stockStatus.variant}>{stockStatus.text}: {product.stock} {product.unit}</Badge>
            </div>
        </CardContent>
      </Card>
    );
  }
);
ProductCard.displayName = "ProductCard";

// Skeleton component for loading state
const ProductSkeleton = () => (
    <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-start p-4">
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <Skeleton className="aspect-video w-full rounded-md mb-4" />
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/3" />
            </div>
        </CardContent>
    </Card>
)

export default function ViewInventoryPage() {
  const { userId } = useUserId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userId) return;
      setLoading(true);
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
  
  const handleAddProduct = () => {
    router.push(`/inventory/add-product`);
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.description?.toLowerCase().includes(search.toLowerCase())
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      );
    }
    if (filteredProducts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-lg bg-muted/50">
          <PackageSearch className="h-16 w-16 mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold">No Products Found</h3>
          <p className="text-muted-foreground mt-2 mb-4">
            {search ? `No results for "${search}".` : "Your inventory is empty."}
          </p>
          <Button onClick={handleAddProduct}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Product
          </Button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">📦 Inventory</h1>
            <p className="text-muted-foreground">Manage and track your products.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleAddProduct}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </div>
        </div>
        
        {renderContent()}

      </div>
    </DashboardLayout>
  );
}