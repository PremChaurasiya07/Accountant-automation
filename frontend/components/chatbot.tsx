


// "use client";

// import {
//   useState,
//   useRef,
//   useEffect,
//   FC,
// } from "react";

// import { motion, AnimatePresence } from "framer-motion";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";
// import { MessageCircle, X, Send, Mic, StopCircle } from "lucide-react";
// import { useUserId } from "@/hooks/context/UserContext";
// import { toast } from "@/hooks/use-toast";
// import { supabase } from "@/lib/supabase";
// import { useTheme } from "next-themes";
// import Link from "next/link";

// interface Message {
//   id: number;
//   text: string;
//   isBot: boolean;
// }

// const ChatBot: FC = () => {
//   const { userId, userSession } = useUserId();
//   const [isOpen, setIsOpen] = useState(false);
//   const [message, setMessage] = useState("");
//   const [sellerdata, setsellerdata] = useState<any>(null);
//   const [messages, setMessages] = useState<Message[]>([{
//     id: 1,
//     text: "Hi! I'm your CA Assistant. How can I help you today?",
//     isBot: true,
//   }]);

//   const [isListening, setIsListening] = useState(false);
//   const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
//   const [invoice_no, setinvoice_no] = useState<any>(null);
//   const [isBotTyping, setIsBotTyping] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const transcriptBuffer = useRef("");

//   const { resolvedTheme } = useTheme();

//   const incremented_invoice_no = async () => {
//     if (!userId) return;
//     try {
//       const { data: sellerData, error: sellerError } = await supabase
//         .from("sellers_record")
//         .select("*")
//         .eq("user_id", userId)
//         .maybeSingle();

//       if (sellerError || !sellerData) return;

//       setsellerdata(sellerData);
//       const sellerId = sellerData.id;

//       const { data: invoiceData } = await supabase
//         .from("invoices_record")
//         .select("invoice_no")
//         .eq("seller_id", sellerId)
//         .order("invoice_date", { ascending: false })
//         .order("id", { ascending: false })
//         .limit(1)
//         .maybeSingle();

//       const today = new Date();
//       const year = today.getFullYear();
//       const month = today.getMonth();
//       const fyStart = month >= 3 ? year : year - 1;
//       const fyEnd = (fyStart + 1) % 100;
//       const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;

//       if (!invoiceData) {
//         setinvoice_no(`001/${currentFY}`);
//         return;
//       }

//       const lastInvoice = invoiceData.invoice_no;
//       const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?$/);

//       if (!match) {
//         setinvoice_no(`001/${currentFY}`);
//         return;
//       }

//       const numberPart = match[1];
//       const fyInInvoice = match[2];
//       let newNumber: string;
//       let newFY = fyInInvoice || currentFY;

//       if (fyInInvoice && fyInInvoice !== currentFY) {
//         newNumber = "001";
//         newFY = currentFY;
//       } else {
//         const incremented = (parseInt(numberPart) + 1).toString().padStart(numberPart.length, '0');
//         newNumber = incremented;
//       }

//       const updatedInvoice = `${newNumber}/${newFY}`;
//       setinvoice_no(updatedInvoice);

//     } catch (err) {
//       toast({ title: "Error", description: "Unable to generate invoice number.", variant: "destructive" });
//     }
//   };

//   useEffect(() => {
//     if (!userId) return;
//     incremented_invoice_no();
//   }, [userId]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const sendMessage = async (text: string) => {
//     if (!userId || !text.trim()) return;
//     await incremented_invoice_no();

//     const userMessage = { id: Date.now(), text, isBot: false };
//     setMessages((prev) => [...prev, userMessage]);
//     setMessage("");
//     setIsBotTyping(true);

//     const updatedtext = text.concat(` invoice no: ${invoice_no}, seller data is ${JSON.stringify(sellerdata)}`);

//     fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
//       method: "POST",
//       credentials: "include",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${userSession?.access_token}`,
//       },
//       body: JSON.stringify({ input_value: updatedtext, invoice_no }),
//     })
//       .then(async (res) => {
//         if (!res.ok) {
//           const error = await res.json();
//           throw { response: res, message: error?.message || "Internal Server Error" };
//         }
//         return res.json();
//       })
//       .then((data) => {
//         const botMessageText = data?.url
//           ? `${data.message}\n${data.url}`
//           : data?.message;

//         const botMessage = {
//           id: Date.now() + 1,
//           text: botMessageText,
//           isBot: true,
//         };

//         setMessages((prev) => [...prev, botMessage]);
//       })
//       .catch((err) => {
//         const errorText = err?.message || "❌ Something went wrong. Please try again.";
//         setMessages((prev) => [
//           ...prev,
//           { id: Date.now(), text: `❌ ${errorText}`, isBot: true },
//         ]);
//         toast({
//           title: "Error",
//           description: errorText,
//           variant: "destructive",
//         });
//       })
//       .finally(() => setIsBotTyping(false));
//   };

//   const startListening = () => {
//     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
//     if (!SpeechRecognition) return alert("Speech Recognition not supported");

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = false;
//     recognition.lang = "hi-IN";

//     transcriptBuffer.current = "";
//     setIsListening(true);

//     recognition.onresult = (event: any) => {
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         const result = event.results[i];
//         if (result.isFinal) {
//           const transcript = result[0].transcript.trim();
//           transcriptBuffer.current += transcript + " ";
//         }
//       }
//       setMessage(transcriptBuffer.current.trim());
//     };

//     recognition.onend = () => {
//       setIsListening(false);
//       const finalText = transcriptBuffer.current.trim();
//       if (finalText) {
//         sendMessage(finalText);
//         transcriptBuffer.current = "";
//       }
//     };

//     recognition.start();
//     setRecognitionInstance(recognition);
//   };

//   const stopListening = () => {
//     recognitionInstance?.stop();
//     setIsListening(false);
//   };

//   return (
//     <>
//       <motion.div className="fixed bottom-6 right-6 z-50">
//         <Button onClick={() => setIsOpen(true)} className="w-14 h-14 rounded-full bg-primary">
//           <MessageCircle className="w-6 h-6" />
//         </Button>
//       </motion.div>

//       <AnimatePresence>
//         {isOpen && (
//           <motion.div
//             className="fixed bottom-6 right-1 w-96 h-[32rem] z-50"
//             initial={{ opacity: 0, scale: 0.8 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 0.8 }}
//           >
//             <Card className="flex flex-col h-full">
//               <div className="p-4 border-b flex justify-between items-center">
//                 <div className="flex gap-2 items-center">
//                   <MessageCircle />
//                   <span className="font-semibold">CA Assistant</span>
//                 </div>
//                 <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
//                   <X />
//                 </Button>
//               </div>

//               <div className="flex-1 overflow-y-auto p-4 space-y-3">
//                 {messages.map((msg) => (
//                   <div key={msg.id} className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}>
//                     <div
//                       className={`p-3 rounded-lg max-w-xs whitespace-pre-wrap break-words ${
//                         msg.isBot
//                           ? resolvedTheme === "dark"
//                             ? "bg-muted text-white"
//                             : "bg-gray-100"
//                           : "bg-green-100 text-green-900"
//                       }`}
//                     >
//                       {typeof msg.text === "string" && msg.text.includes("http") ? (
//                         <>
//                           {msg.text.split("http")[0]}
//                           <Link
//                             href={`http${msg.text.split("http")[1]}`}
//                             target="_blank"
//                             className="underline text-blue-500 ml-1"
//                           >
//                             🔗 View Invoice
//                           </Link>
//                         </>
//                       ) : (
//                         msg.text
//                       )}
//                     </div>
//                   </div>
//                 ))}

//                 {isBotTyping && (
//                   <div className="flex justify-start">
//                     <div className={`p-3 rounded-lg max-w-xs text-sm font-medium animate-pulse ${
//                       resolvedTheme === "dark" ? "bg-muted text-white" : "bg-gray-100"
//                     }`}>
//                       <span className="inline-block mr-1">🤖</span>
//                       <span className="inline-block animate-bounce">.</span>
//                       <span className="inline-block animate-bounce [animation-delay:0.2s]">.</span>
//                       <span className="inline-block animate-bounce [animation-delay:0.4s]">.</span>
//                     </div>
//                   </div>
//                 )}

//                 <div ref={messagesEndRef} />
//               </div>

//               <div className="border-t p-3">
//                 {isListening ? (
//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-muted-foreground">🎙️ Listening...</span>
//                     <Button onClick={stopListening} variant="destructive" size="sm">
//                       <StopCircle className="mr-1 w-4 h-4" /> Stop
//                     </Button>
//                   </div>
//                 ) : (
//                   <div className="flex items-center gap-2">
//                     <Button onClick={startListening} variant="outline" size="icon">
//                       <Mic className="w-4 h-4" />
//                     </Button>
//                     <Input
//                       value={message}
//                       onChange={(e) => setMessage(e.target.value)}
//                       onKeyDown={(e) => e.key === "Enter" && sendMessage(message)}
//                       placeholder="Type a message..."
//                       className="flex-1"
//                     />
//                     <Button onClick={() => sendMessage(message)} size="icon">
//                       <Send className="w-4 h-4" />
//                     </Button>
//                   </div>
//                 )}
//               </div>
//             </Card>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       </>
//   );
// };

// export default ChatBot;


//currently
// "use client";

// import { useState, useRef, useEffect, FC } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";
// import { MessageCircle, X, Send, Mic, StopCircle } from "lucide-react";
// import { useUserId } from "@/hooks/context/UserContext";
// import { toast } from "@/hooks/use-toast";
// import { supabase } from "@/lib/supabase";
// import { useTheme } from "next-themes";
// import Link from "next/link";

// interface Message {
//   id: number;
//   text: string;
//   isBot: boolean;
// }

// const ChatBot: FC = () => {
//   const { userId, userSession } = useUserId();
//   const [isOpen, setIsOpen] = useState(false);
//   const [message, setMessage] = useState("");
//   const [sellerdata, setsellerdata] = useState<any>(null);
//   const [messages, setMessages] = useState<Message[]>([
//     {
//       id: 1,
//       text: "Hi! I'm your CA Assistant. How can I help you today?",
//       isBot: true,
//     },

//   ]);

//   const [isListening, setIsListening] = useState(false);
//   const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
//   const [invoice_no, setinvoice_no] = useState<any>(null);
//   const [isBotTyping, setIsBotTyping] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const transcriptBuffer = useRef("");

//   const { resolvedTheme } = useTheme();

//   const incremented_invoice_no = async () => {
//     if (!userId) return;
//     try {
//       const { data: sellerData, error: sellerError } = await supabase
//         .from("sellers_record")
//         .select("*")
//         .eq("user_id", userId)
//         .maybeSingle();

//       if (sellerError || !sellerData) return;

//       setsellerdata(sellerData);
//       const sellerId = sellerData.id;

//       const { data: invoiceData } = await supabase
//         .from("invoices_record")
//         .select("invoice_no")
//         .eq("seller_id", sellerId)
//         .order("invoice_date", { ascending: false })
//         .order("id", { ascending: false })
//         .limit(1)
//         .maybeSingle();

//       const today = new Date();
//       const year = today.getFullYear();
//       const month = today.getMonth();
//       const fyStart = month >= 3 ? year : year - 1;
//       const fyEnd = (fyStart + 1) % 100;
//       const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, "0")}`;

//       if (!invoiceData) {
//         setinvoice_no(`001/${currentFY}`);
//         return;
//       }

//       const lastInvoice = invoiceData.invoice_no;
//       const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?$/);

//       if (!match) {
//         setinvoice_no(`001/${currentFY}`);
//         return;
//       }

//       const numberPart = match[1];
//       const fyInInvoice = match[2];
//       let newNumber: string;
//       let newFY = fyInInvoice || currentFY;

//       if (fyInInvoice && fyInInvoice !== currentFY) {
//         newNumber = "001";
//         newFY = currentFY;
//       } else {
//         const incremented = (parseInt(numberPart) + 1).toString().padStart(numberPart.length, "0");
//         newNumber = incremented;
//       }

//       const updatedInvoice = `${newNumber}/${newFY}`;
//       setinvoice_no(updatedInvoice);
//     } catch (err) {
//       toast({
//         title: "Error",
//         description: "Unable to generate invoice number.",
//         variant: "destructive",
//       });
//     }
//   };

//   useEffect(() => {
//     if (userId) incremented_invoice_no();
//   }, [userId]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const sendMessage = async (text: string) => {
//      if (!text.trim()) return;

//     if (!userId) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: Date.now(),
//           text: "😅 Uh-oh! Looks like you're trying to talk business without logging in. Even I need your ID, boss!",
//           isBot: true,
//         },
//       ]);
//       return;
//     }
//     const {data,error}=await supabase.from("sellers_record").select("*").eq('user_id',userId)
//     if(!data){
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: Date.now(),
//           text: "😅 Uh-oh! First set up your seller profile to use ",
//           isBot: true,
//         },
//       ]);
//       return;
//     }
//     await incremented_invoice_no();

//     const userMessage = { id: Date.now(), text, isBot: false };
//     setMessages((prev) => [...prev, userMessage]);
//     setMessage("");
//     setIsBotTyping(true);

//     const updatedtext = text.concat(
//       ` seller data is ${JSON.stringify(sellerdata)}`
//     );

//    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
//   method: "POST",
//   credentials: "include",
//   headers: {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${userSession?.access_token}`,
//   },
//   body: JSON.stringify({ input_value: updatedtext, invoice_no, user_id: userId }),
// })
//   .then(async (res) => {
//     if (!res.ok) {
//       const error = await res.json();
//       throw { response: res, message: error?.message || "Internal Server Error" };
//     }
//     return res.json();
//   })
//   .then((data) => {
//     const botMessageText = data?.url
//       ? `${data.message}\n${data.url}`
//       : data?.message;

//     // ✅ SPEAK the message
//     if (botMessageText) {
//       const utterance = new SpeechSynthesisUtterance(botMessageText);
//       // Optional: Set language, pitch, rate, voice
//       utterance.lang = "hi-IN"; // or your desired language code
//       utterance.pitch = 1; // normal pitch
//       utterance.rate = 1; // normal speed
//       window.speechSynthesis.speak(utterance);
//     }

//     const botMessage = {
//       id: Date.now() + 1,
//       text: botMessageText,
//       isBot: true,
//     };

//     setMessages((prev) => [...prev, botMessage]);
//   })
//   .catch((err) => {
//     const errorText = err?.message || "❌ Something went wrong. Please try again.";
//     setMessages((prev) => [
//       ...prev,
//       { id: Date.now(), text: `❌ ${errorText}`, isBot: true },
//     ]);
//     toast({
//       title: "Error",
//       description: errorText,
//       variant: "destructive",
//     });
//   })
//   .finally(() => setIsBotTyping(false));

//   };

//   const startListening = () => {
//     const SpeechRecognition =
//       (window as any).webkitSpeechRecognition ||
//       (window as any).SpeechRecognition;
//     if (!SpeechRecognition) return alert("Speech Recognition not supported");

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = false;
//     recognition.lang = "hi-IN";

//     transcriptBuffer.current = "";
//     setIsListening(true);

//     recognition.onresult = (event: any) => {
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         const result = event.results[i];
//         if (result.isFinal) {
//           const transcript = result[0].transcript.trim();
//           transcriptBuffer.current += transcript + " ";
//         }
//       }
//       setMessage(transcriptBuffer.current.trim());
//     };

//     recognition.onend = () => {
//       setIsListening(false);
//       const finalText = transcriptBuffer.current.trim();
//       if (finalText) {
//         sendMessage(finalText);
//         transcriptBuffer.current = "";
//       }
//     };

//     recognition.start();
//     setRecognitionInstance(recognition);
//   };

//   const stopListening = () => {
//     recognitionInstance?.stop();
//     setIsListening(false);
//   };

//   return (
//     <>
//       <motion.div className="fixed bottom-6 right-6 z-50">
//         <Button onClick={() => setIsOpen(true)} className="w-14 h-14 rounded-full bg-primary">
//           <MessageCircle className="w-6 h-6" />
//         </Button>
//       </motion.div>

//       <AnimatePresence>
//         {isOpen && (
//           <motion.div
//             className="fixed bottom-6 right-1 w-[95vw] max-w-md h-[90vh] z-50"
//             initial={{ opacity: 0, scale: 0.8 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 0.8 }}
//           >
//             <Card className="flex flex-col h-full">
//               <div className="p-4 border-b flex justify-between items-center">
//                 <div className="flex gap-2 items-center">
//                   <MessageCircle />
//                   <span className="font-semibold">CA Assistant</span>
//                 </div>
//                 <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
//                   <X />
//                 </Button>
//               </div>

//               <div className="flex-1 overflow-y-auto p-4 space-y-3">
//                 {messages.map((msg) => (
//                   <div key={msg.id} className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}>
//                     <div
//                       className={`p-3 rounded-lg max-w-xs whitespace-pre-wrap break-words ${
//                         msg.isBot
//                           ? resolvedTheme === "dark"
//                             ? "bg-muted text-white"
//                             : "bg-gray-100"
//                           : "bg-green-100 text-green-900"
//                       }`}
//                     >
//                       {typeof msg.text === "string" && msg.text.includes("http") ? (
//                         <>
//                           {msg.text.split("http")[0]}
//                           <Link
//                             href={`http${msg.text.split("http")[1]}`}
//                             target="_blank"
//                             className="underline text-blue-500 ml-1"
//                           >
//                             🔗 View Invoice
//                           </Link>
//                         </>
//                       ) : (
//                         msg.text
//                       )}
//                     </div>
//                   </div>
//                 ))}

//                 {isBotTyping && (
//                   <div className="flex justify-start">
//                     <div
//                       className={`p-3 rounded-lg max-w-xs text-sm font-medium animate-pulse ${
//                         resolvedTheme === "dark"
//                           ? "bg-muted text-white"
//                           : "bg-gray-100"
//                       }`}
//                     >
//                       <span className="inline-block mr-1">🤖</span>
//                       <span className="inline-block animate-bounce">.</span>
//                       <span className="inline-block animate-bounce [animation-delay:0.2s]">.</span>
//                       <span className="inline-block animate-bounce [animation-delay:0.4s]">.</span>
//                     </div>
//                   </div>
//                 )}

//                 <div ref={messagesEndRef} />
//               </div>

//               <div className="border-t p-3">
//                 {isListening ? (
//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-muted-foreground">🎙️ Listening...</span>
//                     <Button onClick={stopListening} variant="destructive" size="sm">
//                       <StopCircle className="mr-1 w-4 h-4" /> Stop
//                     </Button>
//                   </div>
//                 ) : (
//                   <div className="flex items-center gap-2">
//                     <Button onClick={startListening} variant="outline" size="icon">
//                       <Mic className="w-4 h-4" />
//                     </Button>
//                     <Input
//                       value={message}
//                       onChange={(e) => setMessage(e.target.value)}
//                       onKeyDown={(e) => e.key === "Enter" && sendMessage(message)}
//                       placeholder="Type a message..."
//                       className="flex-1"
//                     />
//                     <Button onClick={() => sendMessage(message)} size="icon">
//                       <Send className="w-4 h-4" />
//                     </Button>
//                   </div>
//                 )}
//               </div>
//             </Card>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </>
//   );
// };

// export default ChatBot;


"use client";

import { useState, useRef, useEffect, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, X, Send, Mic, StopCircle, Bot, User } from "lucide-react";
import { useUserId } from "@/hooks/context/UserContext";
import { toast, useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import Link from "next/link";

// --- Type Definitions ---
interface Message {
  id: number;
  text: string;
  isBot: boolean;
  suggestions?: string[];
}

// --- Typing Indicator Component ---
const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-3">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
  </div>
);

// --- Main ChatBot Component ---
const ChatBot: FC = () => {
  const { userId, userSession } = useUserId();
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();

  // --- State Management ---
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sellerdata, setSellerdata] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [invoice_no, setInvoiceNo] = useState<string | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  
  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptBuffer = useRef("");

   const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: sellerData, error: sellerError } = await supabase
          .from("sellers_record")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (sellerError || !sellerData) {
          setMessages([
            { id: 1, text: "Welcome! Please set up your seller profile to get started.", isBot: true },
          ]);
          setIsLoading(false);
          return;
        }
        setSellerdata(sellerData);
        
        await incremented_invoice_no(sellerData.id);

        setMessages([
          {
            id: 1,
            text: "Hi! I'm your CA Assistant. How can I help you today?",
            isBot: true,
            suggestions: ["Create an invoice", "What was my last sale?", "Summarize my monthly earnings"],
          },
        ]);

      } catch (err) {
        toast({ title: "Error", description: "Could not fetch initial data.", variant: "destructive" });
        setMessages([{ id: 1, text: "Sorry, I couldn't load your data. Please try again later.", isBot: true }]);
      } finally {
        setIsLoading(false);
      }
    };

  // --- Initial Data Fetching ---
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

   

    fetchInitialData();
  }, [userId]);

  // --- Auto-scrolling Effect ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  // --- Core Functions ---
  const incremented_invoice_no = async (sellerId: string) => {
    try {
      const { data: invoiceData } = await supabase
        .from("invoices_record")
        .select("invoice_no")
        .eq("seller_id", sellerId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const fyStart = month >= 3 ? year : year - 1;
      const fyEnd = (fyStart + 1) % 100;
      const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, "0")}`;
      let newInvoiceNo = `001/${currentFY}`;

      if (invoiceData?.invoice_no) {
        const match = invoiceData.invoice_no.match(/(\d+)(?:\/(\d{4}-\d{2}))?$/);
        if (match) {
          const numberPart = match[1];
          const fyInInvoice = match[2];
          if (fyInInvoice === currentFY) {
            newInvoiceNo = `${(parseInt(numberPart) + 1).toString().padStart(numberPart.length, "0")}/${currentFY}`;
          }
        }
      }
      setInvoiceNo(newInvoiceNo);
    } catch (err) {
      toast({ title: "Error", description: "Unable to generate invoice number.", variant: "destructive" });
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    if (!userId) {
      setMessages((prev) => [...prev, { id: Date.now(), text: "You need to be logged in to chat.", isBot: true }]);
      return;
    }
    await fetchInitialData()
    if (!sellerdata) {
      setMessages((prev) => [...prev, { id: Date.now(), text: "Please set up your seller profile first.", isBot: true }]);
      return;
    }

    await incremented_invoice_no(sellerdata.id);

    const userMessage = { id: Date.now(), text, isBot: false };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsBotTyping(true);

    const updatedtext = `${text} (Seller data: ${JSON.stringify(sellerdata)})`;

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${userSession?.access_token}` },
      body: JSON.stringify({ input_value: updatedtext, invoice_no, user_id: userId }),
    })
    .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)))
    .then(data => {
      const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message;
      if (botMessageText) {
        const utterance = new SpeechSynthesisUtterance(botMessageText);
        utterance.lang = "en-IN";
        window.speechSynthesis.speak(utterance);
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: botMessageText, isBot: true }]);
      }
    })
    .catch(err => {
      const errorText = err?.message || "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }]);
      toast({ title: "Error", description: errorText, variant: "destructive" });
    })
    .finally(() => setIsBotTyping(false));
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" });

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    transcriptBuffer.current = "";
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      transcriptBuffer.current = finalTranscript;
      setMessage(finalTranscript);
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = transcriptBuffer.current.trim();
      if (finalText) sendMessage(finalText);
    };

    recognition.start();
    setRecognitionInstance(recognition);
  };

  const stopListening = () => {
    recognitionInstance?.stop();
    setIsListening(false);
  };

  // --- Render Logic ---
  return (
    <>
      <motion.div className="fixed bottom-6 right-6 z-50">
        <Button onClick={() => setIsOpen(true)} className="w-16 h-16 rounded-full shadow-lg" size="icon">
          <MessageCircle className="w-8 h-8" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 w-[calc(100vw-3rem)] max-w-md h-[calc(100vh-5rem)] max-h-[700px] z-50"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } }}
            exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }}
          >
            <Card className="flex flex-col h-full w-full shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground p-2 rounded-full"><Bot className="w-5 h-5" /></div>
                  <CardTitle className="text-lg">CA Assistant</CardTitle>
                </div>
                <Button onClick={() => setIsOpen(false)} size="icon" variant="ghost" className="rounded-full"><X /></Button>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-3/4 rounded-lg" />
                    <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
                    <Skeleton className="h-20 w-4/5 rounded-lg" />
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.isBot ? "justify-start" : "justify-end"}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div>}
                      <div className={`p-3 rounded-2xl max-w-sm md:max-w-md whitespace-pre-wrap break-words ${
                        msg.isBot
                          ? "bg-muted rounded-tl-none"
                          : "bg-primary text-primary-foreground rounded-br-none"
                      }`}>
                        {typeof msg.text === "string" && msg.text.includes("http") ? (
                          <>
                            {msg.text.split("http")[0]}
                            <Link href={`http${msg.text.split("http")[1]}`} target="_blank" className="underline font-semibold ml-1">
                              🔗 View Invoice
                            </Link>
                          </>
                        ) : ( msg.text )}
                        {msg.suggestions && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {msg.suggestions.map((s, i) => (
                              <Button key={i} variant="outline" size="sm" className="rounded-full" onClick={() => sendMessage(s)}>{s}</Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {!msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><User className="w-5 h-5" /></div>}
                    </motion.div>
                  ))
                )}
                {isBotTyping && <div className="flex justify-start items-end gap-2"><div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div><TypingIndicator /></div>}
                <div ref={messagesEndRef} />
              </CardContent>

              <CardFooter className="p-3 border-t">
                {isListening ? (
                  <div className="w-full flex justify-center items-center gap-4">
                    <div className="text-sm text-primary flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                      Listening...
                    </div>
                    <Button onClick={stopListening} variant="destructive" size="sm" className="rounded-full">
                      <StopCircle className="mr-1 w-4 h-4" /> Stop
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-2">
                    <Button type="button" onClick={startListening} variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                      <Mic className="w-5 h-5" />
                    </Button>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ask me anything..."
                      className="flex-1 rounded-full"
                    />
                    <Button type="submit" size="icon" className="rounded-full flex-shrink-0">
                      <Send className="w-5 h-5" />
                    </Button>
                  </form>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
