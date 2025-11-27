

// "use client"

// // --- Imports ---
// import React, { useState, useRef, useEffect, FC, useCallback } from "react" // --- MODIFIED ---
// import { motion, AnimatePresence } from "framer-motion"
// import Link from "next/link"
// import ReactMarkdown from "react-markdown"
// import remarkGfm from 'remark-gfm'
// import { useRouter } from "next/navigation"

// // --- UI Components ---
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Skeleton } from "@/components/ui/skeleton"

// // --- Icons ---
// import { Send, Mic, StopCircle, Bot, User, Link2, ArrowRight, Volume2, VolumeX } from 'lucide-react' // --- MODIFIED (Removed Sparkles) ---

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
//   isTyping?: boolean
// }

// // ---
// // --- SUB-COMPONENTS (Moved outside DashboardContent)
// // ---

// const GoToProfileButton: FC = () => {
//   const router = useRouter()
//   const { userId } = useUserId()

//   const handleClick = () => {
//     if (userId) {
//       router.push(`/company_details`)
//     }
//   }

//   return (
//     <Button onClick={handleClick} className="mt-4 group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300">
//       <span className="relative z-10 flex items-center gap-2">
//         Create Your Business Profile
//         <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
//       </span>
//       <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
//     </Button>
//   )
// }

// const TypingIndicator: FC = () => (
//   <div className="flex items-center space-x-2 px-4 py-3">
//     <div className="flex space-x-1">
//       <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
//       <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
//       <div className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce"></div>
//     </div>
//     <span className="text-xs text-muted-foreground">AI is thinking...</span>
//   </div>
// )

// const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
//   return (
//     <div className="prose dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/50">
//       <ReactMarkdown
//         remarkPlugins={[remarkGfm]}
//         components={{
//           a: ({ node, ...props }) => {
//             const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
//             return (
//               <Link {...props} href={props.href || ''} target="_blank"
//                 className="inline-flex items-center gap-1.5 underline decoration-primary/30 underline-offset-4 font-medium text-primary hover:text-primary/80 hover:decoration-primary/60 transition-all duration-200">
//                 <Link2 className="w-3.5 h-3.5" />
//                 {isSpecialLink ? `Click to View` : props.children}
//               </Link>
//             )
//           },
//           p: ({ node, ...props }) => <p {...props} className="my-2 leading-relaxed" />,
//           ul: ({ node, ...props }) => <ul {...props} className="my-3 pl-5 space-y-1.5 list-disc marker:text-primary/60" />,
//           li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
//           table: ({ node, ...props }) => (
//             <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
//               <table {...props} className="w-full border-collapse" />
//             </div>
//           ),
//           thead: ({ node, ...props }) => <thead {...props} className="bg-muted/50 backdrop-blur-sm" />,
//           tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border/30" />,
//           tr: ({ node, ...props }) => <tr {...props} className="hover:bg-muted/30 transition-colors" />,
//           td: ({ node, ...props }) => <td {...props} className="p-3 text-sm" />,
//           th: ({ node, ...props }) => <th {...props} className="p-3 text-left text-sm font-semibold" />,
//           code: ({ node, inline, ...props }: any) =>
//             inline ? (
//               <code {...props} className="px-1.5 py-0.5 rounded bg-muted/80 text-primary font-mono text-sm" />
//             ) : (
//               <code {...props} className="block" />
//             ),
//         }}
//       >
//         {content}
//       </ReactMarkdown>
//       {actionButton && <div className="mt-3">{actionButton}</div>}
//     </div>
//   )
// }

// // --- MODIFIED ---
// // Moved MessageContent outside of DashboardContent to prevent re-creation on render.
// const MessageContent: FC<{ msg: Message; sendMessage: (text: string) => Promise<void> }> = React.memo(({ msg, sendMessage }) => {
//   const content = msg.isTyping ? msg.text : msg.text.replace('▍', '')

//   return (
//     <>
//       <FormattedMessage
//         content={content}
//         actionButton={msg.actionButton}
//       />

//       {msg.suggestions && msg.suggestions.length > 0 && (
//         <div className="mt-4 flex flex-wrap gap-2">
//           {msg.suggestions.map((s, i) => (
//             <motion.div
//               key={`${msg.id}-suggestion-${i}`}
//               initial={{ opacity: 0, scale: 0.9 }}
//               animate={{ opacity: 1, scale: 1 }}
//               transition={{ delay: i * 0.1 }}
//             >
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-300 backdrop-blur-sm"
//                 onClick={() => sendMessage(s)}
//               >
//                 {s}
//               </Button>
//             </motion.div>
//           ))}
//         </div>
//       )}
//     </>
//   )
// }, (prevProps, nextProps) => {
//   // Custom comparison function to prevent unnecessary re-renders
//   return (
//     prevProps.msg.id === nextProps.msg.id &&
//     prevProps.msg.text === nextProps.msg.text &&
//     prevProps.msg.isTyping === nextProps.msg.isTyping &&
//     JSON.stringify(prevProps.msg.suggestions) === JSON.stringify(nextProps.msg.suggestions)
//   )
// })
// MessageContent.displayName = 'MessageContent'; // Good practice for React.memo


// // --- Main DashboardContent Component ---
// export function DashboardContent() {
//   const { userId, session, sellerDetails } = useUserId()
//   const { toast } = useToast()

//   const [isLoading, setIsLoading] = useState(true)
//   const [message, setMessage] = useState("")
//   const [messages, setMessages] = useState<Message[]>([])
//   const [isBotTyping, setIsBotTyping] = useState(false)
//   const [isListening, setIsListening] = useState(false)
//   const [isSpeaking, setIsSpeaking] = useState(false)
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
//     if (!isBotTyping) {
//       scrollToBottom()
//     }
//   }, [messages])

//   useEffect(() => {
//     if (isBotTyping) {
//       scrollToBottom()
//     }
//   }, [isBotTyping, messages.length > 0 ? messages[messages.length - 1]?.text : null])

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

//       setMessages(prev => {
//         const lastMessage = prev[prev.length - 1]
//         if (lastMessage && lastMessage.isBot && lastMessage.isTyping) {
//           const completeText = lastMessage.text.replace('▍', '')
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

//   // NOTE: You are not calling this function, which is fine.
//   // The "fast load" method you're using in sendMessage is better for tables.
//   const startAutotext = (fullText: string) => {
//     const finalBotMessageId = Date.now() + 1
//     let i = 0
//     let currentText = ""

//     setMessages((prev) => [...prev, { id: finalBotMessageId, text: "", isBot: true, isTyping: true }])
//     setIsBotTyping(true)

//     handleStopAutotext()

//     autoTextIntervalRef.current = setInterval(() => {
//       if (i < fullText.length) {
//         currentText += fullText[i]
//         i++

//         setMessages((prev) => {
//           const lastMessage = prev[prev.length - 1]
//           if (lastMessage && lastMessage.id === finalBotMessageId) {
//             return [
//               ...prev.slice(0, prev.length - 1),
//               { ...lastMessage, text: currentText + '▍' }
//             ]
//           }
//           return prev
//         })
//       } else {
//         handleStopAutotext()
//         setIsBotTyping(false)

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
//     }, 20) // 20ms interval

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
      
//       // --- MODIFIED: START OF SANITIZATION ---
//       let botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message

//       if (botMessageText) {
//         // Clean the text: remove markdown code fences if they exist
//         botMessageText = botMessageText
//           .replace(/^```(markdown)?\n?/, '') // Remove start fence
//           .replace(/\n?```$/, '')              // Remove end fence
//           .trim() // Trim any leading/trailing whitespace
//       }
//       // --- MODIFIED: END OF SANITIZATION ---

//       if (botMessageText) {
//         // You are correctly using the "fast load" method here.
//         // startAutotext(botMessageText) // This is commented out.
//         setIsBotTyping(false) // Stop the "thinking" indicator
//         setMessages((prev) => [
//           ...prev,
//           {
//             id: Date.now() + 1,
//             text: botMessageText, // Uses the CLEANED text
//             isBot: true
//           }
//         ])

//         const textForSpeech = botMessageText // Uses the CLEANED text
//           .replace(/\|/g, ', ')
//           .replace(/---/g, '')
//           .replace(/```[\s\S]*?```/g, '')
//           .replace(/`[^`]*`/g, '')
//           .replace(/\*\*/g, '')
//           .replace(/\*/g, '')
//           .replace(/#/g, '')
//           .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
//           .replace(/\n/g, ' ')

//         // const utterance = new SpeechSynthesisUtterance(textForSpeech)
//         // utterance.lang = "en-IN"
//         // utterance.onstart = () => setIsSpeaking(true)
//         // utterance.onend = () => setIsSpeaking(false)
//         // utterance.onerror = () => setIsSpeaking(false)
//         // window.speechSynthesis.speak(utterance)

//       } else {
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

//     handleStopSpeech()

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
      
//       // --- MODIFIED: Use latest transcript for buffer AND input ---
//       const latestTranscript = finalTranscript + interimTranscript
//       transcriptBuffer.current = latestTranscript
//       setMessage(latestTranscript)
//     }

//     recognition.onend = () => {
//       setIsListening(false)
//       // --- MODIFIED: Send from buffer, which has the latest text ---
//       const finalText = transcriptBuffer.current.trim()
//       if (finalText) {
//         sendMessage(finalText)
//       } else {
//         setMessage("") // Clear input if no speech
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

//   // --- JSX Render ---
//   return (
//     <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-gradient-to-b from-background via-background to-muted/20">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute top-1/Y4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
//         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
//       </div>

//       <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-4 pb-32 relative z-10">
//         <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
//           {isLoading ? (
//             <div className="space-y-4">
//               <Skeleton className="h-20 w-3/4 rounded-2xl" />
//               <Skeleton className="h-16 w-1/2 rounded-2xl ml-auto" />
//             </div>
//           ) : (
//             <AnimatePresence mode="popLayout">
//               {messages.map((msg) => (
//                 <motion.div
//                   key={msg.id}
//                   layout
//                   className={`flex items-end gap-3 ${msg.isBot ? "justify-start" : "justify-end"}`}
//                   initial={{ opacity: 0, y: 20, scale: 0.95 }}
//                   animate={{ opacity: 1, y: 0, scale: 1 }}
//                   exit={{ opacity: 0, scale: 0.95 }}
//                   transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
//                 >
//                   {msg.isBot && (
//                     <motion.div
//                       className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-2xl self-start flex-shrink-0 shadow-lg shadow-primary/20"
//                       whileHover={{ scale: 1.05, rotate: 5 }}
//                       transition={{ type: "spring", stiffness: 300 }}
//                     >
//                       <Bot className="w-5 h-5" />
//                     </motion.div>
//                   )}

//                   <motion.div
//                     className={`px-5 py-4 rounded-2xl max-w-[95%] lg:max-w-3xl break-words backdrop-blur-sm shadow-lg ${msg.isBot // --- MODIFIED ---
//                       ? "bg-gradient-to-br from-muted/80 to-muted/60 border border-border/50 rounded-tl-sm"
//                       : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-primary/25"
//                     }`}
//                     whileHover={{ scale: 1.01 }}
//                     transition={{ type: "spring", stiffness: 300 }}
//                   >
//                     {/* --- MODIFIED: Simpler render logic --- */}
//                     {msg.isBot ? (
//                       <MessageContent msg={msg} sendMessage={sendMessage} />
//                     ) : (
//                       // Plain text for user messages, no need for markdown
//                       <p className="my-0 leading-relaxed">{msg.text}</p>
//                     )}
//                   </motion.div>

//                   {!msg.isBot && (
//                     <motion.div
//                       className="bg-gradient-to-br from-primary/15 to-primary/10 text-primary p-2.5 rounded-2xl self-start flex-shrink-0 backdrop-blur-sm border border-primary/20"
//                       whileHover={{ scale: 1.05, rotate: -5 }}
//                       transition={{ type: "spring", stiffness: 300 }}
//                     >
//                       <User className="w-5 h-5" />
//                     </motion.div>
//                   )}
//                 </motion.div>
//               ))}
//             </AnimatePresence>
//           )}

//           {isBotTyping && !messages.some(m => m.isBot && m.isTyping) && (
//             <motion.div
//               className="flex justify-start items-end gap-3"
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//             >
//               <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-2xl self-start shadow-lg shadow-primary/20">
//                 <Bot className="w-5 h-5" />
//               </div>
//               <div className="bg-gradient-to-br from-muted/80 to-muted/60 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-border/50 shadow-lg">
//                 <TypingIndicator />
//               </div>
//             </motion.div>
//           )}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       {/* Enhanced Input Area */}
//       <div className="absolute bottom-0 left-0 right-0 py-5 sm:py-6 border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl z-20">
//         <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
//           <AnimatePresence mode="wait">
//             {isBotTyping ? (
//               <motion.div
//                 key="stop"
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -10 }}
//                 className="w-full flex justify-center items-center"
//               >
//                 <Button
//                   onClick={handleStopExecution}
//                   variant="outline"
//                   className="rounded-full px-6 py-6 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 shadow-lg hover:shadow-xl transition-all duration-300"
//                 >
//                   <StopCircle className="mr-2 h-5 w-5" />
//                   Stop Generating
//                 </Button>
//               </motion.div>
//             ) : isListening ? (
//               <motion.div
//                 key="listening"
//                 initial={{ opacity: 0, scale: 0.9 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 exit={{ opacity: 0, scale: 0.9 }}
//                 className="w-full flex justify-center items-center gap-4"
//               >
//                 <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 rounded-full backdrop-blur-sm border border-primary/20">
//                   <div className="relative">
//                     <div className="w-3 h-3 bg-primary rounded-full animate-ping absolute" />
//                     <div className="w-3 h-3 bg-primary rounded-full" />
//                   </div>
//                   <span className="text-sm font-medium text-primary">Listening...</span>
//                 </div>
//                 <Button
//                   onClick={stopListening}
//                   variant="destructive"
//                   size="sm"
//                   className="rounded-full px-5 shadow-lg hover:shadow-xl transition-all duration-300"
//                 >
//                   <StopCircle className="mr-2 w-4 h-4" /> Stop
//                 </Button>
//               </motion.div>
//             ) : (
//               <motion.form
//                 key="input"
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -10 }}
//                 onSubmit={(e) => { e.preventDefault(); sendMessage(message); }}
//                 className="w-full flex items-center gap-2 sm:gap-3 bg-muted/50 rounded-full p-2 border border-border/50 shadow-xl backdrop-blur-sm"
//               >
//                 <Button
//                   type="button"
//                   onClick={handleStopSpeech}
//                   variant="ghost"
//                   size="icon"
//                   className="rounded-full flex-shrink-0 hover:bg-muted transition-all duration-300"
//                   disabled={!isSpeaking}
//                 >
//                   {isSpeaking ? (
//                     <Volume2 className="w-5 h-5 text-primary animate-pulse" />
//                   ) : (
//                     <VolumeX className="w-5 h-5 text-muted-foreground/50" />
//                   )}
//                 </Button>

//                 <Button
//                   type="button"
//                   onClick={startListening}
//                   variant="ghost"
//                   size="icon"
//                   className="rounded-full flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all duration-300"
//                 >
//                   <Mic className="w-5 h-5" />
//                 </Button>

//                 <Input
//                   value={message}
//                   onChange={(e) => setMessage(e.target.value)}
//                   placeholder="Ask me anything..."
//                   className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/60"
//                 />

//                 <Button
//                   type="submit"
//                   size="icon"
//                   className="rounded-full flex-shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all duration-300 group"
//                   disabled={!message.trim()}
//                 >
//                   <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
//                 </Button>
//               </motion.form>
//             )}
//           </AnimatePresence>
//         </div>
//       </div>
//     </div>
//   )
// }


"use client"

// --- Imports ---
import React, { useState, useRef, useEffect, useLayoutEffect, FC, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from 'remark-gfm'
import { useRouter } from "next/navigation"

// --- Supabase ---
import { supabase } from "@/lib/supabase"
// --- UI Components ---
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// --- Icons ---
import { 
  Send, Mic, StopCircle, Bot, User, Link2, ArrowRight, 
  Volume2, VolumeX, Users, Package, X, Loader2, Copy, Check 
} from 'lucide-react'

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

type SuggestionType = 'buyer' | 'item' | null

interface BuyerRecord {
  id: number
  name: string
  gstin: string | null
  address: string
}

interface ProductRecord {
  id: string 
  name: string
  rate: number
  hsn?: string
}

// --- SUB-COMPONENTS ---

const GoToProfileButton: FC = () => {
  const router = useRouter()
  const { userId } = useUserId()

  const handleClick = () => {
    if (userId) router.push(`/company_details`)
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

// --- Formatting & Markdown ---
const FormattedMessage: FC<{ content: string; actionButton?: React.ReactNode }> = ({ content, actionButton }) => {
  return (
    <div className="prose dark:prose-invert max-w-none w-full text-sm sm:text-base break-words prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-0 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me")
            return (
              <Link {...props} href={props.href || ''} target="_blank"
                className="inline-flex items-center gap-1.5 underline decoration-primary/30 underline-offset-4 font-medium text-primary hover:text-primary/80 hover:decoration-primary/60 transition-all duration-200 break-all">
                <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                {isSpecialLink ? `Click to View` : props.children}
              </Link>
            )
          },
          p: ({ node, ...props }) => <p {...props} className="my-2 leading-relaxed break-words whitespace-pre-wrap" />,
          ul: ({ node, ...props }) => <ul {...props} className="my-3 pl-5 space-y-1.5 list-disc marker:text-primary/60" />,
          li: ({ node, ...props }) => <li {...props} className="leading-relaxed" />,
          table: ({ node, ...props }) => (
            <div className="my-4 w-full overflow-x-auto rounded-lg border border-border/50">
              <table {...props} className="w-full border-collapse min-w-[300px]" />
            </div>
          ),
          thead: ({ node, ...props }) => <thead {...props} className="bg-muted/50 backdrop-blur-sm" />,
          tbody: ({ node, ...props }) => <tbody {...props} className="divide-y divide-border/30" />,
          tr: ({ node, ...props }) => <tr {...props} className="hover:bg-muted/30 transition-colors" />,
          td: ({ node, ...props }) => <td {...props} className="p-2 sm:p-3 text-sm border-r last:border-r-0 border-border/20" />,
          th: ({ node, ...props }) => <th {...props} className="p-2 sm:p-3 text-left text-sm font-semibold border-r last:border-r-0 border-border/20" />,
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code {...props} className="px-1.5 py-0.5 rounded bg-muted/80 text-primary font-mono text-xs sm:text-sm break-all" />
            ) : (
              <div className="w-full overflow-x-auto bg-zinc-950/50 dark:bg-zinc-900/50 p-3 rounded-lg my-2">
                 <code {...props} className="block font-mono text-xs sm:text-sm text-primary/90 whitespace-pre" />
              </div>
            ),
          pre: ({ node, ...props }) => (
             <pre {...props} className="m-0 w-full overflow-hidden" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
      {actionButton && <div className="mt-3">{actionButton}</div>}
    </div>
  )
}

const MessageContent: FC<{ msg: Message; sendMessage: (text: string) => Promise<void> }> = React.memo(({ msg, sendMessage }) => {
  const content = msg.isTyping ? msg.text : msg.text.replace('▍', '')

  return (
    <>
      <FormattedMessage content={content} actionButton={msg.actionButton} />
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
                className="rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40 hover:shadow-md transition-all duration-300 backdrop-blur-sm text-xs sm:text-sm"
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
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.text === nextProps.msg.text &&
    prevProps.msg.isTyping === nextProps.msg.isTyping &&
    JSON.stringify(prevProps.msg.suggestions) === JSON.stringify(nextProps.msg.suggestions)
  )
})
MessageContent.displayName = 'MessageContent';


// --- Main DashboardContent Component ---
export function DashboardContent() {
  const { userId, session, sellerDetails } = useUserId()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState("")
  
  // Pagination State
  const [fullHistory, setFullHistory] = useState<Message[]>([])
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([])
  const [page, setPage] = useState(1)
  const MESSAGES_PER_PAGE = 20
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const prevScrollHeightRef = useRef<number>(0)

  const [isBotTyping, setIsBotTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null)

  // Copy State
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Mentions State
  const [mentionType, setMentionType] = useState<SuggestionType>(null)
  const [mentionQuery, setMentionQuery] = useState("")
  const [fetchedSuggestions, setFetchedSuggestions] = useState<(BuyerRecord | ProductRecord)[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null) 
  const transcriptBuffer = useRef("")
  const abortControllerRef = useRef<AbortController | null>(null)
  const autoTextIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- SCROLL TO BOTTOM ---
  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current
      scrollContainerRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior })
    }
  }

  // --- COPY FUNCTIONALITY ---
  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast({ description: "Copied to clipboard" })
    } catch (err) {
      toast({ description: "Failed to copy", variant: "destructive" })
    }
  }

  // --- SAVE MESSAGE ---
  const saveMessageToMemory = async (text: string, type: 'human' | 'ai') => {
    if (!userId) return;
    const newMessageObject = { type: type, data: { content: text, additional_kwargs: {}, type: type, example: false } };
    try {
      await supabase.rpc('append_chat_message', { p_user_id: userId, new_msg: newMessageObject });
    } catch (err) { console.error("Failed to save:", err); }
  };

  // --- LOAD FULL HISTORY ---
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      if (!userId) {
        setFullHistory([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.from('conversation_memory').select('memory').eq('user_id', userId).single();
      
      const history = data?.memory || [];
      let allMsgs: Message[] = [];
      
      if (history.length > 0) {
        allMsgs = history.map((item: any, index: number) => ({
          id: Date.now() + index,
          text: item.data?.content || item.content || "",
          isBot: item.type === 'ai' || item.type === 'assistant'
        }));
      } else if (sellerDetails) {
        allMsgs = [{ id: 1, text: "Hi! I'm your Vyapari Assistant. How can I help you today?", isBot: true,  suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"] }];
      } else {
        allMsgs = [{ id: 1, text: "Welcome! Please create your business profile.", isBot: true, actionButton: <GoToProfileButton /> }];
      }

      setFullHistory(allMsgs);
      
      // Load last N messages
      const initialSlice = allMsgs.slice(-MESSAGES_PER_PAGE);
      setDisplayedMessages(initialSlice);
      setPage(1);
      setIsLoading(false);
      
      setTimeout(() => scrollToBottom("auto"), 100);
    };

    loadHistory();
  }, [userId, sellerDetails, supabase]);

  // --- SCROLL PAGINATION HANDLER ---
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight } = scrollContainerRef.current;

    if (scrollTop === 0 && !isFetchingMore && displayedMessages.length < fullHistory.length) {
      prevScrollHeightRef.current = scrollHeight; // Capture height before adding items
      setIsFetchingMore(true);

      setTimeout(() => {
        const nextCount = (page + 1) * MESSAGES_PER_PAGE;
        const nextSlice = fullHistory.slice(-nextCount);
        
        setDisplayedMessages(nextSlice);
        setPage(prev => prev + 1);
      }, 300);
    }
  };

  // --- SCROLL RESTORATION ---
  useLayoutEffect(() => {
    if (isFetchingMore && scrollContainerRef.current) {
      const newScrollHeight = scrollContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - prevScrollHeightRef.current;
      scrollContainerRef.current.scrollTop = heightDifference;
      setIsFetchingMore(false);
    } else if (!isFetchingMore && !isBotTyping && !isLoading) {
        if (displayedMessages.length > 0 && displayedMessages[displayedMessages.length - 1].id > (Date.now() - 2000)) {
            scrollToBottom("smooth");
        }
    }
  }, [displayedMessages, isFetchingMore, isBotTyping, isLoading]);

  useEffect(() => { if (isBotTyping) scrollToBottom("smooth"); }, [isBotTyping, displayedMessages.length > 0 ? displayedMessages[displayedMessages.length-1].text : null]);

  // --- MENTIONS LOGIC ---
  useEffect(() => {
    if (!mentionType || !userId) { setFetchedSuggestions([]); return; }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const table = mentionType === 'buyer' ? 'buyers_record' : 'products';
        const select = mentionType === 'buyer' ? 'id, name, gstin, address' : 'id, name, rate';
        const { data } = await supabase.from(table).select(select).eq('user_id', userId).ilike('name', `%${mentionQuery}%`).limit(5);
        setFetchedSuggestions(data || []);
      } catch (e) { console.error(e); } finally { setIsFetchingSuggestions(false); }
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) };
  }, [mentionType, mentionQuery, userId, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setMessage(val);
    const words = val.split(" "); const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) { setMentionType("buyer"); setMentionQuery(lastWord.slice(1)); }
    else if (lastWord.startsWith("#")) { setMentionType("item"); setMentionQuery(lastWord.slice(1)); }
    else { setMentionType(null); setMentionQuery(""); }
  };

  const insertMention = (name: string) => {
    const words = message.split(" "); words.pop();
    setMessage([...words, name].join(" ") + " "); setMentionType(null); inputRef.current?.focus();
  };
  const forceOpenMention = (type: SuggestionType) => { setMessage(prev => prev + " " + (type === 'buyer' ? '@' : '#')); setMentionType(type); inputRef.current?.focus(); };

  // --- EVENT HANDLERS ---
  const handleStopSpeech = useCallback(() => { if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); } }, []);
  const handleStopAutotext = () => { if (autoTextIntervalRef.current) { clearInterval(autoTextIntervalRef.current); autoTextIntervalRef.current = null; } };
  const handleStopExecution = () => { handleStopSpeech(); handleStopAutotext(); if (abortControllerRef.current) abortControllerRef.current.abort(); setIsBotTyping(false); };

  // --- SEND MESSAGE ---
  const sendMessage = async (text: string) => {
    const trimmedText = text.trim()
    if (!trimmedText) return

    if (!userId || !session) { toast({ title: "Error", description: "Please log in.", variant: "destructive" }); return; }
    if (!sellerDetails) { 
        const msg = { id: Date.now(), text: "Please create your business profile first.", isBot: true, actionButton: <GoToProfileButton /> };
        setFullHistory(prev => [...prev, msg]); setDisplayedMessages(prev => [...prev, msg]);
        return; 
    }

    handleStopExecution();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg = { id: Date.now(), text: trimmedText, isBot: false };
    setFullHistory(prev => [...prev, userMsg]);
    setDisplayedMessages(prev => [...prev, userMsg]);
    
    setMessage(""); setMentionType(null); setIsBotTyping(true);
    saveMessageToMemory(trimmedText, 'human');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ input_value: trimmedText, user_id: userId }), signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      
      let botText = data?.url ? `${data.message}\n${data.url}` : data?.message;
      if (botText) botText = botText.replace(/^```(markdown)?\n?/, '').replace(/\n?```$/, '').trim();

      if (botText) {
        setIsBotTyping(false);
        const botMsg = { id: Date.now() + 1, text: botText, isBot: true };
        setFullHistory(prev => [...prev, botMsg]);
        setDisplayedMessages(prev => [...prev, botMsg]);
        saveMessageToMemory(botText, 'ai');
      } else {
        const errMsg = { id: Date.now() + 1, text: "I didn't get a response.", isBot: true };
        setFullHistory(prev => [...prev, errMsg]);
        setDisplayedMessages(prev => [...prev, errMsg]);
        setIsBotTyping(false);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errMsg = { id: Date.now(), text: `❌ ${err.message}`, isBot: true };
        setFullHistory(prev => [...prev, errMsg]);
        setDisplayedMessages(prev => [...prev, errMsg]);
      }
      setIsBotTyping(false);
    } finally { if (abortControllerRef.current === controller) abortControllerRef.current = null; }
  };

  // --- SPEECH ---
  const startListening = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) { toast({ title: "Error", description: "Browser not supported.", variant: "destructive" }); return; }
    handleStopSpeech();
    const recognition = new SpeechRecognition(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = "en-IN";
    setIsListening(true);
    recognition.onresult = (event: any) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      transcriptBuffer.current = final + interim; setMessage(transcriptBuffer.current);
    };
    recognition.onend = () => { setIsListening(false); if (transcriptBuffer.current.trim()) sendMessage(transcriptBuffer.current); else setMessage(""); transcriptBuffer.current = ""; };
    recognition.start(); setRecognitionInstance(recognition);
  };
  const stopListening = () => { recognitionInstance?.stop(); setIsListening(false); };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative bg-gradient-to-b from-background via-background to-muted/20">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-4 pb-48 relative z-10 scroll-smooth"
      >
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          
          {isFetchingMore && (
             <div className="flex justify-center py-2">
               <Loader2 className="w-5 h-5 text-primary animate-spin" />
             </div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
              <Skeleton className="h-16 w-1/2 rounded-2xl ml-auto" />
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayedMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout
                  className={`flex items-end gap-3 ${msg.isBot ? "justify-start" : "justify-end"}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                >
                  {msg.isBot && (
                    <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-2xl self-start flex-shrink-0 shadow-lg shadow-primary/20">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}
                  
                  {/* MESSAGE BUBBLE */}
                  <div className={`group relative px-4 py-3 sm:px-5 sm:py-4 rounded-2xl max-w-[85%] sm:max-w-[80%] lg:max-w-3xl shadow-lg overflow-hidden ${msg.isBot ? "bg-gradient-to-br from-muted/95 to-muted/80 border border-border/50 rounded-tl-sm" : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-primary/25"}`}>
                    
                    {/* COPY BUTTON */}
                    <Button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        size="icon"
                        variant="ghost"
                        className={`absolute top-2 right-2 w-6 h-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full ${
                            msg.isBot 
                            ? "text-muted-foreground hover:text-foreground bg-background/50 hover:bg-background/80" 
                            : "text-primary-foreground/80 hover:text-white bg-primary-foreground/10 hover:bg-primary-foreground/20"
                        }`}
                    >
                        {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>

                    {msg.isBot ? <MessageContent msg={msg} sendMessage={sendMessage} /> : <p className="my-0 leading-relaxed break-words whitespace-pre-wrap text-sm sm:text-base">{msg.text}</p>}
                  </div>

                  {!msg.isBot && (
                    <div className="bg-gradient-to-br from-primary/15 to-primary/10 text-primary p-2.5 rounded-2xl self-start flex-shrink-0 backdrop-blur-sm border border-primary/20">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isBotTyping && !displayedMessages.some(m => m.isBot && m.isTyping) && (
            <motion.div className="flex justify-start items-end gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-2.5 rounded-2xl self-start shadow-lg shadow-primary/20">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-gradient-to-br from-muted/80 to-muted/60 backdrop-blur-sm rounded-2xl rounded-tl-sm border border-border/50 shadow-lg">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <AnimatePresence>
          {mentionType && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 right-0 mb-2 mx-auto max-w-4xl px-4 z-50 pointer-events-none">
               <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden pointer-events-auto max-h-60 overflow-y-auto w-full md:w-80 md:ml-12">
                 <div className="p-2 border-b flex justify-between bg-muted/30"><span className="text-xs font-semibold uppercase pl-2">Select {mentionType}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>setMentionType(null)}><X className="w-3 h-3"/></Button></div>
                 <div className="p-1.5 space-y-0.5">
                   {isFetchingSuggestions ? <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin"/></div> : fetchedSuggestions.length > 0 ? fetchedSuggestions.map((item: any) => (
                        <button key={item.id} onClick={() => insertMention(item.name)} className="w-full flex items-center gap-3 p-2.5 text-sm rounded-lg hover:bg-primary/10 text-left group">
                          <div className="p-1.5 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"><Users className="w-4 h-4"/></div>
                          <div><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{mentionType === 'buyer' ? `GST: ${item.gstin||'N/A'}` : `Rate: ₹${item.rate}`}</div></div>
                        </button>
                   )) : <div className="p-3 text-sm text-center text-muted-foreground">No matches</div>}
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="md:hidden border-t border-border/30 bg-background/80 backdrop-blur-md px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar">
          <Button variant="secondary" size="sm" onClick={() => forceOpenMention('buyer')} className="flex-shrink-0 gap-2 rounded-full h-8 text-xs border border-border/50"><Users className="w-3.5 h-3.5" /> Buyers</Button>
          <Button variant="secondary" size="sm" onClick={() => forceOpenMention('item')} className="flex-shrink-0 gap-2 rounded-full h-8 text-xs border border-border/50"><Package className="w-3.5 h-3.5" /> Items</Button>
        </div>

        <div className="py-5 sm:py-6 border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            <AnimatePresence mode="wait">
              {isBotTyping ? (
                <motion.div key="stop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
                  <Button onClick={handleStopExecution} variant="outline" className="rounded-full px-6 py-6 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 shadow-lg"><StopCircle className="mr-2 h-5 w-5" /> Stop Generating</Button>
                </motion.div>
              ) : isListening ? (
                <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center items-center gap-4">
                  <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 rounded-full border border-primary/20"><div className="relative"><div className="w-3 h-3 bg-primary rounded-full animate-ping absolute" /><div className="w-3 h-3 bg-primary rounded-full" /></div><span className="text-sm font-medium text-primary">Listening...</span></div>
                  <Button onClick={stopListening} variant="destructive" size="sm" className="rounded-full px-5 shadow-lg"><StopCircle className="mr-2 w-4 h-4" /> Stop</Button>
                </motion.div>
              ) : (
                <motion.form key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="w-full flex items-center gap-2 sm:gap-3 bg-muted/50 rounded-full p-2 border border-border/50 shadow-xl backdrop-blur-sm">
                  <Button type="button" onClick={handleStopSpeech} variant="ghost" size="icon" className="rounded-full flex-shrink-0 hover:bg-muted" disabled={!isSpeaking}>{isSpeaking ? <Volume2 className="w-5 h-5 text-primary animate-pulse" /> : <VolumeX className="w-5 h-5 text-muted-foreground/50" />}</Button>
                  <Button type="button" onClick={startListening} variant="ghost" size="icon" className="rounded-full flex-shrink-0 hover:bg-primary/10 hover:text-primary"><Mic className="w-5 h-5" /></Button>
                  <Input ref={inputRef} value={message} onChange={handleInputChange} placeholder="Type @ for buyers, # for items..." className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-muted-foreground/60" />
                  <Button type="submit" size="icon" className="rounded-full flex-shrink-0 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg group" disabled={!message.trim()}><Send className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" /></Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

