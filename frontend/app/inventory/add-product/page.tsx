'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { useUserId } from '@/hooks/context/UserContext'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  UploadCloud,
  Package,
  Info,
  DollarSign,
  Warehouse,
  AlertTriangle,
  Ruler,
  Loader2, // <-- Import a cleaner loader icon
} from 'lucide-react'

// ✅ FIX: Moved InputField outside the ProductForm to prevent focus loss
const InputField = ({
  name,
  label,
  placeholder,
  value,
  onChange,
  icon: Icon,
  type = 'text',
  required = false,
}: {
  name: string
  label: string
  placeholder: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon: React.ElementType
  type?: string
  required?: boolean
}) => (
  <div className="space-y-2">
    <Label htmlFor={name} className="flex items-center text-muted-foreground">
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Label>
    <Input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      // ✅ FIX: Removed hardcoded background color to support dark mode
    />
  </div>
)

function ProductForm() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('id')
  const { userId } = useUserId()
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    hsn: '',
    gst: '',
    rate: '',
    stock: '',
    unit: '',
    alertStock: '',
    image: null as File | null,
  })

  useEffect(() => {
    if (!productId || !userId) return

    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) {
        toast({
          title: '❌ Error fetching product',
          description: error.message,
          variant: 'destructive',
        })
      } else if (data) {
        setForm({
          name: data.name ?? '',
          description: data.description ?? '',
          hsn: data.hsn ?? '',
          gst: data.gst?.toString() ?? '',
          rate: data.rate?.toString() ?? '',
          stock: data.stock?.toString() ?? '',
          unit: data.unit ?? '',
          alertStock: data.alert_stock?.toString() ?? '',
          image: null,
        })
        if (data.image_url) setPreview(data.image_url)
      }
    }

    fetchProduct()
  }, [productId, userId, toast])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prevForm) => ({ ...prevForm, [e.target.name]: e.target.value }))
    },
    []
  )

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm((prevForm) => ({ ...prevForm, image: file }))
      setPreview(URL.createObjectURL(file))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({
        title: 'Authentication Error',
        description: 'User ID is not available. Please log in again.',
        variant: 'destructive',
      })
      return
    }
    setIsSubmitting(true)

    try {
        const productData = {
            user_id: userId,
            name: form.name,
            description: form.description,
            hsn: form.hsn || null,
            gst: form.gst ? parseFloat(form.gst) : null,
            rate: form.rate ? parseFloat(form.rate) : null,
            stock: form.stock ? parseInt(form.stock, 10) : null,
            unit: form.unit || null,
            alert_stock: form.alertStock ? parseInt(form.alertStock, 10) : null,
        };

        let upsertResponse;
        if (productId) {
            // Update existing product
            upsertResponse = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId)
                .select()
                .single();
        } else {
            // Insert new product
            upsertResponse = await supabase
                .from('products')
                .insert(productData)
                .select()
                .single();
        }

        const { data: updatedProduct, error: upsertError } = upsertResponse;

        if (upsertError) throw upsertError;
        
        // Handle image upload if a new image is provided
        if (form.image) {
            const filePath = `${userId}/${updatedProduct.id}`;
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, form.image, {
                    cacheControl: '3600',
                    upsert: true, // Overwrite if file exists
                });

            if (uploadError) throw uploadError;

            // Get public URL and update the product record
            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);
            
            await supabase
                .from('products')
                .update({ image_url: urlData.publicUrl })
                .eq('id', updatedProduct.id);
        }

        toast({
            title: productId ? '✅ Product Updated' : '✅ Product Added',
            description: `${updatedProduct.name} has been saved successfully.`,
        });

        router.push('/inventory');
    } catch (err: any) {
        toast({
            title: '❌ Operation Failed',
            description: err.message || 'An unexpected error occurred.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold tracking-tight">
          {productId ? 'Edit Product' : 'Add New Product'}
        </h1>
        <p className="text-muted-foreground">
          Manage your inventory by adding or updating product details.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Enter the core information for your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField
                  name="name"
                  label="Product Name *"
                  placeholder="e.g., Premium Cotton T-Shirt"
                  value={form.name}
                  onChange={handleChange}
                  icon={Package}
                  required
                />
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="flex items-center text-muted-foreground"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Product Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the product, its features, materials, etc."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Taxation</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField name="hsn" label="HSN Code" placeholder="e.g., 610910" value={form.hsn} onChange={handleChange} icon={Info} />
                <InputField name="gst" label="GST Rate (%)" placeholder="e.g., 12" value={form.gst} onChange={handleChange} icon={DollarSign} type="number" />
                <InputField name="rate" label="Rate/Price (₹)" placeholder="e.g., 499" value={form.rate} onChange={handleChange} icon={DollarSign} type="number" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField name="stock" label="Available Stock" placeholder="e.g., 50" value={form.stock} onChange={handleChange} icon={Warehouse} type="number"/>
                <InputField name="unit" label="Unit" placeholder="e.g., pcs, kg, box" value={form.unit} onChange={handleChange} icon={Ruler} />
                <InputField name="alertStock" label="Low Stock Alert" placeholder="e.g., 10" value={form.alertStock} onChange={handleChange} icon={AlertTriangle} type="number" />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors bg-background">
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImage}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {/* ✅ IMPROVEMENT: Conditionally render preview or upload prompt */}
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Product preview"
                      fill
                      className="object-contain p-2 rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <UploadCloud className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-semibold text-foreground">
                        Click to upload
                      </p>
                      <p className="text-xs">or drag and drop</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button
            type="submit"
            className="w-full md:w-auto min-w-[140px]"
            disabled={isSubmitting || !form.name}
          >
            {isSubmitting ? (
                // ✅ IMPROVEMENT: Cleaner loading state
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : productId ? (
              'Update Product'
            ) : (
              'Add Product'
            )}
          </Button>
        </div>
      </form>
    </>
  )
}

export default function AddOrEditProductPage() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <ProductForm />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}