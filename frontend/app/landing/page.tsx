'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Mic,
  PieChart,
  Warehouse,
  BarChart,
  MessageSquareText,
} from 'lucide-react'
import Image from 'next/image'

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-background text-foreground relative">
      {/* Floating Navigation */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md shadow-md rounded-full px-6 py-3 flex gap-6 items-center z-50 border">
        <span
          className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full"
        >
          Beta Testing
        </span>
        <button
          onClick={() => router.push('/landing')}
          className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
        >
          Home
        </button>
        <button
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
        >
          Features
        </button>
        <button
          onClick={() => document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
        >
          Feedback
        </button>
      </nav>

      {/* Hero */}
      <section className="py-32 text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Vyapari – Your AI Voice-Powered Accountant
          </h1>
          <p className="mt-6 text-xl">
            Create invoices, manage inventory, and file GST — all by voice.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="mt-8 text-lg px-6 py-4 bg-white text-blue-700 font-semibold hover:bg-gray-100"
          >
            🚀 Get Started Free
          </Button>
        </div>
      </section>

      {/* Feature Images */}
      <section id="features" className="py-20 bg-muted text-center">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-10">Visual Tour of Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Image
                key={n}
                src={`/feature${n}.png`}
                alt={`Feature screenshot ${n}`}
                width={400}
                height={400}
                style={{ maxHeight: '42vh' }}
                className="rounded-xl border shadow-md"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white text-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful Features for Indian Business
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Mic className="w-8 h-8 text-blue-600" />,
                title: 'Voice Invoicing',
                desc: 'Create, edit, and track invoices hands-free.',
              },
              {
                icon: <FileText className="w-8 h-8 text-green-600" />,
                title: 'Invoice Ledger',
                desc: 'Track payments and manage ledgers easily.',
              },
              {
                icon: <Warehouse className="w-8 h-8 text-orange-600" />,
                title: 'Inventory',
                desc: 'Organize your products and stock.',
              },
              {
                icon: <PieChart className="w-8 h-8 text-purple-600" />,
                title: 'Analytics',
                desc: 'Understand your business performance.',
              },
              {
                icon: <MessageSquareText className="w-8 h-8 text-rose-600" />,
                title: 'AI Chat Assistant',
                desc: 'Automate accounting with AI conversation.',
              },
              {
                icon: <BarChart className="w-8 h-8 text-yellow-500" />,
                title: 'GST Filing',
                desc: 'GSTR-1 report. E-Way Bill generation and further tax filling coming soon.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border hover:shadow-lg transition"
              >
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Form */}
      <section
        id="feedback"
        className="py-20 bg-muted text-center text-gray-800 px-4"
      >
        <div className="max-w-xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">💬 Feedback & Beta Suggestions</h3>
          <p className="mb-8 text-muted-foreground">
            We value your thoughts. Share feedback below — entries will be emailed to us.
          </p>
          <form
            action="https://formspree.io/f/xzzgybod" // Replace with your Formspree endpoint
            method="POST"
            className="grid gap-4 text-left"
          >
            <input
              type="text"
              name="name"
              required
              placeholder="Your Name"
              className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              name="email"
              required
              placeholder="Your Email"
              className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              name="message"
              rows={4}
              required
              placeholder="Your Feedback"
              className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 font-semibold hover:bg-blue-700"
            >
              Submit Feedback
            </Button>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Automate Your Finances?
          </h2>
          <p className="mt-4 text-lg">
            Start using Vyapari today — it’s free and powerful.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="mt-8 text-lg px-6 py-4 bg-white text-blue-700 font-semibold hover:bg-gray-100"
          >
            Try Now for Free
          </Button>
        </div>
      </section>

      <footer className="py-6 text-center text-sm text-muted-foreground bg-background border-t">
        © {new Date().getFullYear()} Vyapari. Built with ❤️
      </footer>
    </main>
  )
}
