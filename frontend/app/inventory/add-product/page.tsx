"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useUserId } from "@/hooks/context/UserContext";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

function ProductForm() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const { userId } = useUserId();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    hsn: "",
    gst: "",
    rate: "",
    stock: "",
    unit: "",
    alertStock: "",
    image: null as File | null,
  });

  useEffect(() => {
    if (!productId || !userId) return;
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (error) {
        toast({
          title: "❌ Error fetching",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setForm({
          ...data,
          gst: data.gst?.toString() ?? "",
          rate: data.rate?.toString() ?? "",
          stock: data.stock?.toString() ?? "",
          alertStock: data.alert_stock?.toString() ?? "",
          image: null,
        });
        if (data.image_url) setPreview(data.image_url);
      }
    };
    fetchProduct();
  }, [productId, userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    if (productId) formData.append("id", productId);
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("hsn", form.hsn);
    formData.append("gst", form.gst);
    formData.append("rate", form.rate);
    formData.append("stock", form.stock);
    formData.append("unit", form.unit);
    formData.append("alertStock", form.alertStock);
    formData.append("user_id", userId || "");
    if (form.image) formData.append("image", form.image);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/add-product`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save product");

      toast({
        title: productId ? "✅ Product Updated" : "✅ Product Added",
        description: `${data.product.name} saved successfully`,
      });

      router.push("/inventory");
    } catch (err: any) {
      toast({
        title: "❌ Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <CardHeader>
        <CardTitle>🧾 Product Information</CardTitle>
        <CardDescription>
          {productId
            ? "Edit and update your product details."
            : "Enter details for the new product."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          className="space-y-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g., Cotton Shirt"
              />
            </div>
            <div>
              <Label>HSN Code</Label>
              <Input
                name="hsn"
                value={form.hsn}
                onChange={handleChange}
                placeholder="e.g., 610910"
              />
            </div>
            <div>
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                name="gst"
                value={form.gst}
                onChange={handleChange}
                placeholder="e.g., 12"
              />
            </div>
            <div>
              <Label>Rate/Price ₹</Label>
              <Input
                type="number"
                name="rate"
                value={form.rate}
                onChange={handleChange}
                placeholder="e.g., 499"
              />
            </div>
            <div>
              <Label>Available Stock</Label>
              <Input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="e.g., 50"
              />
            </div>
            <div>
              <Label>Alert Stock Value</Label>
              <Input
                type="number"
                name="alertStock"
                value={form.alertStock}
                onChange={handleChange}
                placeholder="e.g., 10"
              />
            </div>
            <div>
              <Label>Per Unit</Label>
              <Input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="e.g., pcs, kg"
              />
            </div>
          </div>

          <div>
            <Label>Product Description</Label>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Details about the product"
            />
          </div>

          <div>
            <Label>Upload Product Image</Label>
            <Input type="file" accept="image/*" onChange={handleImage} />
            {preview && (
              <div className="mt-2">
                <Image
                  src={preview}
                  alt="Preview"
                  width={100}
                  height={100}
                  className="rounded border"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="mt-4 w-full md:w-auto flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </>
            ) : productId ? (
              "Update Product"
            ) : (
              "Add Product"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AddOrEditProduct() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Add / Edit Product
          </h1>
          <p className="text-muted-foreground">
            Manage your inventory products.
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <ProductForm />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
