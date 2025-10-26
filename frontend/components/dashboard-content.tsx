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


"use client"

// --- Imports ---
import { useState, useRef, useEffect, FC } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from 'remark-gfm' // For full Markdown support
import { useRouter } from "next/navigation"

// --- UI Components ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// --- Icons ---
import { Send, Mic, StopCircle, Bot, User, Link2, ArrowRight } from "lucide-react"

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
}

// --- Helper Component ---
const GoToProfileButton: FC = () => {
  const router = useRouter()
  const { userId } = useUserId()

  const handleClick = () => {
    if (userId) {
      router.push(`/company_details`)
    }
  }

  return (
    <Button onClick={handleClick} className="mt-3">
      Create Your Business Profile
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  )
}

// --- Sub-components ---
const TypingIndicator: FC = () => (
  <div className="flex items-center space-x-1 p-3">
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
  </div>
)

const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
  return (
    <div className="prose dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
            return (
              <Link {...props} href={props.href || ''} target="_blank"
                className="inline-flex items-center gap-1 underline font-semibold text-primary hover:text-primary/80 transition-colors">
                <Link2 className="w-4 h-4" />
                {isSpecialLink ? `Click to View` : props.children}
              </Link>
            )
          },
          p: ({ node, ...props }) => <p {...props} className="my-1" />,
          ul: ({ node, ...props }) => <ul {...props} className="my-2 pl-4 list-disc" />,
          li: ({ node, ...props }) => <li {...props} className="my-1" />,
          table: ({ node, ...props }) => <table {...props} className="w-full border-collapse border border-border" />,
          thead: ({ node, ...props }) => <thead {...props} className="font-bold bg-muted" />,
          tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border" />,
          tr: ({ node, ...props }) => <tr {...props} className="even:bg-muted/50" />,
          td: ({ node, ...props }) => <td {...props} className="p-2 border border-border" />,
          th: ({ node, ...props }) => <th {...props} className="p-2 border border-border text-left" />,
        }}
      >
        {content}
      </ReactMarkdown>
      {actionButton && <div className="mt-2">{actionButton}</div>}
    </div>
  )
}

// --- Main DashboardContent Component (as a Chat Interface) ---
export function DashboardContent() {
  const { userId, session, sellerDetails } = useUserId()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const transcriptBuffer = useRef("")
  const abortControllerRef = useRef<AbortController | null>(null)

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isBotTyping])

  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
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
      const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

      if (botMessageText) {
        const textForSpeech = botMessageText
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
        window.speechSynthesis.speak(utterance)

        setMessages((prev) => [...prev, { id: Date.now() + 1, text: botMessageText, isBot: true }])
      } else {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }])
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted by user.')
      } else {
        const errorText = err instanceof Error ? err.message : "An unknown error occurred."
        setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }])
        toast({ title: "Error", description: errorText, variant: "destructive" })
      }
    } finally {
      setIsBotTyping(false)
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
      transcriptBuffer.current = finalTranscript
      setMessage(finalTranscript || interimTranscript)
    }

    recognition.onend = () => {
      setIsListening(false)
      const finalText = transcriptBuffer.current.trim()
      if (finalText) {
        sendMessage(finalText)
      }
    }

    recognition.start()
    setRecognitionInstance(recognition)
  }

  const stopListening = () => {
    recognitionInstance?.stop()
    setIsListening(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative">

      <div className="flex-1 overflow-y-auto py-6 space-y-4 pb-24">
        
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4 rounded-lg" />
              <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
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
                {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start flex-shrink-0"><Bot className="w-5 h-5" /></div>}
                
                <div className={`p-3 rounded-2xl max-w-3xl ${
                  msg.isBot
                    ? "bg-muted rounded-tl-none"
                    : "bg-primary text-primary-foreground rounded-br-none"
                }`}>
                  
                  <FormattedMessage 
                    content={msg.text} 
                    actionButton={msg.actionButton} 
                  />
                  
                  {msg.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.suggestions.map((s, i) => (
                        <Button 
                            key={i} 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" 
                            onClick={() => sendMessage(s)}
                        >
                            {s}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                
                {!msg.isBot && <div className="bg-primary/10 text-primary p-2 rounded-full self-start flex-shrink-0"><User className="w-5 h-5" /></div>}
              </motion.div>
            ))
          )}
          {isBotTyping && <div className="flex justify-start items-end gap-2"><div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div><TypingIndicator /></div>}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 py-4 sm:py-5 border-t bg-background/80 backdrop-blur-sm">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          {isBotTyping ? (
            <div className="w-full flex justify-center items-center">
              <Button variant="outline" onClick={handleStopExecution} className="rounded-full">
                <StopCircle className="mr-2 h-4 w-4" />
                Stop Generating
              </Button>
            </div>
          ) : isListening ? (
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
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-2 sm:gap-3">
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
        </div>
      </div>
    </div>
  )
}