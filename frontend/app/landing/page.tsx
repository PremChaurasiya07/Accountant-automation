// 'use client'

// import { useRouter } from 'next/navigation'
// import { Button } from '@/components/ui/button'
// import {
//   FileText,
//   Mic,
//   PieChart,
//   Warehouse,
//   BarChart,
//   MessageSquareText,
// } from 'lucide-react'
// import Image from 'next/image'

// export default function LandingPage() {
//   const router = useRouter()

//   return (
//     <main className="min-h-screen bg-background text-foreground relative">
//       {/* Floating Navigation */}
//       <nav className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md shadow-md rounded-full px-6 py-3 flex gap-6 items-center z-50 border">
//         <span
//           className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full"
//         >
//           Beta Testing
//         </span>
//         <button
//           onClick={() => router.push('/landing')}
//           className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
//         >
//           Home
//         </button>
//         <button
//           onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
//           className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
//         >
//           Features
//         </button>
//         <button
//           onClick={() => document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' })}
//           className="text-sm font-medium text-gray-700 hover:text-blue-700 transition"
//         >
//           Feedback
//         </button>
//       </nav>

//       {/* Hero */}
//       <section className="py-32 text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
//         <div className="max-w-4xl mx-auto px-4">
//           <h1 className="text-5xl md:text-6xl font-bold leading-tight">
//             Vyapari – Your AI Voice-Powered Accountant
//           </h1>
//           <p className="mt-6 text-xl">
//             Create invoices, manage inventory, and file GST — all by voice.
//           </p>
//           <Button
//             onClick={() => router.push('/login')}
//             className="mt-8 text-lg px-6 py-4 bg-white text-blue-700 font-semibold hover:bg-gray-100"
//           >
//             🚀 Get Started Free
//           </Button>
//         </div>
//       </section>

//       {/* Feature Images */}
//       <section id="features" className="py-20 bg-muted text-center">
//         <div className="max-w-5xl mx-auto px-4">
//           <h2 className="text-3xl font-bold mb-10">Visual Tour of Features</h2>
//           <div className="grid md:grid-cols-3 gap-6">
//             {[1, 2, 3].map((n) => (
//               <Image
//                 key={n}
//                 src={`/feature${n}.png`}
//                 alt={`Feature screenshot ${n}`}
//                 width={400}
//                 height={400}
//                 style={{ maxHeight: '42vh' }}
//                 className="rounded-xl border shadow-md"
//               />
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Features */}
//       <section className="py-20 bg-white text-gray-900">
//         <div className="max-w-6xl mx-auto px-4">
//           <h2 className="text-3xl font-bold text-center mb-12">
//             Powerful Features for Indian Business
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//             {[
//               {
//                 icon: <Mic className="w-8 h-8 text-blue-600" />,
//                 title: 'Voice Invoicing',
//                 desc: 'Create, edit, and track invoices hands-free.',
//               },
//               {
//                 icon: <FileText className="w-8 h-8 text-green-600" />,
//                 title: 'Invoice Ledger',
//                 desc: 'Track payments and manage ledgers easily.',
//               },
//               {
//                 icon: <Warehouse className="w-8 h-8 text-orange-600" />,
//                 title: 'Inventory',
//                 desc: 'Organize your products and stock.',
//               },
//               {
//                 icon: <PieChart className="w-8 h-8 text-purple-600" />,
//                 title: 'Analytics',
//                 desc: 'Understand your business performance.',
//               },
//               {
//                 icon: <MessageSquareText className="w-8 h-8 text-rose-600" />,
//                 title: 'AI Chat Assistant',
//                 desc: 'Automate accounting with AI conversation.',
//               },
//               {
//                 icon: <BarChart className="w-8 h-8 text-yellow-500" />,
//                 title: 'GST Filing',
//                 desc: 'GSTR-1 report. E-Way Bill generation and further tax filling coming soon.',
//               },
//             ].map((f, i) => (
//               <div
//                 key={i}
//                 className="p-6 rounded-xl border hover:shadow-lg transition"
//               >
//                 <div className="mb-4">{f.icon}</div>
//                 <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
//                 <p className="text-sm text-muted-foreground">{f.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Feedback Form */}
//       <section
//         id="feedback"
//         className="py-20 bg-muted text-center text-gray-800 px-4"
//       >
//         <div className="max-w-xl mx-auto">
//           <h3 className="text-2xl font-bold mb-4">💬 Feedback & Beta Suggestions</h3>
//           <p className="mb-8 text-muted-foreground">
//             We value your thoughts. Share feedback below — entries will be emailed to us.
//           </p>
//           <form
//             action="https://formspree.io/f/xzzgybod" // Replace with your Formspree endpoint
//             method="POST"
//             className="grid gap-4 text-left"
//           >
//             <input
//               type="text"
//               name="name"
//               required
//               placeholder="Your Name"
//               className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500"
//             />
//             <input
//               type="email"
//               name="email"
//               required
//               placeholder="Your Email"
//               className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500"
//             />
//             <textarea
//               name="message"
//               rows={4}
//               required
//               placeholder="Your Feedback"
//               className="w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-blue-500"
//             />
//             <Button
//               type="submit"
//               className="bg-blue-600 text-white px-6 py-3 font-semibold hover:bg-blue-700"
//             >
//               Submit Feedback
//             </Button>
//           </form>
//         </div>
//       </section>

//       {/* CTA */}
//       <section className="py-20 text-center bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
//         <div className="max-w-3xl mx-auto px-4">
//           <h2 className="text-3xl md:text-4xl font-bold">
//             Ready to Automate Your Finances?
//           </h2>
//           <p className="mt-4 text-lg">
//             Start using Vyapari today — it’s free and powerful.
//           </p>
//           <Button
//             onClick={() => router.push('/login')}
//             className="mt-8 text-lg px-6 py-4 bg-white text-blue-700 font-semibold hover:bg-gray-100"
//           >
//             Try Now for Free
//           </Button>
//         </div>
//       </section>

//       <footer className="py-6 text-center text-sm text-muted-foreground bg-background border-t">
//         © {new Date().getFullYear()} Vyapari. Built with ❤️
//       </footer>
//     </main>
//   )
// }
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, Menu, X, FileText, Package, IndianRupee, Zap, Mic, BarChart3, Bot, CheckCircle, BookOpen, Calculator, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';


// --- Animation Variants ---
const fadeIn = (direction = 'up', delay = 0, duration = 1) => ({
  hidden: { opacity: 0, y: direction === 'up' ? 30 : -30, x: direction === 'left' ? 30 : direction === 'right' ? -30 : 0 },
  show: { opacity: 1, y: 0, x: 0, transition: { type: 'spring', duration, delay, bounce: 0.4 } },
});

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

// --- Reusable Components ---
const TestimonialCard = ({ quote, name, company, image }) => (
    <div className="bg-gradient-to-br from-white/5 to-white/0 p-6 rounded-2xl border border-white/10 h-full flex flex-col backdrop-blur-lg shadow-lg hover:border-white/20 transition-colors">
      <div className="flex text-yellow-400">
        {[...Array(5)].map((_, i) => <Star key={i} fill="currentColor" className="w-5 h-5" />)}
      </div>
      <p className="text-gray-300 italic flex-grow my-4">"{quote}"</p>
      <div className="flex items-center gap-4 pt-4 border-t border-white/10">
        <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover" />
        <div>
          <h4 className="font-bold text-white">{name}</h4>
          <p className="text-sm text-gray-400">{company}</p>
        </div>
      </div>
    </div>
);

const ScrollyFeature = ({ features }) => {
    const [activeFeature, setActiveFeature] = useState(0);
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start center", "end center"]
    });

    scrollYProgress.on("change", (latest) => {
        const newActiveFeature = Math.min(features.length - 1, Math.floor(latest * features.length));
        setActiveFeature(newActiveFeature);
    });

    return (
        <div ref={ref} className="grid md:grid-cols-2 gap-16 items-start relative">
            {/* Left Side: Sticky Phone Mockup */}
            <div className="sticky top-24 h-[600px]">
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* MODIFIED: Added a subtle background and enhanced the phone mockup */}
                    <div className="relative w-full h-full max-w-[300px] aspect-[9/19]">
                      <img src="https://i.imgur.com/7o2xR3l.png" alt="Phone Mockup Frame" className="absolute inset-0 w-full h-full z-10 pointer-events-none" />
                      <div className="absolute inset-[1.5%] rounded-[2.5rem] overflow-hidden bg-gray-900">
                          <AnimatePresence>
                              <motion.img
                                  key={activeFeature}
                                  src={features[activeFeature].image}
                                  alt={features[activeFeature].title}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.5, ease: "easeInOut" }}
                              />
                          </AnimatePresence>
                      </div>
                    </div>
                </div>
            </div>
            {/* Right Side: Feature Descriptions */}
            <div className="space-y-96 pt-16">
                {features.map((feature, index) => (
                    <motion.div key={index} className="min-h-[300px]">
                        <motion.div
                            animate={{ opacity: activeFeature === index ? 1 : 0.3 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <motion.div 
                                    className="p-3 rounded-lg bg-white/10"
                                    animate={{ backgroundColor: `rgba(255, 255, 255, ${activeFeature === index ? 0.1 : 0.05})`}}
                                >
                                    {feature.icon}
                                </motion.div>
                                <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{feature.title}</h3>
                            </div>
                            <p className="text-gray-400 text-lg">{feature.description}</p>
                            <ul className="mt-6 space-y-3">
                                {feature.points.map((point, pIndex) => (
                                    <li key={pIndex} className="flex items-start gap-3 text-gray-300">
                                        <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-1" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const AnimatedCommandBar = () => {
    const commands = [
        "Priya Patel ko 500 ka invoice bhejo",
        "Mera pichle hafte ka profit dikhao",
        "What is the current stock of Shoes?",
        "पिछले महीने का हिसाब देना",
        "Sabse zyada bikne wala item konsa hai?",
        "Total kitne bill bane hai?"
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prevIndex) => (prevIndex + 1) % commands.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-12 flex justify-center items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-full backdrop-blur-md w-full max-w-xl mx-auto shadow-lg shadow-black/30">
            <Mic className="text-blue-400 flex-shrink-0" />
            <div className="w-full text-left overflow-hidden h-6">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={index}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="text-gray-300 absolute"
                    >
                        {commands[index]}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
}


// --- Main Landing Page Component ---
export default function VyapariLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinks = ["Features", "Why Vyapari?", "Testimonials", "Pricing"];
  const router=useRouter()

  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    const result = await installPrompt.prompt();
    console.log(`Install prompt outcome: ${result.outcome}`);
    setInstallPrompt(null);
  };
    
  const featuresData = [
    {
        title: "Voice-Powered Invoicing",
        icon: <Mic size={24} className="text-blue-400" />,
        color: "#3b82f6",
        description: "Say goodbye to tedious typing. Just speak commands in English, Hindi, or Hinglish to create professional, GST-compliant invoices in seconds.",
        image: "https://images.unsplash.com/photo-1599422314077-2c723842476c?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        points: ["Example: 'Rahul ko 10 shirt ka bill banao'", "Auto-fills client and product details.", "Send directly via WhatsApp or Email."]
    },
    {
        title: "Automated GST Reporting",
        icon: <FileText size={24} className="text-purple-400" />,
        color: "#a855f7",
        description: "Generate accurate GSTR-3B reports with a single command. Vyapari handles all the complex calculations, saving you hours of work and ensuring compliance.",
        image: "https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        points: ["Error-free, automated calculations.", "One-click report generation.", "Always compliant with the latest GST norms."]
    },
    {
        title: "Intelligent Inventory",
        icon: <Package size={24} className="text-green-400" />,
        color: "#4ade80",
        description: "Never lose a sale to stockouts. Our smart system tracks your inventory in real-time and sends you low-stock alerts before it's too late.",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=2568&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        points: ["Real-time stock level tracking.", "Customizable low-stock notifications.", "Insights on best-selling products."]
    },
    {
        title: "Conversational Analytics",
        icon: <BarChart3 size={24} className="text-yellow-400" />,
        color: "#facc15",
        description: "Ask your business questions and get instant answers. Understand your sales, profits, and customer behavior without complex dashboards.",
        image: "https://images.unsplash.com/photo-1611974780784-3c5b535f2129?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        points: ["Example: 'Pichle mahine ka profit dikhao'", "Get instant, easy-to-read charts.", "Track business trends effortlessly."]
    }
  ];

  return (
    <div className="bg-gray-950 text-white font-sans overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full z-50 bg-gray-950/70 backdrop-blur-xl border-b border-white/10">
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
          className="container mx-auto px-6 py-4 flex justify-between items-center"
        >
          <div className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Vyapari</div>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-gray-300 hover:text-white transition-colors duration-300">{link}</a>
            ))}
          </nav>
          
          <div className="hidden md:flex items-center gap-4">
            {installPrompt ? (
              <button onClick={handleInstallClick} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-full transition-transform duration-300 hover:scale-105 flex items-center gap-2">
                <Download size={16} /> Install App
              </button>
            ) : (
              <button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-full transition-transform duration-300 hover:scale-105 flex items-center gap-2">
                <Zap size={16} /> Launch App
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:hidden">
            {installPrompt ? (
              <button onClick={handleInstallClick} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-full transition-transform duration-300 hover:scale-105 flex items-center gap-1 text-sm">
                <Download size={14} /> <span>Install</span>
              </button>
            ) : (
              <button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-full transition-transform duration-300 hover:scale-105 flex items-center gap-1 text-sm">
                <Zap size={14} /> <span>Launch</span>
              </button>
            )}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

        </motion.div>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden px-6 pb-4 flex flex-col items-center gap-4 bg-gray-950/90"
          >
             {navLinks.map(link => (
               <a key={link} href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-gray-300 hover:text-white transition-colors duration-300 py-2">{link}</a>
            ))}
          </motion.div>
        )}
      </header>

      <main>
        {/* --- Hero Section --- */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 text-center overflow-hidden">
          {/* MODIFIED: Added a subtle background image */}
          <div 
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
          ></div>
          <div className="absolute inset-0 -z-10 bg-gray-950/80"></div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="container mx-auto px-6"
          >
            <motion.h1 variants={fadeIn('up', 0.1)} className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
              The Business App
              <br/>
              That Listens.
            </motion.h1>
            <motion.p variants={fadeIn('up', 0.2)} className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-8">
              Create invoices, check stock, and get reports—all with your voice. Vyapari is the smartest way to run your business.
            </motion.p>
            <motion.div variants={fadeIn('up', 0.3)} className="flex justify-center items-center gap-4">
              <button onClick={() => router.push('/login')} className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-white/10 flex items-center gap-2">
                Get Started for Free <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
            <motion.div variants={fadeIn('up', 0.4)}>
                <AnimatedCommandBar />
            </motion.div>
          </motion.div>
        </section>

        {/* --- Trusted By Section --- */}
        <section className="py-12 bg-gray-950">
            <div className="container mx-auto px-6 text-center">
                <p className="text-gray-400 mb-8 tracking-widest text-sm">TRUSTED BY OVER 5,000+ MERCHANTS ACROSS INDIA</p>
                <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
                    <motion.div 
                        className="flex gap-16 items-center"
                        animate={{ x: ['0%', '-50%'] }}
                        transition={{ ease: 'linear', duration: 25, repeat: Infinity }}
                    >
                        {["Patanjali", "Haldiram's", "Amul", "Parle", "Bisleri", "Patanjali", "Haldiram's", "Amul", "Parle", "Bisleri"].map((brand, i) => (
                            <div key={i} className="flex-shrink-0 text-gray-500 text-2xl font-bold italic grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
                                {brand}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>

        {/* --- Scrolly-telling Features Section --- */}
        <section id="features" className="py-20 md:py-40 bg-gray-950">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-24">
                    <motion.h2 variants={fadeIn('up')} initial="hidden" whileInView="show" viewport={{once: true}} className="text-4xl md:text-6xl font-bold tracking-tighter">Your Entire Business, in One App.</motion.h2>
                    <motion.p variants={fadeIn('up', 0.1)} initial="hidden" whileInView="show" viewport={{once: true}} className="text-lg text-gray-400 mt-4">From the first sale to the final tax report, Vyapari streamlines every aspect of your business with intelligent automation.</motion.p>
                </div>
                <ScrollyFeature features={featuresData} />
            </div>
        </section>
        
        {/* --- Why Vyapari Section --- */}
        <section id="why-vyapari?" className="py-20 md:py-32 bg-gray-900/50">
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="container mx-auto px-6"
            >
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">Ditch the Old Ways. Embrace the Future.</h2>
                    <p className="text-lg text-gray-400 mt-4">Stop wasting time with outdated methods. See how Vyapari compares.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-white/5 to-white/0 p-8 rounded-2xl border border-white/10 text-center">
                        <BookOpen size={40} className="mx-auto mb-4 text-red-400"/>
                        <h3 className="text-2xl font-bold mb-2">Pen & Paper</h3>
                        <p className="text-gray-400">Prone to errors, difficult to track, and impossible to get insights from. Your data is stuck in a book.</p>
                    </div>
                    <motion.div 
                        className="bg-gradient-to-br from-blue-500/10 to-blue-500/0 p-8 rounded-2xl border-2 border-blue-500 text-center shadow-2xl shadow-blue-500/20"
                        whileHover={{ scale: 1.05, y: -5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <Bot size={40} className="mx-auto mb-4 text-blue-400"/>
                        <h3 className="text-2xl font-bold mb-2">Vyapari AI</h3>
                        <p className="text-gray-300">Instant, accurate, and intelligent. Your data works for you, providing insights and automating tasks with the power of voice.</p>
                    </motion.div>
                    <div className="bg-gradient-to-br from-white/5 to-white/0 p-8 rounded-2xl border border-white/10 text-center">
                        <Calculator size={40} className="mx-auto mb-4 text-yellow-400"/>
                        <h3 className="text-2xl font-bold mb-2">Other Apps</h3>
                        <p className="text-gray-400">Clunky interfaces, limited features, and no real intelligence. They are just digital calculators.</p>
                    </div>
                </div>
            </motion.div>
        </section>

        {/* --- Testimonials Section --- */}
        <section id="testimonials" className="py-20 md:py-32 bg-gray-950">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="container mx-auto px-6"
          >
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Built for India, Trusted by India</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <TestimonialCard
                    quote="This app is a game-changer. My invoicing time has been cut by 80%, and I can finally track my business performance properly."
                    name="Ramesh Kumar"
                    company="Kumar Electronics, Delhi"
                    image="https://i.pravatar.cc/150?u=ramesh"
                />
                <TestimonialCard
                    quote="The inventory management is so simple and effective. I know exactly what I have in stock at all times. Highly recommended for any small shop owner."
                    name="Priya Patel"
                    company="Patel Kirana Store, Ahmedabad"
                    image="https://i.pravatar.cc/150?u=priya"
                />
                <TestimonialCard
                    quote="Finally, a business app that understands the Indian market. The voice commands and GST features are perfect. The support team is also very responsive."
                    name="Sandeep Singh"
                    company="Singh Garments, Ludhiana"
                    image="https://i.pravatar.cc/150?u=sandeep"
                />
            </div>
          </motion.div>
        </section>

        {/* --- CTA Section --- */}
        <section id="pricing" className="py-20 md:py-32">
          <div className="container mx-auto px-6 text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, type: 'spring' }}
              className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-16"
            >
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl"></div>
              <h2 className="relative text-4xl md:text-6xl font-bold tracking-tighter">Stop Managing. Start Growing.</h2>
              <p className="relative max-w-xl mx-auto text-lg text-blue-100 mt-4 mb-8">
                Experience the future of business management. Your first 10 invoices are on us.
              </p>
              <button onClick={()=>router.push('/login')} className="relative bg-white text-blue-600 font-bold py-4 px-10 rounded-full transition-transform duration-300 hover:scale-105 text-lg shadow-2xl">
                Elevate Your Business For Free
              </button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer id="contact" className="border-t border-white/10 py-12">
        <div className="container mx-auto px-6 grid md:grid-cols-4 gap-8 text-gray-400">
            <div className="col-span-1">
                <h3 className="text-xl font-bold text-white mb-2">Vyapari</h3>
                <p className="text-sm">Your Business, Simplified.</p>
            </div>
            <div className="col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                    <h4 className="font-semibold text-white mb-3">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#features" className="hover:text-white">Features</a></li>
                        <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                        <li><a href="#" className="hover:text-white">Updates</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-3">Company</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" className="hover:text-white">About Us</a></li>
                        <li><a href="#" className="hover:text-white">Contact</a></li>
                        <li><a href="#" className="hover:text-white">Careers</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-3">Legal</h4>
                    <ul className="space-y-2 text-sm">
                        <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <div className="container mx-auto px-6 mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Vyapari Technologies Pvt. Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}