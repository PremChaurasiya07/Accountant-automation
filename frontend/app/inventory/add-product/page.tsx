

'use client'

import { useEffect, useState, Suspense } from 'react'
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
} from 'lucide-react'

// Product form component (inside Suspense)
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
          title: '❌ Error fetching',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setForm({
          ...data,
          gst: data.gst?.toString() ?? '',
          rate: data.rate?.toString() ?? '',
          stock: data.stock?.toString() ?? '',
          alertStock: data.alert_stock?.toString() ?? '',
          image: null,
        })
        if (data.image_url) setPreview(data.image_url)
      }
    }

    fetchProduct()
  }, [productId, userId, toast])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setForm({ ...form, image: file })
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData()
    if (productId) formData.append('id', productId)
    formData.append('name', form.name)
    formData.append('description', form.description)
    formData.append('hsn', form.hsn)
    formData.append('gst', form.gst)
    formData.append('rate', form.rate)
    formData.append('stock', form.stock)
    formData.append('unit', form.unit)
    formData.append('alertStock', form.alertStock)
    formData.append('user_id', userId || '')
    if (form.image) formData.append('image', form.image)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/add-product`,
        {
          method: 'POST',
          body: formData,
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to save product')

      toast({
        title: productId ? '✅ Product Updated' : '✅ Product Added',
        description: `${data.product.name} saved successfully`,
      })

      router.push('/inventory')
    } catch (err: any) {
      toast({
        title: '❌ Error',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const InputField = ({
    name,
    label,
    placeholder,
    value,
    icon: Icon,
    type = 'text',
  }: {
    name: keyof typeof form
    label: string
    placeholder: string
    value: string
    icon: React.ElementType
    type?: string
  }) => (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center text-slate-600">
        <Icon className="w-4 h-4 mr-2" />
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={name === 'name'}
        className="bg-slate-50"
      />
    </div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          {productId ? 'Edit Product' : 'Add New Product'}
        </h1>
        <p className="text-muted-foreground">
          Manage your inventory by adding or updating product details.
        </p>
      </motion.div>

      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="space-y-8"
      >
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
                  icon={Package}
                />
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="flex items-center text-slate-600"
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
                    className="bg-slate-50"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing & Taxation</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                  name="hsn"
                  label="HSN Code"
                  placeholder="e.g., 610910"
                  value={form.hsn}
                  icon={Info}
                />
                <InputField
                  name="gst"
                  label="GST Rate (%)"
                  placeholder="e.g., 12"
                  value={form.gst}
                  icon={DollarSign}
                  type="number"
                />
                <InputField
                  name="rate"
                  label="Rate/Price (₹)"
                  placeholder="e.g., 499"
                  value={form.rate}
                  icon={DollarSign}
                  type="number"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                  name="stock"
                  label="Available Stock"
                  placeholder="e.g., 50"
                  value={form.stock}
                  icon={Warehouse}
                  type="number"
                />
                <InputField
                  name="unit"
                  label="Unit"
                  placeholder="e.g., pcs, kg, box"
                  value={form.unit}
                  icon={Ruler}
                />
                <InputField
                  name="alertStock"
                  label="Low Stock Alert"
                  placeholder="e.g., 10"
                  value={form.alertStock}
                  icon={AlertTriangle}
                  type="number"
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50">
                    <div className="text-center">
                      <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        <span className="font-semibold">Click to upload</span>
                      </p>
                      <p className="text-xs text-slate-400">or drag and drop</p>
                    </div>
                    <Input
                      id="image"
                      name="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {preview && (
                      <Image
                        src={preview}
                        alt="Product preview"
                        layout="fill"
                        objectFit="contain"
                        className="absolute inset-0 w-full h-full p-2 rounded-lg bg-white"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button
            type="submit"
            className="w-full md:w-auto flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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

// Final wrapper component
export default function AddOrEditProductPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="flex justify-center items-center p-8">
              <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }
        >
          <ProductForm />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}
