// "use client";

// import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   ArrowRight,
//   Star,
//   Menu,
//   X,
//   FileText,
//   Package,
//   Mic,
//   BarChart3,
//   Bot,
//   CheckCircle,
//   BookOpen,
//   Calculator,
//   Download,
//   Zap,
// } from "lucide-react";
// import { useRouter } from "next/navigation";
// import Image from "next/image"; // Use the optimized Image component
// import Link from "next/link"; // Use Link for internal navigation

// // Make sure your image paths are correct relative to this file
// import chatbot from "../../public/landing/chatbot.png";
// import analytic from "../../public/landing/analytic.png";
// import gstb from "../../public/landing/gstb.png";
// import sampleinvoice from "../../public/landing/sample-invoice.png";
// import inventory from "../../public/landing/inventory.png";
// import { Button } from "@/components/ui/button";
// // --- Animation Variants ---
// const fadeIn = (direction = "up", delay = 0, duration = 1) => ({
//   hidden: {
//     opacity: 0,
//     y: direction === "up" ? 30 : -30,
//     x: direction === "left" ? 30 : direction === "right" ? -30 : 0,
//   },
//   show: {
//     opacity: 1,
//     y: 0,
//     x: 0,
//     transition: { type: "spring", duration, delay, bounce: 0.4 },
//   },
// });

// const staggerContainer = {
//   hidden: {},
//   show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
// };

// // --- Reusable Components ---
// const TestimonialCard = ({ quote, name, company, image }) => (
//   <div className="bg-gradient-to-br from-white/5 to-white/0 p-6 rounded-2xl border border-white/10 h-full flex flex-col backdrop-blur-lg shadow-lg hover:border-white/20 transition-colors">
//     <div className="flex text-yellow-400">
//       {[...Array(5)].map((_, i) => (
//         <Star key={i} fill="currentColor" className="w-5 h-5" />
//       ))}
//     </div>
//     <p className="text-gray-300 italic flex-grow my-4">"{quote}"</p>
//     <div className="flex items-center gap-4 pt-4 border-t border-white/10">
//       <img
//         src={image}
//         alt={name}
//         className="w-12 h-12 rounded-full object-cover"
//       />
//       <div>
//         <h4 className="font-bold text-white">{name}</h4>
//         <p className="text-sm text-gray-400">{company}</p>
//       </div>
//     </div>
//   </div>
// );

// // ✅ UPDATED: Component for the sticky phone mockup
// const PhoneMockup = ({ activeImage }) => {
//   return (
//     <div className="ml-auto relative w-full max-w-[185px] md:max-w-[280px] aspect-[9/19] bg-black border-4 border-gray-700 rounded-[2.8rem] shadow-2xl shadow-black/60 p-2 pointer-events-auto">
//       <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-gray-900">
//         <AnimatePresence>
//           <motion.img
//             key={activeImage.src}
//             src={activeImage.src}
//             alt="Feature"
//             className="absolute inset-0 w-full h-full object-fill object-top"
//             initial={{ opacity: 0, scale: 0.95 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 0.95 }}
//             transition={{ duration: 0.5, ease: "easeInOut" }}
//           />
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// // ✅ UPDATED: Component for a single feature's text content
// const FeatureText = ({ feature, onInView }) => {
//   return (
//     <motion.div
//       className="min-h-[300px] w-full max-w-lg text-center"
//       onViewportEnter={onInView}
//       viewport={{ amount: 0.5 }}
//     >
//       <div className="flex items-center justify-center gap-4 mb-4">
//         <div className="p-3 rounded-lg bg-white/10">{feature.icon}</div>
//         <h3 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
//           {feature.title}
//         </h3>
//       </div>
//       <p className="text-gray-400 text-lg">{feature.description}</p>
//       <ul className="mt-6 space-y-3 inline-block text-left">
//         {feature.points.map((point, pIndex) => (
//           <li key={pIndex} className="flex items-start gap-3 text-gray-300">
//             <CheckCircle
//               size={20}
//               className="text-green-500 flex-shrink-0 mt-1"
//             />
//             <span>{point}</span>
//           </li>
//         ))}
//       </ul>
//     </motion.div>
//   );
// };

// const AnimatedCommandBar = () => {
//   const commands = [
//     "Priya Patel ko 500 ka invoice bhejo",
//     "Mera pichle hafte ka profit dikhao",
//     "What is the current stock of Shoes?",
//     "पिछले महीने का हिसाब देना",
//     "Sabse zyada bikne wala item konsa hai?",
//     "Total kiti bill banlele aahe?",
//   ];
//   const [index, setIndex] = useState(0);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setIndex((prevIndex) => (prevIndex + 1) % commands.length);
//     }, 3000);
//     return () => clearInterval(interval);
//   }, [commands.length]);

//   return (
//     <div className="mt-12 flex justify-center items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-full backdrop-blur-md w-full max-w-xl mx-auto shadow-lg shadow-black/30">
//       <Mic className="text-blue-400 flex-shrink-0" />
//       <div className="w-full text-left overflow-hidden h-6 relative">
//         <AnimatePresence mode="wait">
//           <motion.span
//             key={index}
//             initial={{ y: 20, opacity: 0 }}
//             animate={{ y: 0, opacity: 1 }}
//             exit={{ y: -20, opacity: 0 }}
//             transition={{ duration: 0.4, ease: "easeInOut" }}
//             className="text-gray-300 absolute w-full"
//           >
//             {commands[index]}
//           </motion.span>
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// };

// // --- Main Landing Page Component ---
// export default function VyapariLandingPage() {
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const navLinks = ["Features", "Why Vyapari?", "Pricing"];
//   const router = useRouter();

//   const [installPrompt, setInstallPrompt] = useState(null);
//   const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

//   useEffect(() => {
//     const handleBeforeInstallPrompt = (event) => {
//       event.preventDefault();
//       setInstallPrompt(event);
//     };
//     window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
//     return () => {
//       window.removeEventListener(
//         "beforeinstallprompt",
//         handleBeforeInstallPrompt
//       );
//     };
//   }, []);

//   const handleInstallClick = async () => {
//     if (!installPrompt) {
//       return;
//     }
//     const result = await installPrompt.prompt();
//     console.log(`Install prompt outcome: ${result.outcome}`);
//     setInstallPrompt(null);
//   };

//   const featuresData = [
//     {
//       title: "Voice-Powered Invoicing",
//       icon: <Mic size={24} className="text-blue-400" />,
//       description:
//         "Say goodbye to tedious typing. Just speak commands in English, Hindi, or Hinglish to create professional, GST-compliant invoices in seconds.",
//       image: chatbot,
//       points: [
//         "Example: 'Rahul ko 10 shirt ka bill banao'",
//         "Auto-fills client and product details.",
//         "Send directly via WhatsApp or Email.",
//       ],
//     },
//     {
//       title: "From Voice to Pro Invoice in 8 Seconds",
//       icon: <Mic size={24} className="text-blue-400" />,
//       description:
//         "Impress your clients with polished, professional invoices created in record time. Our advanced AI listens to your command and generates a perfect, GST-compliant invoice in under 8 seconds. No typing, no hassle.",
//       image: sampleinvoice, // Using sampleinvoice for this as a placeholder
//       points: [
//         "Generate flawless, branded invoices that build client trust.",
//         "Eliminates manual errors and ensures 100% GST compliance.",
//         "Send instantly via WhatsApp or Email to get paid faster.",
//       ],
//     },
//     {
//       title: "Automated GST Reporting",
//       icon: <FileText size={24} className="text-purple-400" />,
//       description:
//         "Generate accurate GSTR-3B reports with a single command. Vyapari handles all the complex calculations, saving you hours of work and ensuring compliance.",
//       image: gstb, // Using gstb for this as a placeholder
//       points: [
//         "Error-free, automated calculations.",
//         "One-click report generation.",
//         "Always compliant with the latest GST norms.",
//       ],
//     },
//     {
//       title: "Intelligent Inventory",
//       icon: <Package size={24} className="text-green-400" />,
//       description:
//         "Never lose a sale to stockouts. Our smart system tracks your inventory in real-time and sends you low-stock alerts before it's too late.",
//       image: inventory, // Using inventory for this as a placeholder
//       points: [
//         "Real-time stock level tracking.",
//         "Customizable low-stock notifications.",
//         "Insights on best-selling products.",
//       ],
//     },
//     {
//       title: "Conversational Analytics",
//       icon: <BarChart3 size={24} className="text-yellow-400" />,
//       description:
//         "Ask your business questions and get instant answers. Understand your sales, profits, and customer behavior without complex dashboards.",
//       image: analytic,
//       points: [
//         "Example: 'Pichle mahine ka profit dikhao'",
//         "Get instant, easy-to-read charts.",
//         "Track business trends effortlessly.",
//       ],
//     },
//   ];

//   return (
//     <div className="bg-gray-950 text-white font-sans">
//       <header className="fixed top-0 left-0 w-full z-50 bg-gray-950/70 backdrop-blur-xl border-b border-white/10">
//         <motion.div
//           initial={{ y: -100 }}
//           animate={{ y: 0 }}
//           transition={{ type: "spring", stiffness: 100 }}
//           className="container mx-auto px-6 py-4 flex justify-between items-center"
//         >
//           {/* --- THE FIX: Logo and Brand Name Wrapper --- */}
//           <Link href="/" className="flex items-center gap-2">
//             <Image
//               src="/icons/maskable_icon.png"
//               alt="Vyapari AI Logo"
//               width={60} // The actual width of your image file
//               height={60} // The actual height of your image file
//               className="h-9 w-auto" // Control the display size
//             />
//             <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//               Vyapari
//             </span>
//           </Link>

//                 <nav className="hidden md:flex items-center gap-8">
//                     {navLinks.map(link => (
//                         <Link key={link} href={`#${link.toLowerCase().replace(/\?| /g, '-')}`} className="text-gray-300 hover:text-white transition-colors duration-300">{link}</Link>
//                     ))}
//                 </nav>
                
//                 <div className="flex items-center gap-2">
//                     {installPrompt ? (
//                         <Button onClick={handleInstallClick} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-full transition-transform duration-300 hover:scale-105 flex items-center gap-2">
//                             <Download size={16} /> Install App
//                         </Button>
//                     ) : (
//                         <Button onClick={() => router.push('/login')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-full transition-transform duration-300 hover:scale-105 flex items-center gap-1">
//                             <Zap size={16} /> Launch App
//                         </Button>
//                     )}
//                 </div>
                
               

//           <div className="flex items-center gap-2 md:hidden">
//             {/* Simplified mobile buttons */}
//             {/* <Button
//               onClick={() => router.push("/login")}
//               size="sm"
//               className="rounded-full"
//             >
//               Launch
//             </Button> */}
//             <Button
//               onClick={() => setIsMenuOpen(!isMenuOpen)}
//               variant="ghost"
//               size="icon"
//             >
//               {isMenuOpen ? <X /> : <Menu />}
//             </Button>
//           </div>
//         </motion.div>

//         <AnimatePresence>
//           {isMenuOpen && (
//             <motion.div
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: "auto" }}
//               exit={{ opacity: 0, height: 0 }}
//               className="md:hidden overflow-hidden"
//             >
//               <div className="px-6 pb-4 flex flex-col items-center gap-4 bg-gray-950/90">
//                 {navLinks.map((link) => (
//                   <Link
//                     key={link}
//                     href={`#${link.toLowerCase().replace(/\?| /g, "-")}`}
//                     onClick={() => setIsMenuOpen(false)}
//                     className="text-gray-300 hover:text-white transition-colors duration-300 py-2"
//                   >
//                     {link}
//                   </Link>
//                 ))}
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </header>

//       <main>
//         {/* --- Hero Section --- */}
//         <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 text-center overflow-hidden">
//           <div
//             className="absolute inset-0 -z-20 bg-cover bg-center"
//             style={{
//               backgroundImage:
//                 "url('https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3')",
//             }}
//           ></div>
//           <div className="absolute inset-0 -z-10 bg-gray-950/80"></div>

//           <motion.div
//             variants={staggerContainer}
//             initial="hidden"
//             animate="show"
//             className="container mx-auto px-6"
//           >
//             <motion.h1
//               variants={fadeIn("up", 0.1)}
//               className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400"
//             >
//               The Business App
//               <br />
//               That Listens.
//             </motion.h1>
//             <motion.p
//               variants={fadeIn("up", 0.2)}
//               className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-8"
//             >
//               Create invoices, check stock, and get reports—all with your voice.
//               Vyapari is the smartest way to run your business.
//             </motion.p>
//             <motion.div
//               variants={fadeIn("up", 0.3)}
//               className="flex justify-center items-center gap-4"
//             >
//               <button
//                 onClick={() => router.push("/login")}
//                 className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-white/10 flex items-center gap-2"
//               >
//                 Get Started for Free <ArrowRight className="w-5 h-5" />
//               </button>
//             </motion.div>
//             <motion.div variants={fadeIn("up", 0.4)}>
//               <AnimatedCommandBar />
//             </motion.div>
//           </motion.div>
//         </section>

//         {/* --- Trusted By Section --- */}
//         {/* <section className="py-12 bg-gray-950">
//             <div className="container mx-auto px-6 text-center">
//                 <p className="text-gray-400 mb-8 tracking-widest text-sm uppercase">Trusted by over 5,000+ merchants across India</p>
//                 <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]">
//                     <motion.div 
//                         className="flex gap-16 items-center"
//                         animate={{ x: ['0%', '-50%'] }}
//                         transition={{ ease: 'linear', duration: 25, repeat: Infinity }}
//                     >
//                         {["Patanjali", "Haldiram's", "Amul", "Parle", "Bisleri", "Patanjali", "Haldiram's", "Amul", "Parle", "Bisleri"].map((brand, i) => (
//                             <div key={i} className="flex-shrink-0 text-gray-500 text-2xl font-bold italic grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
//                                 {brand}
//                             </div>
//                         ))}
//                     </motion.div>
//                 </div>
//             </div>
//         </section> */}

//         {/* --- Features Section --- */}
//         <section id="features" className="py-20 md:py-40 bg-gray-950 relative">
//           <div className="container mx-auto px-6">
//             {/* Section Title */}
//             <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
//               <motion.h2
//                 variants={fadeIn("up")}
//                 initial="hidden"
//                 whileInView="show"
//                 viewport={{ once: true }}
//                 className="text-4xl md:text-6xl font-bold tracking-tighter"
//               >
//                 Your Entire Business, in One App.
//               </motion.h2>
//               <motion.p
//                 variants={fadeIn("up", 0.1)}
//                 initial="hidden"
//                 whileInView="show"
//                 viewport={{ once: true }}
//                 className="text-lg text-gray-400 mt-4"
//               >
//                 From the first sale to the final tax report, Vyapari streamlines
//                 every aspect of your business with intelligent automation.
//               </motion.p>
//             </div>

//             {/* Sticky Phone Container (Layered on top) */}
//             <div className="sticky top-0 h-screen flex items-center justify-center w-full z-20 pointer-events-none">
//               <PhoneMockup
//                 activeImage={featuresData[activeFeatureIndex].image}
//               />
//             </div>

//             {/* Scrolling Text Content (Layered behind) */}
//             <div className="relative z-10 flex flex-col items-center gap-96 pt-24 pb-24">
//               {featuresData.map((feature, index) => (
//                 <FeatureText
//                   key={index}
//                   feature={feature}
//                   onInView={() => setActiveFeatureIndex(index)}
//                 />
//               ))}
//             </div>
//           </div>
//         </section>

//         {/* --- Why Vyapari Section --- */}
//         <section id="why-vyapari-" className="py-20 md:py-32 bg-gray-900/50">
//           <motion.div
//             variants={staggerContainer}
//             initial="hidden"
//             whileInView="show"
//             viewport={{ once: true, amount: 0.2 }}
//             className="container mx-auto px-6"
//           >
//             <div className="text-center max-w-3xl mx-auto mb-16">
//               <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
//                 Ditch the Old Ways. Embrace the Future.
//               </h2>
//               <p className="text-lg text-gray-400 mt-4">
//                 Stop wasting time with outdated methods. See how Vyapari
//                 compares.
//               </p>
//             </div>
//             <div className="grid md:grid-cols-3 gap-8">
//               <div className="bg-gradient-to-br from-white/5 to-white/0 p-8 rounded-2xl border border-white/10 text-center">
//                 <BookOpen size={40} className="mx-auto mb-4 text-red-400" />
//                 <h3 className="text-2xl font-bold mb-2">Pen & Paper</h3>
//                 <p className="text-gray-400">
//                   Prone to errors, difficult to track, and impossible to get
//                   insights from. Your data is stuck in a book.
//                 </p>
//               </div>
//               <motion.div
//                 className="bg-gradient-to-br from-blue-500/10 to-blue-500/0 p-8 rounded-2xl border-2 border-blue-500 text-center shadow-2xl shadow-blue-500/20"
//                 whileHover={{ scale: 1.05, y: -5 }}
//                 transition={{ type: "spring", stiffness: 300 }}
//               >
//                 <Bot size={40} className="mx-auto mb-4 text-blue-400" />
//                 <h3 className="text-2xl font-bold mb-2">Vyapari AI</h3>
//                 <p className="text-gray-300">
//                   Instant, accurate, and intelligent. Your data works for you,
//                   providing insights and automating tasks with the power of
//                   voice.
//                 </p>
//               </motion.div>
//               <div className="bg-gradient-to-br from-white/5 to-white/0 p-8 rounded-2xl border border-white/10 text-center">
//                 <Calculator
//                   size={40}
//                   className="mx-auto mb-4 text-yellow-400"
//                 />
//                 <h3 className="text-2xl font-bold mb-2">Other Apps</h3>
//                 <p className="text-gray-400">
//                   Clunky interfaces, limited features, and no real intelligence.
//                   They are just digital calculators.
//                 </p>
//               </div>
//             </div>
//           </motion.div>
//         </section>

//         {/* --- Testimonials Section --- */}
//         {/* <section id="testimonials" className="py-20 md:py-32 bg-gray-950">
//           <motion.div
//             variants={staggerContainer}
//             initial="hidden"
//             whileInView="show"
//             viewport={{ once: true, amount: 0.2 }}
//             className="container mx-auto px-6"
//           >
//             <div className="text-center max-w-2xl mx-auto mb-16">
//               <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">
//                 Built for Businesses. Trusted by Businessmen.
//               </h2>
//             </div>
//             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//               <TestimonialCard
//                 quote="This app is a game-changer. My invoicing time has been cut by 80%, and I can finally track my business performance properly."
//                 name="Ramesh Kumar"
//                 company="Kumar Electronics, Delhi"
//                 image="https://i.pravatar.cc/150?u=ramesh"
//               />
//               <TestimonialCard
//                 quote="The inventory management is so simple and effective. I know exactly what I have in stock at all times. Highly recommended for any small shop owner."
//                 name="Priya Patel"
//                 company="Patel Kirana Store, Ahmedabad"
//                 image="https://i.pravatar.cc/150?u=priya"
//               />
//               <TestimonialCard
//                 quote="Finally, a business app that understands the Indian market. The voice commands and GST features are perfect. The support team is also very responsive."
//                 name="Sandeep Singh"
//                 company="Singh Garments, Ludhiana"
//                 image="https://i.pravatar.cc/150?u=sandeep"
//               />
//             </div>
//           </motion.div>
//         </section> */}

//         {/* --- CTA Section --- */}
//         <section id="pricing" className="py-20 md:py-32">
//           <div className="container mx-auto px-6 text-center">
//             <motion.div
//               initial={{ opacity: 0, scale: 0.8 }}
//               whileInView={{ opacity: 1, scale: 1 }}
//               viewport={{ once: true }}
//               transition={{ duration: 0.8, type: "spring" }}
//               className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-16"
//             >
//               <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl"></div>
//               <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl"></div>
//               <h2 className="relative text-4xl md:text-6xl font-bold tracking-tighter">
//                 Stop Managing. Start Growing.
//               </h2>
//               <p className="relative max-w-xl mx-auto text-lg text-blue-100 mt-4 mb-8">
//                 Experience the future of business management. Your first 10
//                 invoices are on us.
//               </p>
//               <button
//                 onClick={() => router.push("/login")}
//                 className="relative bg-white text-blue-600 font-bold py-4 px-10 rounded-full transition-transform duration-300 hover:scale-105 text-lg shadow-2xl"
//               >
//                 Elevate Your Business For Free
//               </button>
//             </motion.div>
//           </div>
//         </section>
//       </main>

//       {/* --- Footer --- */}
//       <footer id="contact" className="border-t border-white/10 py-12">
//         <div className="container mx-auto px-6 grid md:grid-cols-4 gap-8 text-gray-400">
//           <div className="col-span-1">
//             <h3 className="text-xl font-bold text-white mb-2">Vyapari</h3>
//             <p className="text-sm">Your Business, Simplified.</p>
//           </div>
//           <div className="col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
//             <div>
//               <h4 className="font-semibold text-white mb-3">Product</h4>
//               <ul className="space-y-2 text-sm">
//                 <li>
//                   <a href="#features" className="hover:text-white">
//                     Features
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#pricing" className="hover:text-white">
//                     Pricing
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Updates
//                   </a>
//                 </li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="font-semibold text-white mb-3">Company</h4>
//               <ul className="space-y-2 text-sm">
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     About Us
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Contact
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Careers
//                   </a>
//                 </li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="font-semibold text-white mb-3">Legal</h4>
//               <ul className="space-y-2 text-sm">
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Privacy Policy
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Terms of Service
//                   </a>
//                 </li>
//               </ul>
//             </div>
//           </div>
//         </div>
//         <div className="container mx-auto px-6 mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
//           <p>
//             &copy; {new Date().getFullYear()} Vyapari Technologies Pvt. Ltd. All
//             rights reserved.
//           </p>
//         </div>
//       </footer>
//     </div>
//   );
// }


"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { ArrowRight, Star, Menu, X, FileText, Package, Mic, BarChart3, Bot, CheckCircle, BrainCircuit, Zap, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// --- Image Imports (ensure paths are correct) ---
import chatInvoiceFeatureImage from "../../public/landing/chatbot.png"; 
import inventoryFeatureImage from "../../public/landing/inventory.png";
import analyticsFeatureImage from "../../public/landing/analytic.png";
import gstFeatureImage from "../../public/landing/gstb.png";
// --- NEW: Template Images ---
import template1 from "../../public/template/temp1.png";
import template2 from "../../public/template/temp2.png";


// --- Animation Variants ---
const fadeIn = (direction = "up", delay = 0, duration = 0.8) => ({
  hidden: {
    opacity: 0,
    y: direction === "up" ? 20 : -20,
    x: direction === "left" ? 20 : direction === "right" ? -20 : 0,
  },
  show: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { type: "spring", duration, delay, bounce: 0.3 },
  },
});

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// --- Reusable UI Components ---

const AnimatedCommandBar = () => {
  const commands = [ "Priya Patel ko 500 ka invoice bhejo", "Mera pichle hafte ka profit dikhao", "Sabse zyada bikne wala item konsa hai?", ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % commands.length), 3000);
    return () => clearInterval(interval);
  }, [commands.length]);

  return (
    <div className="mt-8 flex justify-center items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-full backdrop-blur-md w-full max-w-md mx-auto shadow-lg shadow-black/30">
      <Mic className="text-blue-400 flex-shrink-0" />
      <div className="w-full text-left overflow-hidden h-6 relative">
        <AnimatePresence mode="wait">
          <motion.span key={index} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="text-gray-300 absolute w-full">
            {commands[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

const TestimonialCard = ({ quote, name, company, image }) => (
    <motion.div variants={fadeIn("up")} className="bg-gradient-to-br from-white/5 to-white/0 p-6 rounded-2xl border border-white/10 h-full flex flex-col backdrop-blur-lg shadow-lg hover:border-white/20 transition-colors">
        <div className="flex text-yellow-400">{[...Array(5)].map((_, i) => <Star key={i} fill="currentColor" className="w-5 h-5" />)}</div>
        <p className="text-gray-300 italic flex-grow my-4">"{quote}"</p>
        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
            <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover"/>
            <div><h4 className="font-bold text-white">{name}</h4><p className="text-sm text-gray-400">{company}</p></div>
        </div>
    </motion.div>
);


// --- Main Landing Page Component ---
export default function VyapariLandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const features = [
    {
      title: "Chat & Voice Invoicing",
      description: "Experience the magic. Create professional, GST-compliant invoices in seconds just by talking to the Vyapari Assistant. No more tedious typing.",
      icon: <Mic size={24} className="text-blue-400" />,
      image: chatInvoiceFeatureImage,
    },
    {
      title: "Intelligent Inventory",
      description: "Never lose a sale to stockouts again. Our smart system tracks your inventory in real-time and sends you low-stock alerts before it's too late.",
      icon: <Package size={24} className="text-green-400" />,
      image: inventoryFeatureImage,
    },
    {
      title: "Conversational Analytics",
      description: "Ask your business questions and get instant, easy-to-understand answers. Understand sales, profits, and customer behavior without complex dashboards.",
      icon: <BarChart3 size={24} className="text-yellow-400" />,
      image: analyticsFeatureImage,
    },
    {
        title: "Automated GST Reporting",
        description: "Generate accurate GSTR reports with a single command. Vyapari handles all complex calculations, saving you hours and ensuring compliance.",
        icon: <FileText size={24} className="text-purple-400" />,
        image: gstFeatureImage,
      },
  ];
  
  const templateSectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
      target: templateSectionRef,
      offset: ["start end", "end start"],
  });
  
  const templateY1 = useTransform(scrollYProgress, [0, 1], [-100, 100]);
  const templateY2 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const templateRotate1 = useTransform(scrollYProgress, [0, 1], [-10, 5]);
  const templateRotate2 = useTransform(scrollYProgress, [0, 1], [10, -5]);

  return (
    <div className="bg-[#0A0A0A] text-white font-sans overflow-x-hidden">
      
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0A0A0A]/70 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
                <Image src="/icons/maskable_icon.png" alt="Vyapari AI Logo" width={60} height={60} className="h-9 w-auto"/>
                <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Vyapari</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
                {["Features", "Templates", "Testimonials", "Pricing"].map(link => <Link key={link} href={`#${link.toLowerCase().replace("?", "")}`} className="text-gray-300 hover:text-white transition-colors">{link}</Link>)}
            </nav>
            <div className="hidden md:flex items-center gap-2">
                <Button onClick={() => router.push('/login')} variant="ghost" className="text-gray-300 hover:text-white">Log In</Button>
                <Button onClick={() => router.push('/signup')} className="bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-transform hover:scale-105">Sign Up Free</Button>
            </div>
            <div className="md:hidden">
                <Button onClick={() => setIsMenuOpen(!isMenuOpen)} variant="ghost" size="icon">{isMenuOpen ? <X/> : <Menu />}</Button>
            </div>
        </div>
        <AnimatePresence>
            {isMenuOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="md:hidden overflow-hidden">
                    <div className="px-6 pb-4 flex flex-col items-center gap-4 border-t border-white/10">
                        {["Features", "Templates", "Testimonials", "Pricing"].map(link => <Link key={link} href={`#${link.toLowerCase().replace("?", "")}`} onClick={() => setIsMenuOpen(false)} className="text-gray-300 py-2">{link}</Link>)}
                        <Button onClick={() => { router.push('/login'); setIsMenuOpen(false); }} className="w-full mt-2">Log In</Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </header>

      <main>
        {/* --- HERO SECTION --- */}
        <section className="relative pt-36 pb-20 md:pt-48 md:pb-32 text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]">
              <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,#2E57D2_0%,#0A0A0A_50%)] animate-[spin_20s_linear_infinite]"/>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="container mx-auto px-6 relative z-10">
                <motion.h1 variants={fadeIn("up")} className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
                    Stop Typing, <br /> Start Talking.
                </motion.h1>
                <motion.p variants={fadeIn("up", 0.1)} className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 mb-8">
                    Create invoices, check stock, and get business reports—all with your voice. Vyapari is the smartest & fastest way to run your business in India.
                </motion.p>
                <motion.div variants={fadeIn("up", 0.2)} className="flex justify-center">
                    <Button onClick={() => router.push('/signup')} size="lg" className="bg-white text-black font-bold py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-white/20 flex items-center gap-2 text-lg">
                        Get Started for Free <ArrowRight className="w-5 h-5" />
                    </Button>
                </motion.div>
                <motion.div variants={fadeIn("up", 0.3)}>
                  <AnimatedCommandBar />
                </motion.div>
            </motion.div>
        </section>

        {/* --- SCROLLING FEATURES SECTION --- */}
        <section id="features" className="py-20 md:py-32">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
                    <motion.h2 variants={fadeIn()} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-4xl md:text-6xl font-bold tracking-tighter">
                        Your Entire Business, in One App.
                    </motion.h2>
                    <motion.p variants={fadeIn(undefined, 0.1)} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-lg text-gray-400 mt-4">
                        From the first sale to the final tax report, Vyapari streamlines every task with intelligent, voice-first automation.
                    </motion.p>
                </div>

                <div className="space-y-32 md:space-y-48">
                    {features.map((feature, index) => {
                        const targetRef = useRef(null);
                        const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start end", "end start"] });
                        const opacity = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], [0, 1, 1, 0]);
                        const scale = useTransform(scrollYProgress, [0.2, 0.4, 0.6, 0.8], [0.8, 1, 1, 0.8]);
                        const x = useTransform(scrollYProgress, [0.3, 0.5], [index % 2 === 0 ? -100 : 100, 0]);
                        
                        return (
                            <motion.div ref={targetRef} key={index} style={{ opacity }} className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">
                                <div className={`md:order-${index % 2 === 0 ? 1 : 2}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-lg bg-white/10">{feature.icon}</div>
                                        <h3 className="text-2xl md:text-3xl font-bold">{feature.title}</h3>
                                    </div>
                                    <p className="text-gray-400 text-lg">{feature.description}</p>
                                </div>
                                <motion.div style={{ scale, x }} className={`md:order-${index % 2 === 0 ? 2 : 1}`}>
                                    <Image src={feature.image} alt={feature.title} className="rounded-2xl shadow-2xl shadow-black/50 border-4 border-white/10" />
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
        
        {/* --- NEW TEMPLATES SECTION --- */}
        <section id="templates" className="py-20 md:py-32 bg-[#101010]/50" ref={templateSectionRef}>
            <div className="container mx-auto px-6 text-center">
                <motion.h2 variants={fadeIn()} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-4xl md:text-6xl font-bold tracking-tighter">
                    Look Professional, Get Paid Faster.
                </motion.h2>
                <motion.p variants={fadeIn(undefined, 0.1)} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">
                    Choose from a variety of beautifully crafted, GST-compliant invoice templates that match your brand and impress your clients.
                </motion.p>
            </div>
            <div className="relative h-[600px] w-full mt-16 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
                <motion.div style={{ y: templateY1, rotate: templateRotate1 }} className="absolute left-[10%] top-0 w-[40%] md:w-[30%]">
                    <Image src={template1} alt="Invoice Template 1" className="rounded-2xl shadow-2xl shadow-black/50 border-4 border-white/10" />
                </motion.div>
                <motion.div style={{ y: templateY2, rotate: templateRotate2 }} className="absolute right-[10%] top-0 w-[40%] md:w-[30%]">
                    <Image src={template2} alt="Invoice Template 2" className="rounded-2xl shadow-2xl shadow-black/50 border-4 border-white/10" />
                </motion.div>
            </div>
        </section>

        {/* --- HOW IT WORKS SECTION --- */}
        <section className="py-20 md:py-32">
            <div className="container mx-auto px-6 text-center">
                 <motion.h2 variants={fadeIn()} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                    As Easy As 1-2-3
                </motion.h2>
                 <motion.p variants={fadeIn(undefined, 0.1)} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-lg text-gray-400 max-w-2xl mx-auto mb-16">
                    Our powerful AI handles the complexity so you can focus on your business.
                </motion.p>
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: <Mic size={32}/>, title: "Speak Your Command", desc: "Just tell Vyapari what you need in your natural language." },
                        { icon: <BrainCircuit size={32}/>, title: "AI Understands & Acts", desc: "Our AI processes your command, finds data, and does the work." },
                        { icon: <CheckCircle size={32}/>, title: "Get Instant Results", desc: "Receive your invoice, report, or answer in seconds." }
                    ].map((step, i) => (
                        <motion.div key={i} variants={fadeIn("up", i * 0.1)} initial="hidden" whileInView="show" viewport={{ once: true }} className="bg-white/5 p-8 rounded-2xl border border-white/10">
                            <div className="p-4 bg-blue-500/10 rounded-xl inline-block mb-4 text-blue-400">{step.icon}</div>
                            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                            <p className="text-gray-400">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

        {/* --- TESTIMONIALS SECTION --- */}
        <section id="testimonials" className="py-20 md:py-32 bg-[#101010]/50">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Built for India. Trusted by Indians.</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <TestimonialCard quote="This app is a game-changer. My invoicing time is cut by 80%, and I finally track my business properly." name="Ramesh Kumar" company="Kumar Electronics, Delhi" image="https://i.pravatar.cc/150?u=ramesh" />
              <TestimonialCard quote="The inventory management is so simple. I know exactly what I have in stock. Highly recommended for any small shop owner." name="Priya Patel" company="Patel Kirana Store, Ahmedabad" image="https://i.pravatar.cc/150?u=priya"/>
              <TestimonialCard quote="Finally, an app that understands our market. The voice commands and GST features are perfect. The support is also very responsive." name="Sandeep Singh" company="Singh Garments, Ludhiana" image="https://i.pravatar.cc/150?u=sandeep" />
            </div>
          </motion.div>
        </section>

        {/* --- CTA SECTION --- */}
        <section id="pricing" className="py-20 md:py-32">
          <div className="container mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, type: "spring" }} className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 md:p-16">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full filter blur-2xl"></div>
              <h2 className="relative text-4xl md:text-6xl font-bold tracking-tighter">Stop Managing. Start Growing.</h2>
              <p className="relative max-w-xl mx-auto text-lg text-blue-100 mt-4 mb-8">Experience the future of business management. Your first 10 invoices are on us. No credit card required.</p>
              <Button onClick={() => router.push('/signup')} size="lg" className="relative bg-white text-blue-600 font-bold py-4 px-10 rounded-full transition-transform duration-300 hover:scale-105 text-lg shadow-2xl hover:bg-gray-200">
                Claim Your Free Invoices
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Vyapari Technologies Pvt. Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}