// // "use client"

// // // --- Imports ---
// // import { useState, useRef, useEffect, FC } from "react"
// // import { motion } from "framer-motion"
// // import Link from "next/link"
// // import ReactMarkdown from "react-markdown"
// // import remarkGfm from 'remark-gfm' // For full Markdown support

// // // --- UI Components ---
// // import { Button } from "@/components/ui/button"
// // import { Input } from "@/components/ui/input"
// // import { Skeleton } from "@/components/ui/skeleton"

// // // --- Icons ---
// // import { Send, Mic, StopCircle, Bot, User, Link2 } from "lucide-react"

// // // --- Libs & Hooks ---
// // import { useUserId } from "@/hooks/context/UserContext"
// // import { useToast } from "@/hooks/use-toast"

// // // --- Type Definitions ---
// // interface Message {
// //   id: number
// //   text: string
// //   isBot: boolean
// //   suggestions?: string[]
// // }

// // // --- Sub-components ---
// // const TypingIndicator: FC = () => (
// //   <div className="flex items-center space-x-1 p-3">
// //     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
// //     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
// //     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
// //   </div>
// // )

// // const FormattedMessage: FC<{ content: string }> = ({ content }) => {
// //   return (
// //     <div className="prose prose-sm dark:prose-invert max-w-none break-words">
// //       <ReactMarkdown
// //         remarkPlugins={[remarkGfm]} // Enable full Markdown parsing
// //         components={{
// //           a: ({ node, ...props }) => {
// //             const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
// //             return (
// //               <Link {...props} href={props.href || ''} target="_blank"
// //                 className="inline-flex items-center gap-1 underline font-semibold text-primary hover:text-primary/80 transition-colors">
// //                 <Link2 className="w-4 h-4" />
// //                 {isSpecialLink ? `Click to View` : props.children}
// //               </Link>
// //             )
// //           },
// //           p: ({ node, ...props }) => <p {...props} className="my-1" />,
// //           ul: ({ node, ...props }) => <ul {...props} className="my-2 pl-4 list-disc" />,
// //           li: ({ node, ...props }) => <li {...props} className="my-1" />,
// //           table: ({ node, ...props }) => <table {...props} className="w-full text-xs border-collapse border border-border" />,
// //           thead: ({ node, ...props }) => <thead {...props} className="font-bold bg-muted" />,
// //           tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border" />,
// //           tr: ({ node, ...props }) => <tr {...props} className="even:bg-muted/50" />,
// //           td: ({ node, ...props }) => <td {...props} className="p-2 border border-border" />,
// //           th: ({ node, ...props }) => <th {...props} className="p-2 border border-border text-left" />,
// //         }}
// //       >
// //         {content}
// //       </ReactMarkdown>
// //     </div>
// //   )
// // }

// // // --- Main DashboardContent Component (as a Chat Interface) ---
// // export function DashboardContent() {
// //   const { userId, session, sellerDetails } = useUserId()
// //   const { toast } = useToast()

// //   const [isLoading, setIsLoading] = useState(true)
// //   const [message, setMessage] = useState("")
// //   const [messages, setMessages] = useState<Message[]>([])
// //   const [isBotTyping, setIsBotTyping] = useState(false)
// //   const [isListening, setIsListening] = useState(false)
// //   const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

// //   const messagesEndRef = useRef<HTMLDivElement>(null)
// //   const transcriptBuffer = useRef("")
// //   const abortControllerRef = useRef<AbortController | null>(null)

// //   useEffect(() => {
// //     setIsLoading(true)
// //     if (userId) {
// //       if (sellerDetails) {
// //         setMessages([{
// //           id: 1,
// //           text: "Hi! I'm your Vyapari Assistant. How can I help you today?",
// //           isBot: true,
// //           suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"],
// //         }])
// //       } else {
// //         setMessages([{ id: 1, text: "Welcome! To get started, please set up your company profile.", isBot: true }])
// //       }
// //     } else {
// //       setMessages([])
// //     }
// //     setIsLoading(false)
// //   }, [userId, sellerDetails])

// //   useEffect(() => {
// //     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
// //   }, [messages, isBotTyping])

// //   const handleStopExecution = () => {
// //     if (abortControllerRef.current) {
// //       abortControllerRef.current.abort()
// //       abortControllerRef.current = null
// //     }
// //   }

// //   const sendMessage = async (text: string) => {
// //     const trimmedText = text.trim()
// //     if (!trimmedText) return

// //     if (!userId || !session) {
// //       toast({ title: "Profile Incomplete", description: "Please log in and set up your profile first.", variant: "destructive" })
// //       return
// //     }

// //     handleStopExecution()
// //     const controller = new AbortController()
// //     abortControllerRef.current = controller

// //     const userMessage: Message = { id: Date.now(), text: trimmedText, isBot: false }
// //     setMessages((prev) => [...prev, userMessage])
// //     setMessage("")
// //     setIsBotTyping(true)

// //     const requestPayload = {
// //       input_value: trimmedText,
// //       user_id: userId
// //     }

// //     try {
// //       const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
// //         body: JSON.stringify(requestPayload),
// //         signal: controller.signal,
// //       })

// //       if (!response.ok) {
// //         try {
// //           const errorData = await response.json()
// //           throw new Error(errorData.detail || `Server responded with status: ${response.status}`)
// //         } catch (jsonError) {
// //           throw new Error(`Server responded with status: ${response.status}`)
// //         }
// //       }

// //       const data = await response.json()
// //       const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

// //       if (botMessageText) {
// //         const textForSpeech = botMessageText
// //           .replace(/\|/g, ', ')
// //           .replace(/---/g, '')
// //           .replace(/```[\s\S]*?```/g, '')
// //           .replace(/`[^`]*`/g, '')
// //           .replace(/\*\*/g, '')
// //           .replace(/\*/g, '')
// //           .replace(/#/g, '')
// //           .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
// //           .replace(/\n/g, ' ')

// //         const utterance = new SpeechSynthesisUtterance(textForSpeech)
// //         utterance.lang = "en-IN"
// //         window.speechSynthesis.speak(utterance)

// //         setMessages((prev) => [...prev, { id: Date.now() + 1, text: botMessageText, isBot: true }])
// //       } else {
// //         setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }])
// //       }
// //     } catch (err: any) {
// //       if (err.name === 'AbortError') {
// //         console.log('Fetch aborted by user.')
// //       } else {
// //         const errorText = err instanceof Error ? err.message : "An unknown error occurred."
// //         setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }])
// //         toast({ title: "Error", description: errorText, variant: "destructive" })
// //       }
// //     } finally {
// //       setIsBotTyping(false)
// //       if (abortControllerRef.current === controller) {
// //         abortControllerRef.current = null
// //       }
// //     }
// //   }

// //   const startListening = () => {
// //     // ... (rest of the function is unchanged)
// //     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
// //     if (!SpeechRecognition) {
// //       toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" })
// //       return
// //     }
// //     const recognition = new SpeechRecognition()
// //     recognition.continuous = true
// //     recognition.interimResults = true
// //     recognition.lang = "en-IN"

// //     setIsListening(true)

// //     recognition.onresult = (event: any) => {
// //       let interimTranscript = ""
// //       let finalTranscript = ""
// //       for (let i = event.resultIndex; i < event.results.length; ++i) {
// //         if (event.results[i].isFinal) {
// //           finalTranscript += event.results[i][0].transcript
// //         } else {
// //           interimTranscript += event.results[i][0].transcript
// //         }
// //       }
// //       transcriptBuffer.current = finalTranscript
// //       setMessage(finalTranscript || interimTranscript)
// //     }

// //     recognition.onend = () => {
// //       setIsListening(false)
// //       const finalText = transcriptBuffer.current.trim()
// //       if (finalText) {
// //         sendMessage(finalText)
// //       }
// //     }

// //     recognition.start()
// //     setRecognitionInstance(recognition)
// //   }

// //   const stopListening = () => {
// //     recognitionInstance?.stop()
// //     setIsListening(false)
// //   }

// //   return (
// //     // This root div fills the <main> tag from the layout
// //     <div className="flex flex-col h-[calc(100vh-4rem)] relative">

// //       {/* Message List (Scrollable Area) */}
// //       {/* --- CHANGED --- Removed padding, added py-6 */}
// //       <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        
// //         {/* --- CHANGED --- Added a max-width, centered wrapper for the messages */}
// //         <div className="w-full max-w-4xl mx-auto px-6 space-y-4">
// //           {isLoading ? (
// //             <div className="space-y-4">
// //               <Skeleton className="h-16 w-3/4 rounded-lg" />
// //               <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
// //             </div>
// //           ) : (
// //             messages.map((msg) => (
// //               <motion.div
// //                 key={msg.id}
// //                 className={`flex items-end gap-2 ${msg.isBot ? "justify-start" : "justify-end"}`}
// //                 initial={{ opacity: 0, y: 10 }}
// //                 animate={{ opacity: 1, y: 0 }}
// //                 transition={{ duration: 0.3 }}
// //               >
// //                 {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><Bot className="w-5 h-5" /></div>}
                
// //                 {/* --- CHANGED --- Made bubbles wider with max-w-2xl */}
// //                 <div className={`p-3 rounded-2xl max-w-2xl ${
// //                   msg.isBot
// //                   ? "bg-muted rounded-tl-none"
// //                   : "bg-primary text-primary-foreground rounded-br-none"
// //                 }`}>
// //                   <FormattedMessage content={msg.text} />
                  
// //                   {msg.suggestions && (
// //                     <div className="mt-3 flex flex-wrap gap-2">
// //                       {msg.suggestions.map((s, i) => (
// //                         <Button key={i} variant="outline" size="sm" className="rounded-full" onClick={() => sendMessage(s)}>{s}</Button>
// //                       ))}
// //                     </div>
// //                   )}
// //                 </div>
                
// //                 {!msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><User className="w-5 h-5" /></div>}
// //               </motion.div>
// //             ))
// //           )}
// //           {isBotTyping && <div className="flex justify-start items-end gap-2"><div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div><TypingIndicator /></div>}
// //           <div ref={messagesEndRef} />
// //         </div>
// //       </div>

// //       {/* Input Bar (Sticky Footer) */}
// //       {/* --- CHANGED --- Kept background, but added a max-width wrapper inside */}
// //       <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background/80 backdrop-blur-sm">
// //         <div className="w-full max-w-4xl mx-auto">
// //           {isBotTyping ? (
// //             // State 1: Bot is "thinking"
// //             <div className="w-full flex justify-center items-center">
// //               <Button
// //                 variant="outline"
// //                 onClick={handleStopExecution}
// //                 className="rounded-full"
// //               >
// //                 <StopCircle className="mr-2 h-4 w-4" />
// //                 Stop Generating
// //               </Button>
// //             </div>
// //           ) : isListening ? (
// //             // State 2: User is speaking
// //             <div className="w-full flex justify-center items-center gap-4">
// //               <div className="text-sm text-primary flex items-center gap-2">
// //                 <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
// //                 Listening...
// //               </div>
// //               <Button onClick={stopListening} variant="destructive" size="sm" className="rounded-full">
// //                 <StopCircle className="mr-1 w-4 h-4" /> Stop
// //               </Button>
// //             </div>
// //           ) : (
// //             // State 3: Default
// //             <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-3">
// //               <Button type="button" onClick={startListening} variant="ghost" size="icon" className="rounded-full flex-shrink-0">
// //                 <Mic className="w-5 h-5" />
// //               </Button>
// //               <Input
// //                 value={message}
// //                 onChange={(e) => setMessage(e.target.value)}
// //                 placeholder="Ask me anything..."
// //                 className="flex-1 rounded-full"
// //               />
// //               <Button type="submit" size="icon" className="rounded-full flex-shrink-0">
// //                 <Send className="w-5 h-5" />
// //               </Button>
// //             </form>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// "use client"

// // --- Imports ---
// import { useState, useRef, useEffect, FC } from "react"
// import { motion } from "framer-motion"
// import Link from "next/link"
// import ReactMarkdown from "react-markdown"
// import remarkGfm from 'remark-gfm' // For full Markdown support
// import { useRouter } from "next/navigation" 

// // --- UI Components ---
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Skeleton } from "@/components/ui/skeleton"

// // --- Icons ---
// import { Send, Mic, StopCircle, Bot, User, Link2, ArrowRight } from "lucide-react" 

// // --- Libs & Hooks ---
// import { useUserId } from "@/hooks/context/UserContext"
// import { useToast } from "@/hooks/use-toast"

// // --- Type Definitions ---
// interface Message {
//   id: number
//   text: string
//   isBot: boolean
//   suggestions?: string[]
//   actionButton?: React.ReactNode 
// }

// // --- Helper Component ---
// const GoToProfileButton: FC = () => {
//   const router = useRouter()
//   const { userId } = useUserId()

//   const handleClick = () => {
//     if (userId) {
//       // Navigates to the edit page you provided in the other file
//       router.push(`/company_details`)
//     }
//   }

//   return (
//     <Button onClick={handleClick} className="mt-3">
//       Create Your Business Profile
//       <ArrowRight className="w-4 h-4 ml-2" />
//     </Button>
//   )
// }

// // --- Sub-components ---
// const TypingIndicator: FC = () => (
//   <div className="flex items-center space-x-1 p-3">
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
//   </div>
// )

// const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
//   return (
//     <div className="prose prose-sm dark:prose-invert max-w-none break-words">
//       <ReactMarkdown
//         remarkPlugins={[remarkGfm]} // Enable full Markdown parsing
//         components={{
//           a: ({ node, ...props }) => {
//             const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
//             return (
//               <Link {...props} href={props.href || ''} target="_blank"
//                 className="inline-flex items-center gap-1 underline font-semibold text-primary hover:text-primary/80 transition-colors">
//                 <Link2 className="w-4 h-4" />
//                 {isSpecialLink ? `Click to View` : props.children}
//               </Link>
//             )
//           },
//           p: ({ node, ...props }) => <p {...props} className="my-1" />,
//           ul: ({ node, ...props }) => <ul {...props} className="my-2 pl-4 list-disc" />,
//           li: ({ node, ...props }) => <li {...props} className="my-1" />,
//           table: ({ node, ...props }) => <table {...props} className="w-full text-xs border-collapse border border-border" />,
//           thead: ({ node, ...props }) => <thead {...props} className="font-bold bg-muted" />,
//           tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border" />,
//           tr: ({ node, ...props }) => <tr {...props} className="even:bg-muted/50" />,
//           td: ({ node, ...props }) => <td {...props} className="p-2 border border-border" />,
//           th: ({ node, ...props }) => <th {...props} className="p-2 border border-border text-left" />,
//         }}
//       >
//         {content}
//       </ReactMarkdown>
//       {actionButton && <div className="mt-2">{actionButton}</div>}
//     </div>
//   )
// }

// // --- Main DashboardContent Component (as a Chat Interface) ---
// export function DashboardContent() {
//   const { userId, session, sellerDetails } = useUserId()
//   const { toast } = useToast()

//   const [isLoading, setIsLoading] = useState(true)
//   const [message, setMessage] = useState("")
//   const [messages, setMessages] = useState<Message[]>([])
//   const [isBotTyping, setIsBotTyping] = useState(false)
//   const [isListening, setIsListening] = useState(false)
//   const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const transcriptBuffer = useRef("")
//   const abortControllerRef = useRef<AbortController | null>(null)

//   useEffect(() => {
//     setIsLoading(true)
//     if (userId) {
//       if (sellerDetails) {
//         setMessages([{
//           id: 1,
//           text: "Hi! I'm your Vyapari Assistant. How can I help you today?",
//           isBot: true,
//           suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"],
//         }])
//       } else {
//         // User is logged in but has no profile
//         setMessages([{
//           id: 1,
//           text: "Welcome! To get started and unlock all features, please create your business profile. It only takes a minute!",
//           isBot: true,
//           actionButton: <GoToProfileButton /> // Show button on load
//         }])
//       }
//     } else {
//       setMessages([])
//     }
//     setIsLoading(false)
//   }, [userId, sellerDetails])

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages, isBotTyping])

//   const handleStopExecution = () => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort()
//       abortControllerRef.current = null
//     }
//   }

//   const sendMessage = async (text: string) => {
//     const trimmedText = text.trim()
//     if (!trimmedText) return

//     if (!userId || !session) {
//       toast({ title: "Profile Incomplete", description: "Please log in and set up your profile first.", variant: "destructive" })
//       return
//     }

//     // --- ADDED GUARD CLAUSE ---
//     if (!sellerDetails) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: Date.now(),
//           text: "Please create your business profile first so I can help you.",
//           isBot: true,
//           actionButton: <GoToProfileButton />
//         }
//       ])
//       setMessage("") 
//       return 
//     }
//     // --- END GUARD CLAUSE ---

//     handleStopExecution()
//     const controller = new AbortController()
//     abortControllerRef.current = controller

//     const userMessage: Message = { id: Date.now(), text: trimmedText, isBot: false }
//     setMessages((prev) => [...prev, userMessage])
//     setMessage("")
//     setIsBotTyping(true)

//     const requestPayload = {
//       input_value: trimmedText,
//       user_id: userId
//     }

//     try {
//       const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
//         body: JSON.stringify(requestPayload),
//         signal: controller.signal,
//       })

//       if (!response.ok) {
//         try {
//           const errorData = await response.json()
//           throw new Error(errorData.detail || `Server responded with status: ${response.status}`)
//         } catch (jsonError) {
//           throw new Error(`Server responded with status: ${response.status}`)
//         }
//       }

//       const data = await response.json()
//       const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

//       if (botMessageText) {
//         const textForSpeech = botMessageText
//           .replace(/\|/g, ', ')
//           .replace(/---/g, '')
//           .replace(/```[\s\S]*?```/g, '')
//           .replace(/`[^`]*`/g, '')
//           .replace(/\*\*/g, '')
//           .replace(/\*/g, '')
//           .replace(/#/g, '')
//           .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
//           .replace(/\n/g, ' ')

//         const utterance = new SpeechSynthesisUtterance(textForSpeech)
//         utterance.lang = "en-IN"
//         window.speechSynthesis.speak(utterance)

//         setMessages((prev) => [...prev, { id: Date.now() + 1, text: botMessageText, isBot: true }])
//       } else {
//         setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }])
//       }
//     } catch (err: any) {
//       if (err.name === 'AbortError') {
//         console.log('Fetch aborted by user.')
//       } else {
//         const errorText = err instanceof Error ? err.message : "An unknown error occurred."
//         setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }])
//         toast({ title: "Error", description: errorText, variant: "destructive" })
//       }
//     } finally {
//       setIsBotTyping(false)
//       if (abortControllerRef.current === controller) {
//         abortControllerRef.current = null
//       }
//     }
//   }

//   const startListening = () => {
//     // ... (rest of the function is unchanged)
//     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
//     if (!SpeechRecognition) {
//       toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" })
//       return
//     }
//     const recognition = new SpeechRecognition()
//     recognition.continuous = true
//     recognition.interimResults = true
//     recognition.lang = "en-IN"

//     setIsListening(true)

//     recognition.onresult = (event: any) => {
//       let interimTranscript = ""
//       let finalTranscript = ""
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         if (event.results[i].isFinal) {
//           finalTranscript += event.results[i][0].transcript
//         } else {
//           interimTranscript += event.results[i][0].transcript
//         }
//       }
//       transcriptBuffer.current = finalTranscript
//       setMessage(finalTranscript || interimTranscript)
//     }

//     recognition.onend = () => {
//       setIsListening(false)
//       const finalText = transcriptBuffer.current.trim()
//       if (finalText) {
//         sendMessage(finalText)
//       }
//     }

//     recognition.start()
//     setRecognitionInstance(recognition)
//   }

//   const stopListening = () => {
//     recognitionInstance?.stop()
//     setIsListening(false)
//   }

//   return (
//     // This root div fills the <main> tag from the layout
//     <div className="flex flex-col h-[calc(100vh-4rem)] relative">

//       {/* Message List (Scrollable Area) */}
//       <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
        
//         <div className="w-full max-w-4xl mx-auto px-6 space-y-4">
//           {isLoading ? (
//             <div className="space-y-4">
//               <Skeleton className="h-16 w-3/4 rounded-lg" />
//               <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
//             </div>
//           ) : (
//             messages.map((msg) => (
//               <motion.div
//                 key={msg.id}
//                 className={`flex items-end gap-2 ${msg.isBot ? "justify-start" : "justify-end"}`}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><Bot className="w-5 h-5" /></div>}
                
//                 <div className={`p-3 rounded-2xl max-w-2xl ${
//                   msg.isBot
//                   ? "bg-muted rounded-tl-none"
//                   : "bg-primary text-primary-foreground rounded-br-none"
//                 }`}>
                  
//                   <FormattedMessage 
//                     content={msg.text} 
//                     actionButton={msg.actionButton} 
//                   />
                  
//                   {msg.suggestions && (
//                     <div className="mt-3 flex flex-wrap gap-2">
//                       {msg.suggestions.map((s, i) => (
//                         <Button key={i} variant="outline" size="sm" className="rounded-full" onClick={() => sendMessage(s)}>{s}</Button>
//                       ))}
//                     </div>
//                   )}
//                 </div>
                
//                 {!msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><User className="w-5 h-5" /></div>}
//               </motion.div>
//             ))
//           )}
//           {isBotTyping && <div className="flex justify-start items-end gap-2"><div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div><TypingIndicator /></div>}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       {/* Input Bar (Sticky Footer) */}
//       <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background/80 backdrop-blur-sm">
//         <div className="w-full max-w-4xl mx-auto">
//           {isBotTyping ? (
//             // State 1: Bot is "thinking"
//             <div className="w-full flex justify-center items-center">
//               <Button
//                 variant="outline"
//                 onClick={handleStopExecution}
//                 className="rounded-full"
//               >
//                 <StopCircle className="mr-2 h-4 w-4" />
//                 Stop Generating
//               </Button>
//             </div>
//           ) : isListening ? (
//             // State 2: User is speaking
//             <div className="w-full flex justify-center items-center gap-4">
//               <div className="text-sm text-primary flex items-center gap-2">
//                 <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
//                 Listening...
//               </div>
//               {/* --- THIS IS THE FIX --- */}
//               <Button onClick={stopListening} variant="destructive" size="sm" className="rounded-full">
//                 <StopCircle className="mr-1 w-4 h-4" /> Stop
//               </Button> 
//               {/* --- END FIX --- */}
//             </div>
//           ) : (
//             // State 3: Default
//             <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-3">
//               <Button type="button" onClick={startListening} variant="ghost" size="icon" className="rounded-full flex-shrink-0">
//                 <Mic className="w-5 h-5" />
//               </Button>
//               <Input
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 placeholder="Ask me anything..."
//                 className="flex-1 rounded-full"
//               />
//               <Button type="submit" size="icon" className="rounded-full flex-shrink-0">
//                 <Send className="w-5 h-5" />
//               </Button>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }


// "use client"

// // --- Imports ---
// import { useState, useRef, useEffect, FC } from "react"
// import { motion } from "framer-motion"
// import Link from "next/link"
// import ReactMarkdown from "react-markdown"
// import remarkGfm from 'remark-gfm' // For full Markdown support
// import { useRouter } from "next/navigation"

// // --- UI Components ---
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Skeleton } from "@/components/ui/skeleton"

// // --- Icons ---
// import { Send, Mic, StopCircle, Bot, User, Link2, ArrowRight } from "lucide-react"

// // --- Libs & Hooks ---
// import { useUserId } from "@/hooks/context/UserContext"
// import { useToast } from "@/hooks/use-toast"

// // --- Type Definitions ---
// interface Message {
//   id: number
//   text: string
//   isBot: boolean
//   suggestions?: string[]
//   actionButton?: React.ReactNode
// }

// // --- Helper Component ---
// const GoToProfileButton: FC = () => {
//   const router = useRouter()
//   const { userId } = useUserId()

//   const handleClick = () => {
//     if (userId) {
//       router.push(`/company_details`)
//     }
//   }

//   return (
//     <Button onClick={handleClick} className="mt-3">
//       Create Your Business Profile
//       <ArrowRight className="w-4 h-4 ml-2" />
//     </Button>
//   )
// }

// // --- Sub-components ---
// const TypingIndicator: FC = () => (
//   <div className="flex items-center space-x-1 p-3">
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
//   </div>
// )

// const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
//   return (
//     <div className="prose dark:prose-invert max-w-none break-words">
//       <ReactMarkdown
//         remarkPlugins={[remarkGfm]}
//         components={{
//           a: ({ node, ...props }) => {
//             const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
//             return (
//               <Link {...props} href={props.href || ''} target="_blank"
//                 className="inline-flex items-center gap-1 underline font-semibold text-primary hover:text-primary/80 transition-colors">
//                 <Link2 className="w-4 h-4" />
//                 {isSpecialLink ? `Click to View` : props.children}
//               </Link>
//             )
//           },
//           p: ({ node, ...props }) => <p {...props} className="my-1" />,
//           ul: ({ node, ...props }) => <ul {...props} className="my-2 pl-4 list-disc" />,
//           li: ({ node, ...props }) => <li {...props} className="my-1" />,
//           table: ({ node, ...props }) => <table {...props} className="w-full border-collapse border border-border" />,
//           thead: ({ node, ...props }) => <thead {...props} className="font-bold bg-muted" />,
//           tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border" />,
//           tr: ({ node, ...props }) => <tr {...props} className="even:bg-muted/50" />,
//           td: ({ node, ...props }) => <td {...props} className="p-2 border border-border" />,
//           th: ({ node, ...props }) => <th {...props} className="p-2 border border-border text-left" />,
//         }}
//       >
//         {content}
//       </ReactMarkdown>
//       {actionButton && <div className="mt-2">{actionButton}</div>}
//     </div>
//   )
// }

// // --- Main DashboardContent Component (as a Chat Interface) ---
// export function DashboardContent() {
//   const { userId, session, sellerDetails } = useUserId()
//   const { toast } = useToast()

//   const [isLoading, setIsLoading] = useState(true)
//   const [message, setMessage] = useState("")
//   const [messages, setMessages] = useState<Message[]>([])
//   const [isBotTyping, setIsBotTyping] = useState(false)
//   const [isListening, setIsListening] = useState(false)
//   const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const transcriptBuffer = useRef("")
//   const abortControllerRef = useRef<AbortController | null>(null)

//   useEffect(() => {
//     setIsLoading(true)
//     if (userId) {
//       if (sellerDetails) {
//         setMessages([{
//           id: 1,
//           text: "Hi! I'm your Vyapari Assistant. How can I help you today?",
//           isBot: true,
//           suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"],
//         }])
//       } else {
//         setMessages([{
//           id: 1,
//           text: "Welcome! To get started and unlock all features, please create your business profile. It only takes a minute!",
//           isBot: true,
//           actionButton: <GoToProfileButton />
//         }])
//       }
//     } else {
//       setMessages([])
//     }
//     setIsLoading(false)
//   }, [userId, sellerDetails])

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }, [messages, isBotTyping])

//   const handleStopExecution = () => {
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort()
//       abortControllerRef.current = null
//     }
//   }

//   const sendMessage = async (text: string) => {
//     const trimmedText = text.trim()
//     if (!trimmedText) return

//     if (!userId || !session) {
//       toast({ title: "Profile Incomplete", description: "Please log in and set up your profile first.", variant: "destructive" })
//       return
//     }

//     if (!sellerDetails) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: Date.now(),
//           text: "Please create your business profile first so I can help you.",
//           isBot: true,
//           actionButton: <GoToProfileButton />
//         }
//       ])
//       setMessage("")
//       return
//     }

//     handleStopExecution()
//     const controller = new AbortController()
//     abortControllerRef.current = controller

//     const userMessage: Message = { id: Date.now(), text: trimmedText, isBot: false }
//     setMessages((prev) => [...prev, userMessage])
//     setMessage("")
//     setIsBotTyping(true)

//     const requestPayload = {
//       input_value: trimmedText,
//       user_id: userId
//     }

//     try {
//       const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
//         body: JSON.stringify(requestPayload),
//         signal: controller.signal,
//       })

//       if (!response.ok) {
//         try {
//           const errorData = await response.json()
//           throw new Error(errorData.detail || `Server responded with status: ${response.status}`)
//         } catch (jsonError) {
//           throw new Error(`Server responded with status: ${response.status}`)
//         }
//       }

//       const data = await response.json()
//       const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

//       if (botMessageText) {
//         const textForSpeech = botMessageText
//           .replace(/\|/g, ', ')
//           .replace(/---/g, '')
//           .replace(/```[\s\S]*?```/g, '')
//           .replace(/`[^`]*`/g, '')
//           .replace(/\*\*/g, '')
//           .replace(/\*/g, '')
//           .replace(/#/g, '')
//           .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
//           .replace(/\n/g, ' ')

//         const utterance = new SpeechSynthesisUtterance(textForSpeech)
//         utterance.lang = "en-IN"
//         window.speechSynthesis.speak(utterance)

//         setMessages((prev) => [...prev, { id: Date.now() + 1, text: botMessageText, isBot: true }])
//       } else {
//         setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }])
//       }
//     } catch (err: any) {
//       if (err.name === 'AbortError') {
//         console.log('Fetch aborted by user.')
//       } else {
//         const errorText = err instanceof Error ? err.message : "An unknown error occurred."
//         setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }])
//         toast({ title: "Error", description: errorText, variant: "destructive" })
//       }
//     } finally {
//       setIsBotTyping(false)
//       if (abortControllerRef.current === controller) {
//         abortControllerRef.current = null
//       }
//     }
//   }

//   const startListening = () => {
//     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
//     if (!SpeechRecognition) {
//       toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" })
//       return
//     }
//     const recognition = new SpeechRecognition()
//     recognition.continuous = true
//     recognition.interimResults = true
//     recognition.lang = "en-IN"

//     setIsListening(true)

//     recognition.onresult = (event: any) => {
//       let interimTranscript = ""
//       let finalTranscript = ""
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         if (event.results[i].isFinal) {
//           finalTranscript += event.results[i][0].transcript
//         } else {
//           interimTranscript += event.results[i][0].transcript
//         }
//       }
//       transcriptBuffer.current = finalTranscript
//       setMessage(finalTranscript || interimTranscript)
//     }

//     recognition.onend = () => {
//       setIsListening(false)
//       const finalText = transcriptBuffer.current.trim()
//       if (finalText) {
//         sendMessage(finalText)
//       }
//     }

//     recognition.start()
//     setRecognitionInstance(recognition)
//   }

//   const stopListening = () => {
//     recognitionInstance?.stop()
//     setIsListening(false)
//   }

//   return (
//     <div className="flex flex-col h-[calc(100vh-4rem)] relative">

//       <div className="flex-1 overflow-y-auto py-6 space-y-4 pb-24">
        
//         <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
//           {isLoading ? (
//             <div className="space-y-4">
//               <Skeleton className="h-16 w-3/4 rounded-lg" />
//               <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
//             </div>
//           ) : (
//             messages.map((msg) => (
//               <motion.div
//                 key={msg.id}
//                 className={`flex items-end gap-2 ${msg.isBot ? "justify-start" : "justify-end"}`}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><Bot className="w-5 h-5" /></div>}
                
//                 <div className={`p-3 rounded-2xl max-w-3xl ${
//                   msg.isBot
//                     ? "bg-muted rounded-tl-none"
//                     : "bg-primary text-primary-foreground rounded-br-none"
//                 }`}>
                  
//                   <FormattedMessage 
//                     content={msg.text} 
//                     actionButton={msg.actionButton} 
//                   />
                  
//                   {msg.suggestions && (
//                     <div className="mt-3 flex flex-wrap gap-2">
//                       {msg.suggestions.map((s, i) => (
//                         <Button 
//                             key={i} 
//                             variant="ghost" 
//                             size="sm" 
//                             className="rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" 
//                             onClick={() => sendMessage(s)}
//                         >
//                             {s}
//                         </Button>
//                       ))}
//                     </div>
//                   )}
//                 </div>
                
//                 {!msg.isBot && <div className="bg-primary/10 text-primary p-2 rounded-full self-start flex-shrink-0"><User className="w-5 h-5" /></div>}
//               </motion.div>
//             ))
//           )}
//           {isBotTyping && <div className="flex justify-start items-end gap-2"><div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div><TypingIndicator /></div>}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       <div className="absolute bottom-0 left-0 right-0 py-4 sm:py-5 border-t bg-background/80 backdrop-blur-sm">
//         <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
//           {isBotTyping ? (
//             <div className="w-full flex justify-center items-center">
//               <Button variant="outline" onClick={handleStopExecution} className="rounded-full">
//                 <StopCircle className="mr-2 h-4 w-4" />
//                 Stop Generating
//               </Button>
//             </div>
//           ) : isListening ? (
//             <div className="w-full flex justify-center items-center gap-4">
//               <div className="text-sm text-primary flex items-center gap-2">
//                 <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
//                 Listening...
//               </div>
//               <Button onClick={stopListening} variant="destructive" size="sm" className="rounded-full">
//                 <StopCircle className="mr-1 w-4 h-4" /> Stop
//               </Button> 
//             </div>
//           ) : (
//             <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-2 sm:gap-3">
//               <Button type="button" onClick={startListening} variant="ghost" size="icon" className="rounded-full flex-shrink-0">
//                 <Mic className="w-5 h-5" />
//               </Button>
//               <Input
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 placeholder="Ask me anything..."
//                 className="flex-1 rounded-full"
//               />
//               <Button type="submit" size="icon" className="rounded-full flex-shrink-0">
//                 <Send className="w-5 h-5" />
//               </Button>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }


//current version

// "use client"

// // --- Imports ---
// import { useState, useRef, useEffect, FC, useCallback } from "react"
// import { motion } from "framer-motion"
// import Link from "next/link"
// import ReactMarkdown from "react-markdown"
// import remarkGfm from 'remark-gfm' // For full Markdown support
// import { useRouter } from "next/navigation"

// // --- UI Components ---
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Skeleton } from "@/components/ui/skeleton"

// // --- Icons ---
// import { Send, Mic, StopCircle, Bot, User, Link2, ArrowRight, Volume2, VolumeX } from "lucide-react"

// // --- Libs & Hooks ---
// import { useUserId } from "@/hooks/context/UserContext"
// import { useToast } from "@/hooks/use-toast"

// // --- Type Definitions ---
// interface Message {
//   id: number
//   text: string
//   isBot: boolean
//   suggestions?: string[]
//   actionButton?: React.ReactNode
//   // New field to handle the typing state for the current message
//   isTyping?: boolean
// }

// // --- Helper Component ---
// const GoToProfileButton: FC = () => {
//   const router = useRouter()
//   const { userId } = useUserId()

//   const handleClick = () => {
//     if (userId) {
//       router.push(`/company_details`)
//     }
//   }

//   return (
//     <Button onClick={handleClick} className="mt-3">
//       Create Your Business Profile
//       <ArrowRight className="w-4 h-4 ml-2" />
//     </Button>
//   )
// }

// // --- Sub-components ---
// const TypingIndicator: FC = () => (
//   <div className="flex items-center space-x-1 p-3">
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
//     <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
//   </div>
// )

// const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
//   return (
//     <div className="prose dark:prose-invert max-w-none break-words">
//       <ReactMarkdown
//         remarkPlugins={[remarkGfm]}
//         components={{
//           a: ({ node, ...props }) => {
//             const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
//             return (
//               <Link {...props} href={props.href || ''} target="_blank"
//                 className="inline-flex items-center gap-1 underline font-semibold text-primary hover:text-primary/80 transition-colors">
//                 <Link2 className="w-4 h-4" />
//                 {isSpecialLink ? `Click to View` : props.children}
//               </Link>
//             )
//           },
//           p: ({ node, ...props }) => <p {...props} className="my-1" />,
//           ul: ({ node, ...props }) => <ul {...props} className="my-2 pl-4 list-disc" />,
//           li: ({ node, ...props }) => <li {...props} className="my-1" />,
//           table: ({ node, ...props }) => <table {...props} className="w-full border-collapse border border-border" />,
//           thead: ({ node, ...props }) => <thead {...props} className="font-bold bg-muted" />,
//           tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border" />,
//           tr: ({ node, ...props }) => <tr {...props} className="even:bg-muted/50" />,
//           td: ({ node, ...props }) => <td {...props} className="p-2 border border-border" />,
//           th: ({ node, ...props }) => <th {...props} className="p-2 border border-border text-left" />,
//         }}
//       >
//         {content}
//       </ReactMarkdown>
//       {actionButton && <div className="mt-2">{actionButton}</div>}
//     </div>
//   )
// }

// // --- Main DashboardContent Component (as a Chat Interface) ---
// export function DashboardContent() {
//   const { userId, session, sellerDetails } = useUserId()
//   const { toast } = useToast()

//   const [isLoading, setIsLoading] = useState(true)
//   const [message, setMessage] = useState("")
//   const [messages, setMessages] = useState<Message[]>([])
//   const [isBotTyping, setIsBotTyping] = useState(false)
//   const [isListening, setIsListening] = useState(false)
//   const [isSpeaking, setIsSpeaking] = useState(false) // NEW: State for text-to-speech
//   const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

//   const messagesEndRef = useRef<HTMLDivElement>(null)
//   const transcriptBuffer = useRef("")
//   const abortControllerRef = useRef<AbortController | null>(null)
//   const autoTextIntervalRef = useRef<NodeJS.Timeout | null>(null)

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }

//   useEffect(() => {
//     setIsLoading(true)
//     if (userId) {
//       if (sellerDetails) {
//         setMessages([{
//           id: 1,
//           text: "Hi! I'm your Vyapari Assistant. How can I help you today?",
//           isBot: true,
//           suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"],
//         }])
//       } else {
//         setMessages([{
//           id: 1,
//           text: "Welcome! To get started and unlock all features, please create your business profile. It only takes a minute!",
//           isBot: true,
//           actionButton: <GoToProfileButton />
//         }])
//       }
//     } else {
//       setMessages([])
//     }
//     setIsLoading(false)
//   }, [userId, sellerDetails])

//   useEffect(() => {
//     // Only scroll when not actively typing to avoid janky scroll
//     if (!isBotTyping) {
//       scrollToBottom()
//     }
//   }, [messages])
  
//   // Custom effect to handle scroll while typing
//   useEffect(() => {
//     if (isBotTyping) {
//         scrollToBottom();
//     }
//   }, [isBotTyping, messages.length > 0 ? messages[messages.length - 1]?.text : null]) // Depend on the text of the last message

//   const handleStopSpeech = useCallback(() => {
//     if (window.speechSynthesis.speaking) {
//       window.speechSynthesis.cancel()
//       setIsSpeaking(false)
//       toast({ title: "Speech Stopped", description: "Text-to-speech output has been cancelled." })
//     }
//   }, [toast])
  
//   const handleStopAutotext = () => {
//     if (autoTextIntervalRef.current) {
//       clearInterval(autoTextIntervalRef.current)
//       autoTextIntervalRef.current = null
      
//       // Complete the last message instantly
//       setMessages(prev => {
//         const lastMessage = prev[prev.length - 1]
//         if (lastMessage && lastMessage.isBot && lastMessage.isTyping) {
//           // Find the non-typing, complete message text from the buffer
//           const completeText = lastMessage.text.replace('▍', '') // Remove the cursor
//           return [
//             ...prev.slice(0, prev.length - 1),
//             { ...lastMessage, text: completeText, isTyping: false }
//           ]
//         }
//         return prev
//       })
//     }
//   }

//   const handleStopExecution = () => {
//     handleStopSpeech()
//     handleStopAutotext()
//     if (abortControllerRef.current) {
//       abortControllerRef.current.abort()
//       abortControllerRef.current = null
//     }
//     setIsBotTyping(false)
//   }

//   // NEW: Autotextizer function
//   const startAutotext = (fullText: string) => {
//     const finalBotMessageId = Date.now() + 1
//     let i = 0
//     let currentText = ""
    
//     // Add an initial message to the chat with the typing state
//     setMessages((prev) => [...prev, { id: finalBotMessageId, text: "", isBot: true, isTyping: true }])
//     setIsBotTyping(true)

//     handleStopAutotext() // Clear any existing interval

//     autoTextIntervalRef.current = setInterval(() => {
//       if (i < fullText.length) {
//         currentText += fullText[i]
//         i++
        
//         // Update the last message with the new chunk of text and a cursor
//         setMessages((prev) => {
//           const lastMessage = prev[prev.length - 1]
//           if (lastMessage && lastMessage.id === finalBotMessageId) {
//             return [
//               ...prev.slice(0, prev.length - 1),
//               { ...lastMessage, text: currentText + '▍' }
//             ]
//           }
//           // Fallback, should not happen often
//           return prev
//         })
//       } else {
//         // Typing finished
//         handleStopAutotext()
//         setIsBotTyping(false)
        
//         // Final update to remove the cursor and set isTyping to false
//         setMessages((prev) => {
//           const lastMessage = prev[prev.length - 1]
//           if (lastMessage && lastMessage.id === finalBotMessageId) {
//             return [
//               ...prev.slice(0, prev.length - 1),
//               { ...lastMessage, text: currentText, isTyping: false }
//             ]
//           }
//           return prev
//         })
//       }
//     }, 20) // Adjust speed here (20ms for fast typing)
    
//     return finalBotMessageId
//   }

//   const sendMessage = async (text: string) => {
//     const trimmedText = text.trim()
//     if (!trimmedText) return

//     if (!userId || !session) {
//       toast({ title: "Profile Incomplete", description: "Please log in and set up your profile first.", variant: "destructive" })
//       return
//     }

//     if (!sellerDetails) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: Date.now(),
//           text: "Please create your business profile first so I can help you.",
//           isBot: true,
//           actionButton: <GoToProfileButton />
//         }
//       ])
//       setMessage("")
//       return
//     }

//     handleStopExecution() // Stop any ongoing speech or generation
//     const controller = new AbortController()
//     abortControllerRef.current = controller

//     const userMessage: Message = { id: Date.now(), text: trimmedText, isBot: false }
//     setMessages((prev) => [...prev, userMessage])
//     setMessage("")
//     setIsBotTyping(true)

//     const requestPayload = {
//       input_value: trimmedText,
//       user_id: userId
//     }

//     try {
//       const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
//         body: JSON.stringify(requestPayload),
//         signal: controller.signal,
//       })

//       if (!response.ok) {
//         try {
//           const errorData = await response.json()
//           throw new Error(errorData.detail || `Server responded with status: ${response.status}`)
//         } catch (jsonError) {
//           throw new Error(`Server responded with status: ${response.status}`)
//         }
//       }

//       const data = await response.json()
//       const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

//       if (botMessageText) {
//         // Start the autotextizer animation
//         startAutotext(botMessageText)
        
//         // Prepare text for speech synthesis
//         const textForSpeech = botMessageText
//           .replace(/\|/g, ', ')
//           .replace(/---/g, '')
//           .replace(/```[\s\S]*?```/g, '')
//           .replace(/`[^`]*`/g, '')
//           .replace(/\*\*/g, '')
//           .replace(/\*/g, '')
//           .replace(/#/g, '')
//           .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
//           .replace(/\n/g, ' ')

//         // Start text-to-speech
//         const utterance = new SpeechSynthesisUtterance(textForSpeech)
//         utterance.lang = "en-IN"
//         utterance.onstart = () => setIsSpeaking(true)
//         utterance.onend = () => setIsSpeaking(false)
//         utterance.onerror = () => setIsSpeaking(false)
//         window.speechSynthesis.speak(utterance)

//       } else {
//         // Direct non-typing message for error
//         setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }])
//         setIsBotTyping(false)
//       }
//     } catch (err: any) {
//       if (err.name === 'AbortError') {
//         console.log('Fetch aborted by user.')
//       } else {
//         const errorText = err instanceof Error ? err.message : "An unknown error occurred."
//         setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }])
//         toast({ title: "Error", description: errorText, variant: "destructive" })
//       }
//       setIsBotTyping(false)
//     } finally {
//       if (abortControllerRef.current === controller) {
//         abortControllerRef.current = null
//       }
//     }
//   }

//   const startListening = () => {
//     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
//     if (!SpeechRecognition) {
//       toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" })
//       return
//     }
    
//     handleStopSpeech() // Stop speaking when starting to listen
    
//     const recognition = new SpeechRecognition()
//     recognition.continuous = true
//     recognition.interimResults = true
//     recognition.lang = "en-IN"

//     setIsListening(true)

//     recognition.onresult = (event: any) => {
//       let interimTranscript = ""
//       let finalTranscript = ""
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         if (event.results[i].isFinal) {
//           finalTranscript += event.results[i][0].transcript
//         } else {
//           interimTranscript += event.results[i][0].transcript
//         }
//       }
//       transcriptBuffer.current = finalTranscript
//       setMessage(finalTranscript || interimTranscript)
//     }

//     recognition.onend = () => {
//       setIsListening(false)
//       const finalText = transcriptBuffer.current.trim()
//       if (finalText) {
//         sendMessage(finalText)
//       }
//       transcriptBuffer.current = ""
//     }
    
//     recognition.onerror = (event: any) => {
//       console.error('Speech Recognition Error:', event.error)
//       if (event.error === 'no-speech') {
//         toast({ title: "No Speech Detected", description: "Please ensure your microphone is working and speak clearly.", variant: "warning" })
//       }
//       setIsListening(false)
//     }

//     recognition.start()
//     setRecognitionInstance(recognition)
//   }

//   const stopListening = () => {
//     recognitionInstance?.stop()
//     setIsListening(false)
//   }
  
//   // Custom component for the message display to handle the cursor
//   const MessageContent: FC<{ msg: Message; sendMessage: (text: string) => Promise<void> }> = ({ msg, sendMessage }) => {
//     // If the message is currently typing, we need to handle the cursor
//     const content = msg.isTyping ? msg.text : msg.text.replace('▍', '')

//     // The logic to render the actionButton is now inside FormattedMessage, 
//     // but we can pass it along.
    
//     return (
//       <>
//         <FormattedMessage 
//           content={content} 
//           actionButton={msg.actionButton} 
//         />
        
//         {msg.suggestions && (
//           <div className="mt-3 flex flex-wrap gap-2">
//             {msg.suggestions.map((s, i) => (
//               <Button 
//                 key={i} 
//                 variant="ghost" 
//                 size="sm" 
//                 className="rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" 
//                 onClick={() => sendMessage(s)}
//               >
//                 {s}
//               </Button>
//             ))}
//           </div>
//         )}
//       </>
//     )
//   }


//   return (
//     <div className="flex flex-col h-[calc(100vh-4rem)] relative">

//       <div className="flex-1 overflow-y-auto py-6 space-y-4 pb-24">
        
//         <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
//           {isLoading ? (
//             <div className="space-y-4">
//               <Skeleton className="h-16 w-3/4 rounded-lg" />
//               <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
//             </div>
//           ) : (
//             messages.map((msg) => (
//               <motion.div
//                 key={msg.id}
//                 className={`flex items-end gap-2 ${msg.isBot ? "justify-start" : "justify-end"}`}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.3 }}
//               >
//                 {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><Bot className="w-5 h-5" /></div>}
                
//                 <div className={`p-3 rounded-2xl max-w-3xl ${
//                   msg.isBot
//                     ? "bg-muted rounded-tl-none"
//                     : "bg-primary text-primary-foreground rounded-br-none"
//                 }`}>
                  
//                   {/* Updated to use MessageContent which handles typing state */}
//                   <MessageContent msg={msg} sendMessage={sendMessage} />
                  
//                 </div>
                
//                 {!msg.isBot && <div className="bg-primary/10 text-primary p-2 rounded-full self-start flex-shrink-0"><User className="w-5 h-5" /></div>}
//               </motion.div>
//             ))
//           )}
//           {/* Typing indicator is now only for when fetch is happening, autotext handles the display */}
//           {isBotTyping && !messages.some(m => m.isBot && m.isTyping) && (
//             <div className="flex justify-start items-end gap-2">
//               <div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div>
//               <TypingIndicator />
//             </div>
//           )}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       <div className="absolute bottom-0 left-0 right-0 py-4 sm:py-5 border-t bg-background/80 backdrop-blur-sm">
//         <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
//           {isBotTyping ? (
//             <div className="w-full flex justify-center items-center">
//               <Button variant="outline" onClick={handleStopExecution} className="rounded-full">
//                 <StopCircle className="mr-2 h-4 w-4" />
//                 Stop Generating
//               </Button>
//             </div>
//           ) : isListening ? (
//             <div className="w-full flex justify-center items-center gap-4">
//               <div className="text-sm text-primary flex items-center gap-2">
//                 <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
//                 Listening...
//               </div>
//               <Button onClick={stopListening} variant="destructive" size="sm" className="rounded-full">
//                 <StopCircle className="mr-1 w-4 h-4" /> Stop
//               </Button> 
//             </div>
//           ) : (
//             <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-2 sm:gap-3">
//               {/* NEW: Stop Speech Button */}
//               <Button 
//                 type="button" 
//                 onClick={handleStopSpeech} 
//                 variant="ghost" 
//                 size="icon" 
//                 className="rounded-full flex-shrink-0"
//                 disabled={!isSpeaking}
//               >
//                 {isSpeaking ? <Volume2 className="w-5 h-5 text-destructive animate-pulse" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
//               </Button>
//               {/* Mic Button */}
//               <Button type="button" onClick={startListening} variant="ghost" size="icon" className="rounded-full flex-shrink-0">
//                 <Mic className="w-5 h-5" />
//               </Button>
//               <Input
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 placeholder="Ask me anything..."
//                 className="flex-1 rounded-full"
//               />
//               <Button type="submit" size="icon" className="rounded-full flex-shrink-0">
//                 <Send className="w-5 h-5" />
//               </Button>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

"use client"

// --- Imports ---
import React, { useState, useRef, useEffect, FC, useCallback } from "react" // --- MODIFIED ---
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from 'remark-gfm'
import { useRouter } from "next/navigation"

// --- UI Components ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// --- Icons ---
import { Send, Mic, StopCircle, Bot, User, Link2, ArrowRight, Volume2, VolumeX } from 'lucide-react' // --- MODIFIED (Removed Sparkles) ---

// --- Libs & Hooks ---
import { useUserId } from "@/hooks/context/UserContext"
import { useToast } from "@/hooks/use-toast"

// --- Type Definitions ---
interface Message {
  id: number
  text: string
  isBot: boolean
  suggestions?: string[]
  actionButton?: React.ReactNode
  isTyping?: boolean
}

// ---
// --- SUB-COMPONENTS (Moved outside DashboardContent)
// ---

const GoToProfileButton: FC = () => {
  const router = useRouter()
  const { userId } = useUserId()

  const handleClick = () => {
    if (userId) {
      router.push(`/company_details`)
    }
  }

  return (
    <Button onClick={handleClick} className="mt-4 group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300">
      <span className="relative z-10 flex items-center gap-2">
        Create Your Business Profile
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
    </Button>
  )
}

const TypingIndicator: FC = () => (
  <div className="flex items-center space-x-2 px-4 py-3">
    <div className="flex space-x-1">
      <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce"></div>
    </div>
    <span className="text-xs text-muted-foreground">AI is thinking...</span>
  </div>
)

const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
  return (
    <div className="prose dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/50">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
            return (
              <Link {...props} href={props.href || ''} target="_blank"
                className="inline-flex items-center gap-1.5 underline decoration-primary/30 underline-offset-4 font-medium text-primary hover:text-primary/80 hover:decoration-primary/60 transition-all duration-200">
                <Link2 className="w-3.5 h-3.5" />
                {isSpecialLink ? `Click to View` : props.children}
              </Link>
            )
          },
          p: ({ node, ...props }) => <p {...props} className="my-2 leading-relaxed" />,
          ul: ({ node, ...props }) => <ul {...props} className="my-3 pl-5 space-y-1.5 list-disc marker:text-primary/60" />,
          li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
              <table {...props} className="w-full border-collapse" />
            </div>
          ),
          thead: ({ node, ...props }) => <thead {...props} className="bg-muted/50 backdrop-blur-sm" />,
          tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border/30" />,
          tr: ({ node, ...props }) => <tr {...props} className="hover:bg-muted/30 transition-colors" />,
          td: ({ node, ...props }) => <td {...props} className="p-3 text-sm" />,
          th: ({ node, ...props }) => <th {...props} className="p-3 text-left text-sm font-semibold" />,
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code {...props} className="px-1.5 py-0.5 rounded bg-muted/80 text-primary font-mono text-sm" />
            ) : (
              <code {...props} className="block" />
            ),
        }}
      >
        {content}
      </ReactMarkdown>
      {actionButton && <div className="mt-3">{actionButton}</div>}
    </div>
  )
}

// --- MODIFIED ---
// Moved MessageContent outside of DashboardContent to prevent re-creation on render.
const MessageContent: FC<{ msg: Message; sendMessage: (text: string) => Promise<void> }> = React.memo(({ msg, sendMessage }) => {
  const content = msg.isTyping ? msg.text : msg.text.replace('▍', '')

  return (
    <>
      <FormattedMessage
        content={content}
        actionButton={msg.actionButton}
      />

      {msg.suggestions && msg.suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {msg.suggestions.map((s, i) => (
            <motion.div
              key={`${msg.id}-suggestion-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-300 backdrop-blur-sm"
                onClick={() => sendMessage(s)}
              >
                {s}
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.text === nextProps.msg.text &&
    prevProps.msg.isTyping === nextProps.msg.isTyping &&
    JSON.stringify(prevProps.msg.suggestions) === JSON.stringify(nextProps.msg.suggestions)
  )
})
MessageContent.displayName = 'MessageContent'; // Good practice for React.memo


// --- Main DashboardContent Component ---
export function DashboardContent() {
  const { userId, session, sellerDetails } = useUserId()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const transcriptBuffer = useRef("")
  const abortControllerRef = useRef<AbortController | null>(null)
  const autoTextIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    setIsLoading(true)
    if (userId) {
      if (sellerDetails) {
        setMessages([{
          id: 1,
          text: "Hi! I'm your Vyapari Assistant. How can I help you today?",
          isBot: true,
          suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"],
        }])
      } else {
        setMessages([{
          id: 1,
          text: "Welcome! To get started and unlock all features, please create your business profile. It only takes a minute!",
          isBot: true,
          actionButton: <GoToProfileButton />
        }])
      }
    } else {
      setMessages([])
    }
    setIsLoading(false)
  }, [userId, sellerDetails])

  useEffect(() => {
    if (!isBotTyping) {
      scrollToBottom()
    }
  }, [messages])

  useEffect(() => {
    if (isBotTyping) {
      scrollToBottom()
    }
  }, [isBotTyping, messages.length > 0 ? messages[messages.length - 1]?.text : null])

  const handleStopSpeech = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      toast({ title: "Speech Stopped", description: "Text-to-speech output has been cancelled." })
    }
  }, [toast])

  const handleStopAutotext = () => {
    if (autoTextIntervalRef.current) {
      clearInterval(autoTextIntervalRef.current)
      autoTextIntervalRef.current = null

      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.isBot && lastMessage.isTyping) {
          const completeText = lastMessage.text.replace('▍', '')
          return [
            ...prev.slice(0, prev.length - 1),
            { ...lastMessage, text: completeText, isTyping: false }
          ]
        }
        return prev
      })
    }
  }

  const handleStopExecution = () => {
    handleStopSpeech()
    handleStopAutotext()
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsBotTyping(false)
  }

  // NOTE: You are not calling this function, which is fine.
  // The "fast load" method you're using in sendMessage is better for tables.
  const startAutotext = (fullText: string) => {
    const finalBotMessageId = Date.now() + 1
    let i = 0
    let currentText = ""

    setMessages((prev) => [...prev, { id: finalBotMessageId, text: "", isBot: true, isTyping: true }])
    setIsBotTyping(true)

    handleStopAutotext()

    autoTextIntervalRef.current = setInterval(() => {
      if (i < fullText.length) {
        currentText += fullText[i]
        i++

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.id === finalBotMessageId) {
            return [
              ...prev.slice(0, prev.length - 1),
              { ...lastMessage, text: currentText + '▍' }
            ]
          }
          return prev
        })
      } else {
        handleStopAutotext()
        setIsBotTyping(false)

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.id === finalBotMessageId) {
            return [
              ...prev.slice(0, prev.length - 1),
              { ...lastMessage, text: currentText, isTyping: false }
            ]
          }
          return prev
        })
      }
    }, 20) // 20ms interval

    return finalBotMessageId
  }

  const sendMessage = async (text: string) => {
    const trimmedText = text.trim()
    if (!trimmedText) return

    if (!userId || !session) {
      toast({ title: "Profile Incomplete", description: "Please log in and set up your profile first.", variant: "destructive" })
      return
    }

    if (!sellerDetails) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Please create your business profile first so I can help you.",
          isBot: true,
          actionButton: <GoToProfileButton />
        }
      ])
      setMessage("")
      return
    }

    handleStopExecution()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMessage: Message = { id: Date.now(), text: trimmedText, isBot: false }
    setMessages((prev) => [...prev, userMessage])
    setMessage("")
    setIsBotTyping(true)

    const requestPayload = {
      input_value: trimmedText,
      user_id: userId
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      })

      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.detail || `Server responded with status: ${response.status}`)
        } catch (jsonError) {
          throw new Error(`Server responded with status: ${response.status}`)
        }
      }

      const data = await response.json()
      
      // --- MODIFIED: START OF SANITIZATION ---
      let botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

      if (botMessageText) {
        // Clean the text: remove markdown code fences if they exist
        botMessageText = botMessageText
          .replace(/^```(markdown)?\n?/, '') // Remove start fence
          .replace(/\n?```$/, '')              // Remove end fence
          .trim() // Trim any leading/trailing whitespace
      }
      // --- MODIFIED: END OF SANITIZATION ---

      if (botMessageText) {
        // You are correctly using the "fast load" method here.
        // startAutotext(botMessageText) // This is commented out.
        setIsBotTyping(false) // Stop the "thinking" indicator
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: botMessageText, // Uses the CLEANED text
            isBot: true
          }
        ])

        const textForSpeech = botMessageText // Uses the CLEANED text
          .replace(/\|/g, ', ')
          .replace(/---/g, '')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/`[^`]*`/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/#/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\n/g, ' ')

        const utterance = new SpeechSynthesisUtterance(textForSpeech)
        utterance.lang = "en-IN"
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)
        window.speechSynthesis.speak(utterance)

      } else {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }])
        setIsBotTyping(false)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted by user.')
      } else {
        const errorText = err instanceof Error ? err.message : "An unknown error occurred."
        setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }])
        toast({ title: "Error", description: errorText, variant: "destructive" })
      }
      setIsBotTyping(false)
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) {
      toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" })
      return
    }

    handleStopSpeech()

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-IN"

    setIsListening(true)

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }
      
      // --- MODIFIED: Use latest transcript for buffer AND input ---
      const latestTranscript = finalTranscript + interimTranscript
      transcriptBuffer.current = latestTranscript
      setMessage(latestTranscript)
    }

    recognition.onend = () => {
      setIsListening(false)
      // --- MODIFIED: Send from buffer, which has the latest text ---
      const finalText = transcriptBuffer.current.trim()
      if (finalText) {
        sendMessage(finalText)
      } else {
        setMessage("") // Clear input if no speech
      }
      transcriptBuffer.current = ""
    }

    recognition.onerror = (event: any) => {
      console.error('Speech Recognition Error:', event.error)
      if (event.error === 'no-speech') {
        toast({ title: "No Speech Detected", description: "Please ensure your microphone is working and speak clearly.", variant: "warning" })
      }
      setIsListening(false)
    }

    recognition.start()
    setRecognitionInstance(recognition)
  }

  const stopListening = () => {
    recognitionInstance?.stop()
    setIsListening(false)
  }

  // --- JSX Render ---
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-gradient-to-b from-background via-background to-muted/20">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/Y4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-4 pb-32 relative z-10">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
              <Skeleton className="h-16 w-1/2 rounded-2xl ml-auto" />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout
                  className={`flex items-end gap-3 ${msg.isBot ? "justify-start" : "justify-end"}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                >
                  {msg.isBot && (
                    <motion.div
                      className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-2xl self-start flex-shrink-0 shadow-lg shadow-primary/20"
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Bot className="w-5 h-5" />
                    </motion.div>
                  )}

                  <motion.div
                    className={`px-5 py-4 rounded-2xl max-w-[95%] lg:max-w-3xl break-words backdrop-blur-sm shadow-lg ${msg.isBot // --- MODIFIED ---
                      ? "bg-gradient-to-br from-muted/80 to-muted/60 border border-border/50 rounded-tl-sm"
                      : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-primary/25"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {/* --- MODIFIED: Simpler render logic --- */}
                    {msg.isBot ? (
                      <MessageContent msg={msg} sendMessage={sendMessage} />
                    ) : (
                      // Plain text for user messages, no need for markdown
                      <p className="my-0 leading-relaxed">{msg.text}</p>
                    )}
                  </motion.div>

                  {!msg.isBot && (
                    <motion.div
                      className="bg-gradient-to-br from-primary/15 to-primary/10 text-primary p-2.5 rounded-2xl self-start flex-shrink-0 backdrop-blur-sm border border-primary/20"
                      whileHover={{ scale: 1.05, rotate: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <User className="w-5 h-5" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isBotTyping && !messages.some(m => m.isBot && m.isTyping) && (
            <motion.div
              className="flex justify-start items-end gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-2xl self-start shadow-lg shadow-primary/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-gradient-to-br from-muted/80 to-muted/60 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-border/50 shadow-lg">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Enhanced Input Area */}
      <div className="absolute bottom-0 left-0 right-0 py-5 sm:py-6 border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl z-20">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {isBotTyping ? (
              <motion.div
                key="stop"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full flex justify-center items-center"
              >
                <Button
                  onClick={handleStopExecution}
                  variant="outline"
                  className="rounded-full px-6 py-6 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Stop Generating
                </Button>
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full flex justify-center items-center gap-4"
              >
                <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 rounded-full backdrop-blur-sm border border-primary/20">
                  <div className="relative">
                    <div className="w-3 h-3 bg-primary rounded-full animate-ping absolute" />
                    <div className="w-3 h-3 bg-primary rounded-full" />
                  </div>
                  <span className="text-sm font-medium text-primary">Listening...</span>
                </div>
                <Button
                  onClick={stopListening}
                  variant="destructive"
                  size="sm"
                  className="rounded-full px-5 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <StopCircle className="mr-2 w-4 h-4" /> Stop
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={(e) => { e.preventDefault(); sendMessage(message); }}
                className="w-full flex items-center gap-2 sm:gap-3 bg-muted/50 rounded-full p-2 border border-border/50 shadow-xl backdrop-blur-sm"
              >
                <Button
                  type="button"
                  onClick={handleStopSpeech}
                  variant="ghost"
                  size="icon"
                  className="rounded-full flex-shrink-0 hover:bg-muted transition-all duration-300"
                  disabled={!isSpeaking}
                >
                  {isSpeaking ? (
                    <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={startListening}
                  variant="ghost"
                  size="icon"
                  className="rounded-full flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  <Mic className="w-5 h-5" />
                </Button>

                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
                />

                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full flex-shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all duration-300 group"
                  disabled={!message.trim()}
                >
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}