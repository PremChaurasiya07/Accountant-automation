


// "use client";

// import { useEffect, useState, memo } from "react";
// import { DashboardLayout } from "@/components/dashboard-layout";
// import { useUserId } from "@/hooks/context/UserContext";
// import { supabase } from "@/lib/supabase";
// import Image from "next/image";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useRouter } from "next/navigation";
// import { Trash2, Pencil, PackageSearch, PlusCircle, AlertTriangle } from "lucide-react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { MoreHorizontal } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { Skeleton } from "@/components/ui/skeleton";

// interface Product {
//   id: string;
//   name: string;
//   description: string;
//   rate: number;
//   stock: number;
//   unit: string;
//   image_url?: string;
//   alert_stock: number;
//   gst: number;
//   hsn: string;
// }

// // A memoized ProductCard for performance and clean code
// const ProductCard = memo(
//   ({ product, onEdit, onDelete }: { product: Product; onEdit: (id: string) => void; onDelete: (id: string) => void; }) => {
    
//     const getStockStatus = (): { variant: "default" | "destructive" | "secondary"; text: string } => {
//       if (product.stock === 0) {
//         return { variant: "destructive", text: "Out of Stock" };
//       }
//       if (product.stock <= product.alert_stock) {
//         return { variant: "secondary", text: "Low Stock" };
//       }
//       return { variant: "default", text: "In Stock" };
//     };
//     const stockStatus = getStockStatus();

//     return (
//       <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg dark:bg-slate-800/50">
//         <CardHeader className="flex flex-row items-start p-4">
//           <div className="flex-1 space-y-1">
//             <CardTitle className="text-lg">{product.name}</CardTitle>
//             <CardDescription className="line-clamp-2 text-xs">{product.description || 'No description available.'}</CardDescription>
//           </div>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
//                 <MoreHorizontal className="h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//               <DropdownMenuItem onClick={() => onEdit(product.id)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
//               <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </CardHeader>
//         <CardContent className="p-4 pt-0 text-sm">
//             <div className="relative aspect-video w-full rounded-md overflow-hidden mb-4 bg-muted">
//                 {product.image_url ? (
//                     <Image src={product.image_url} alt={product.name} fill className="object-cover"/>
//                 ) : (
//                     <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Image</div>
//                 )}
//             </div>
//             <div className="flex justify-between items-center">
//                 <div className="text-xl font-bold">₹{product.rate.toLocaleString()}</div>
//                 <Badge variant={stockStatus.variant}>{stockStatus.text}: {product.stock} {product.unit}</Badge>
//             </div>
//         </CardContent>
//       </Card>
//     );
//   }
// );
// ProductCard.displayName = "ProductCard";

// // Skeleton component for loading state
// const ProductSkeleton = () => (
//     <Card className="flex flex-col overflow-hidden">
//         <CardHeader className="flex flex-row items-start p-4">
//             <div className="flex-1 space-y-2">
//                 <Skeleton className="h-5 w-3/4" />
//                 <Skeleton className="h-3 w-full" />
//             </div>
//             <Skeleton className="h-8 w-8 rounded-full" />
//         </CardHeader>
//         <CardContent className="p-4 pt-0">
//             <Skeleton className="aspect-video w-full rounded-md mb-4" />
//             <div className="flex justify-between items-center">
//                 <Skeleton className="h-6 w-1/4" />
//                 <Skeleton className="h-6 w-1/3" />
//             </div>
//         </CardContent>
//     </Card>
// )

// export default function ViewInventoryPage() {
//   const { userId } = useUserId();
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const router = useRouter();

//   useEffect(() => {
//     const fetchProducts = async () => {
//       if (!userId) return;
//       setLoading(true);
//       const { data, error } = await supabase
//         .from("products")
//         .select("*")
//         .eq("user_id", userId)
//         .order("created_at", { ascending: false });

//       if (error) {
//         console.error("Error fetching products:", error);
//       } else {
//         setProducts(data || []);
//       }
//       setLoading(false);
//     };

//     fetchProducts();
//   }, [userId]);

//   const handleDelete = async (productId: string) => {
//     const confirmDelete = confirm("Are you sure you want to delete this product?");
//     if (!confirmDelete) return;

//     const { error } = await supabase.from("products").delete().eq("id", productId);
//     if (error) {
//       alert("Error deleting product.");
//     } else {
//       setProducts((prev) => prev.filter((p) => p.id !== productId));
//     }
//   };

//   const handleEdit = (productId: string) => {
//     router.push(`/inventory/add-product?id=${productId}`);
//   };
  
//   const handleAddProduct = () => {
//     router.push(`/inventory/add-product`);
//   }

//   const filteredProducts = products.filter((product) =>
//     product.name.toLowerCase().includes(search.toLowerCase()) ||
//     product.description?.toLowerCase().includes(search.toLowerCase())
//   );

//   const renderContent = () => {
//     if (loading) {
//       return (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
//         </div>
//       );
//     }
//     if (filteredProducts.length === 0) {
//       return (
//         <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-lg bg-muted/50">
//           <PackageSearch className="h-16 w-16 mb-4 text-muted-foreground" />
//           <h3 className="text-xl font-semibold">No Products Found</h3>
//           <p className="text-muted-foreground mt-2 mb-4">
//             {search ? `No results for "${search}".` : "Your inventory is empty."}
//           </p>
//           <Button onClick={handleAddProduct}>
//             <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Product
//           </Button>
//         </div>
//       );
//     }
//     return (
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//         {filteredProducts.map((product) => (
//           <ProductCard
//             key={product.id}
//             product={product}
//             onEdit={handleEdit}
//             onDelete={handleDelete}
//           />
//         ))}
//       </div>
//     );
//   };
  
//   return (
//     <DashboardLayout>
//       <div className="space-y-6 p-4 md:p-6">
//         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//           <div>
//             <h1 className="text-3xl font-bold tracking-tight">📦 Inventory</h1>
//             <p className="text-muted-foreground">Manage and track your products.</p>
//           </div>
//           <div className="flex items-center gap-2">
//             <Input
//               placeholder="Search products..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="max-w-xs"
//             />
//             <Button onClick={handleAddProduct}>
//                 <PlusCircle className="mr-2 h-4 w-4" /> Add Product
//             </Button>
//           </div>
//         </div>
        
//         {renderContent()}

//       </div>
//     </DashboardLayout>
//   );
// }


"use client";

import { useEffect, useState, memo } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useUserId } from "@/hooks/context/UserContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, PackageSearch, PlusCircle, AlertTriangle, Package, Search, Sparkles, TrendingDown, BoxIcon } from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, type: "spring", stiffness: 100 } }
};

// --- Product Card Component ---
const ProductCard = memo(
  ({ product, onEdit, onDelete }: { product: Product; onEdit: (id: string) => void; onDelete: (id: string) => void; }) => {
    
    const getStockStatus = (): { variant: "default" | "destructive" | "secondary"; text: string; color: string } => {
      if (product.stock === 0) {
        return { variant: "destructive", text: "Out of Stock", color: "from-red-500/20 to-red-500/10" };
      }
      if (product.stock <= product.alert_stock) {
        return { variant: "secondary", text: "Low Stock", color: "from-amber-500/20 to-amber-500/10" };
      }
      return { variant: "default", text: "In Stock", color: "from-green-500/20 to-green-500/10" };
    };
    const stockStatus = getStockStatus();

    return (
      <motion.div
        variants={itemVariants}
        layout
        whileHover={{ y: -8, transition: { duration: 0.2 } }}
      >
        <Card className="group relative flex flex-col overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 h-full">
          {/* Decorative gradient overlay */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${stockStatus.color}`} />
          
          {/* Stock Status Badge */}
          <div className="absolute top-4 left-4 z-10">
            <Badge 
              variant={stockStatus.variant} 
              className={`backdrop-blur-sm border ${
                product.stock === 0 
                  ? 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400' 
                  : product.stock <= product.alert_stock
                  ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400'
                  : 'bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400'
              }`}
            >
              {product.stock === 0 ? (
                <AlertTriangle className="w-3 h-3 mr-1" />
              ) : product.stock <= product.alert_stock ? (
                <TrendingDown className="w-3 h-3 mr-1" />
              ) : (
                <Package className="w-3 h-3 mr-1" />
              )}
              {stockStatus.text}
            </Badge>
          </div>

          {/* Action Menu */}
          <div className="absolute top-4 right-4 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background border border-border/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={() => onEdit(product.id)} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" /> Edit Product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-500 focus:text-red-600 cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardHeader className="p-4 pt-16">
            <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs mt-1">
              {product.description || 'No description available.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 pt-0 flex-grow">
            {/* Product Image */}
            <motion.div 
              className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {product.image_url ? (
                <Image 
                  src={product.image_url} 
                  alt={product.name} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
                  <BoxIcon className="h-12 w-12 mb-2" />
                  <span className="text-xs">No Image</span>
                </div>
              )}
            </motion.div>

            {/* Price and Stock Info */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Price</span>
                <div className="text-2xl font-bold text-primary ml-auto">
                  ₹{product.rate.toLocaleString('en-IN')}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Stock</span>
                </div>
                <span className={`text-sm font-bold ${
                  product.stock === 0 
                    ? 'text-red-600' 
                    : product.stock <= product.alert_stock 
                    ? 'text-amber-600' 
                    : 'text-green-600'
                }`}>
                  {product.stock} {product.unit}
                </span>
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                <span>HSN: {product.hsn || 'N/A'}</span>
                <span>GST: {product.gst}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);
ProductCard.displayName = "ProductCard";

// --- Skeleton Component ---
const ProductSkeleton = () => (
  <Card className="flex flex-col overflow-hidden">
    <CardHeader className="p-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <Skeleton className="aspect-video w-full rounded-xl mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- Stats Card Component ---
const StatsCard = ({ title, value, icon: Icon, colorClass }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
  >
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${colorClass.replace('text-', 'bg-')}`} />
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass.includes('blue') ? 'from-blue-500/20 to-blue-500/10' : colorClass.includes('green') ? 'from-green-500/20 to-green-500/10' : colorClass.includes('amber') ? 'from-amber-500/20 to-amber-500/10' : 'from-red-500/20 to-red-500/10'}`}>
            <Icon className={`h-6 w-6 ${colorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// --- Main Component ---
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
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock > p.alert_stock).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.alert_stock).length,
    outOfStock: products.filter(p => p.stock === 0).length,
  };

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="text-center p-16 border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/20 to-transparent">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <PackageSearch className="h-10 w-10 text-primary/50" />
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {search ? "No Products Found" : "No Products Yet"}
            </h3>
            <p className="text-muted-foreground text-lg mb-6">
              {search ? `No results for "${search}". Try different keywords.` : "Start building your inventory by adding your first product."}
            </p>
            <Button onClick={handleAddProduct} className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Product
            </Button>
          </Card>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-8 p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              Inventory Management
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Organize and track your product catalog with ease</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full md:w-64 h-11 border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background transition-all"
              />
            </div>
            <Button 
              onClick={handleAddProduct}
              className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 h-11"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Products" value={stats.total} icon={Package} colorClass="text-blue-500" />
            <StatsCard title="In Stock" value={stats.inStock} icon={Package} colorClass="text-green-500" />
            <StatsCard title="Low Stock" value={stats.lowStock} icon={TrendingDown} colorClass="text-amber-500" />
            <StatsCard title="Out of Stock" value={stats.outOfStock} icon={AlertTriangle} colorClass="text-red-500" />
          </div>
        )}
        
        {/* Products Grid */}
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}