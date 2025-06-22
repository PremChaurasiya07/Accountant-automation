
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



// interface Message {
//   id: number;
//   text: string;
//   isBot: boolean;
// }

// const ChatBot: FC = () => {
//   const {userId}= useUserId();
//   const {userSession}= useUserId()
//   const [isOpen, setIsOpen] = useState(false);
//   const [message, setMessage] = useState("");
//   const [sellerdata, setsellerdata] = useState(null);
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
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const transcriptBuffer = useRef("");

//   const incremented_invoice_no = async () => {
    
//     console.log(userId)
//               try {
//                   // Step 1: Get seller_id from user_id
//                   const { data: sellerData, error: sellerError } = await supabase
//                       .from("sellers_record")
//                       .select("*")
//                       .eq("user_id", userId)
//                       .maybeSingle();
  
//                   if (sellerError || !sellerData) {
//                       console.error("Seller not found");
//                       return;
//                   }
//                   setsellerdata(sellerData)
  
//                   const sellerId = sellerData.id;
  
//                   // Step 2: Get latest invoice for that seller
//                   const { data: invoiceData, error: invoiceError } = await supabase
//                       .from("invoices_record")
//                       .select("invoice_no")
//                       .eq("seller_id", sellerId)
//                       .order("invoice_date", { ascending: false })
//                       .order("id", { ascending: false })
//                       .limit(1)
//                       .maybeSingle();
  
//                   // Step 3: Get current FY in YYYY-YY format
//                   const today = new Date();
//                   const year = today.getFullYear();
//                   const month = today.getMonth();
//                   const fyStart = month >= 3 ? year : year - 1; // FY starts in April (month 3)
//                   const fyEnd = (fyStart + 1) % 100; // Last two digits of next year
//                   const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;
  
//                   // Step 4: If no invoice found, set to default
//                   if (invoiceError || !invoiceData) {
//                       setinvoice_no( `001/${currentFY}`);
//                       return;
//                   }
  
//                   // Step 5: Parse and increment
//                   const lastInvoice = invoiceData.invoice_no;
//                   const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?$/); // Non-capturing group for FY
  
//                   if (!match) {
//                       console.warn("Invalid invoice format, using default");
//                       setinvoice_no(`001/${currentFY}` );
//                       return;
//                   }
  
//                   const numberPart = match[1];
//                   const fyInInvoice = match[2]; // Captured FY if present
  
//                   let newNumber: string;
//                   let newFY = fyInInvoice || currentFY; // Use FY from invoice if present, otherwise current
  
//                   if (fyInInvoice && fyInInvoice !== currentFY) {
//                       // New FY started — reset to 001
//                       newNumber = "001";
//                       newFY = currentFY;
//                   } else {
//                       // Same FY — increment
//                       const incremented = (parseInt(numberPart) + 1).toString().padStart(numberPart.length, '0');
//                       newNumber = incremented;
//                   }
  
//                   const updatedInvoice = `${newNumber}/${newFY}`; // Reconstruct the invoice number
//                   setinvoice_no( updatedInvoice );
  
//               } catch (err) {
//                   console.error("Unexpected error fetching/incrementing invoice:", err);
//                   toast({
//                       title: "Error",
//                       description: "Unable to generate invoice number. Please try again.",
//                       variant: "destructive",
//                   });
//               }
//           };
  
//   useEffect(() => {
//     if(!userId) return
//     incremented_invoice_no()
//     }, [userId])
  

//   useEffect(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
//     }
    
//   }, [messages]);
  

//   const sendMessage = async(text: string) => {
//      if(!userId) return
//     await incremented_invoice_no()
//     if (!text.trim()) return;
//     const userMessage = { id: Date.now(), text, isBot: false };
//     setMessages((prev) => [...prev, userMessage]);
//     setMessage("");
//     const updatedtext=text.concat(` invoice no: ${invoice_no}, seller data is ${JSON.stringify(sellerdata)}`)
//     console.log(updatedtext)
//     fetch("http://localhost:8000/voice_bot", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" ,Authorization: `Bearer ${userSession?.access_token}`, },
//       body: JSON.stringify({ input_value: updatedtext,invoice_no:invoice_no }),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         const botMessage = {
//           id: Date.now() + 1,
//           text: typeof data === "string" ? data : JSON.stringify(data),
//           isBot: true,
//         };
//         setMessages((prev) => [...prev, botMessage]);
//       })
//       .catch(() => {
//         setMessages((prev) => [
//           ...prev,
//           {
//             id: Date.now(),
//             text: "❌ Error connecting to server.",
//             isBot: true,
//           },
//         ]);
//       });
//   };

//   const handleSendMessage = () => {

//     if(!userId) {
//       toast({
//           title: "Error",
//           description: "User not logged in",
//           variant: "destructive",
//       });
//       return
//     }
//     if (message.trim()) {
//       sendMessage(message);
//     }
//   };

//   const startListening = () => {
//     const SpeechRecognition =
//       (window as any).webkitSpeechRecognition ||
//       (window as any).SpeechRecognition;
//     if (!SpeechRecognition) return alert("Speech Recognition not supported");

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = "hi-IN";

//     transcriptBuffer.current = "";
//     setIsListening(true);

//     recognition.onresult = (event: any) => {
//       let final = transcriptBuffer.current;
//       let interim = "";

//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         const transcript = event.results[i][0].transcript;
//         if (event.results[i].isFinal) {
//           final += transcript + " ";
//         } else {
//           interim += transcript;
//         }
//       }

//       transcriptBuffer.current = final.trim();
//       setMessage((final + " " + interim).trim());
//     };

//     recognition.onerror = (e: any) => {
//       console.error("Speech error", e);
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
//       <motion.div
//         className="fixed bottom-6 right-6 z-50"
//         initial={{ scale: 0 }}
//         animate={{ scale: 1 }}
//         transition={{ delay: 1, type: "spring", stiffness: 300 }}
//       >
//         <motion.div
//           animate={{ 
//             y: [0, -10, 0],
//             rotate: [0, 5, -5, 0]
//           }}
//           transition={{ 
//             duration: 3,
//             repeat: Infinity,
//             ease: "easeInOut"
//           }}
//         >
//           <Button
//             onClick={() => setIsOpen(true)}
//             className="w-14 h-14 rounded-full bg-primary shadow-lg hover:shadow-xl"
//             size="sm"
//           >
//             <MessageCircle className="w-6 h-6" />
//           </Button>
//         </motion.div>
        
//         <motion.div
//           className="absolute -top-12 -right-5 bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm whitespace-nowrap"
//           animate={{ 
//             opacity: [0.7, 1, 0.7],
//             scale: [0.95, 1, 0.95]
//           }}
//           transition={{ 
//             duration: 2,
//             repeat: Infinity,
//             ease: "easeInOut"
//           }}
//         >
//           Need help?
//           <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary"></div>
//         </motion.div>
//       </motion.div>
      
//       <AnimatePresence>
//         {isOpen && (
//           <motion.div
//             className="fixed bottom-6 right-6 w-96 h-[32rem] z-50"
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

//               <div className="flex-1 overflow-y-auto p-4">
//                 {messages.map((msg) => (
//                   <div
//                     key={msg.id}
//                     className={`mb-3 flex ${msg.isBot ? "justify-start" : "justify-end"}`}
//                   >
//                     <div
//                       className={`p-3 rounded-lg max-w-xs ${
//                         msg.isBot ? "bg-muted" : "bg-primary text-white"
//                       }`}
//                     >
//                       {msg.text}
//                     </div>
//                   </div>
//                 ))}
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
//                       onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
//                       placeholder="Type a message..."
//                       className="flex-1"
//                     />
//                     <Button onClick={handleSendMessage} size="icon">
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

import {
  useState,
  useRef,
  useEffect,
  FC,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Mic, StopCircle } from "lucide-react";
import { useUserId } from "@/hooks/context/UserContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import Link from "next/link";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

const ChatBot: FC = () => {
  const { userId, userSession } = useUserId();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sellerdata, setsellerdata] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm your CA Assistant. How can I help you today?",
      isBot: true,
    },
  ]);

  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [invoice_no, setinvoice_no] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptBuffer = useRef("");

  const { resolvedTheme } = useTheme();

  const incremented_invoice_no = async () => {
    if (!userId) return;
    try {
      const { data: sellerData, error: sellerError } = await supabase
        .from("sellers_record")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (sellerError || !sellerData) return;

      setsellerdata(sellerData);
      const sellerId = sellerData.id;

      const { data: invoiceData } = await supabase
        .from("invoices_record")
        .select("invoice_no")
        .eq("seller_id", sellerId)
        .order("invoice_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const fyStart = month >= 3 ? year : year - 1;
      const fyEnd = (fyStart + 1) % 100;
      const currentFY = `${fyStart}-${fyEnd.toString().padStart(2, '0')}`;

      if (!invoiceData) {
        setinvoice_no(`001/${currentFY}`);
        return;
      }

      const lastInvoice = invoiceData.invoice_no;
      const match = lastInvoice.match(/(\d+)(?:\/(\d{4}-\d{2}))?$/);

      if (!match) {
        setinvoice_no(`001/${currentFY}`);
        return;
      }

      const numberPart = match[1];
      const fyInInvoice = match[2];
      let newNumber: string;
      let newFY = fyInInvoice || currentFY;

      if (fyInInvoice && fyInInvoice !== currentFY) {
        newNumber = "001";
        newFY = currentFY;
      } else {
        const incremented = (parseInt(numberPart) + 1).toString().padStart(numberPart.length, '0');
        newNumber = incremented;
      }

      const updatedInvoice = `${newNumber}/${newFY}`;
      setinvoice_no(updatedInvoice);

    } catch (err) {
      toast({ title: "Error", description: "Unable to generate invoice number.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!userId) return;
    incremented_invoice_no();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!userId || !text.trim()) return;
    await incremented_invoice_no();

    const userMessage = { id: Date.now(), text, isBot: false };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    const updatedtext = text.concat(` invoice no: ${invoice_no}, seller data is ${JSON.stringify(sellerdata)}`);

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userSession?.access_token}`,
      },
      body: JSON.stringify({ input_value: updatedtext, invoice_no }),
    })
      .then((res) => res.json())
      .then((data) => {
        const botMessage = {
          id: Date.now() + 1,
          text: data?.url || data?.message || "✅ Invoice processed.",
          isBot: true,
        };

        setMessages((prev) => [...prev, botMessage]);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), text: "❌ Error connecting to server.", isBot: true },
        ]);
      });
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return alert("Speech Recognition not supported");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "hi-IN";

    transcriptBuffer.current = "";
    setIsListening(true);

    recognition.onresult = (event: any) => {
      let final = transcriptBuffer.current;
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      transcriptBuffer.current = final.trim();
      setMessage((final + " " + interim).trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = transcriptBuffer.current.trim();
      if (finalText) {
        sendMessage(finalText);
        transcriptBuffer.current = "";
      }
    };

    recognition.start();
    setRecognitionInstance(recognition);
  };

  const stopListening = () => {
    recognitionInstance?.stop();
    setIsListening(false);
  };

  return (
    <>
      <motion.div className="fixed bottom-6 right-6 z-50">
        <Button onClick={() => setIsOpen(true)} className="w-14 h-14 rounded-full bg-primary">
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 w-96 h-[32rem] z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Card className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <MessageCircle />
                  <span className="font-semibold">CA Assistant</span>
                </div>
                <Button onClick={() => setIsOpen(false)} size="sm" variant="ghost">
                  <X />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`p-3 rounded-lg max-w-xs whitespace-pre-wrap break-words ${
                        msg.isBot
                          ? resolvedTheme === "dark"
                            ? "bg-muted text-white"
                            : "bg-gray-100"
                          : "bg-green-100 text-green-900"
                      }`}
                    >
                      {msg.text?.startsWith("http") ? (
                        <Link href={msg.text} target="_blank" className="underline text-blue-500">
                          🔗 View Invoice
                        </Link>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3">
                {isListening ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">🎙️ Listening...</span>
                    <Button onClick={stopListening} variant="destructive" size="sm">
                      <StopCircle className="mr-1 w-4 h-4" /> Stop
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button onClick={startListening} variant="outline" size="icon">
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(message)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button onClick={() => sendMessage(message)} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
