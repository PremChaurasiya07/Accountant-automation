"use client";

import { useState, useRef, useEffect, FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { MessageCircle, X, Send, Mic, StopCircle, Bot, User, Link2 } from "lucide-react";

import { useUserId } from "@/hooks/context/UserContext";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  suggestions?: string[];
}

const TypingIndicator: FC = () => (
    <div className="flex items-center space-x-1 p-3">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
    </div>
);

const FormattedMessage: FC<{ content: string }> = ({ content }) => {
    return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, ...props }) => {
                        const isSpecialLink = props.href?.includes("supabase.co/storage") || props.href?.includes("wa.me");
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
                    table: ({node, ...props}) => <table {...props} className="w-full text-xs border-collapse border border-slate-200" />,
                    thead: ({node, ...props}) => <thead {...props} className="font-bold bg-muted" />,
                    tbody: ({node, ...props}) => <tbody {...props} className="divide-y divide-slate-200" />,
                    tr: ({node, ...props}) => <tr {...props} className="even:bg-muted/50" />,
                    td: ({node, ...props}) => <td {...props} className="p-2 border border-slate-200" />,
                    th: ({node, ...props}) => <th {...props} className="p-2 border border-slate-200 text-left" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

const ChatBot: FC = () => {
    const { userId, session, sellerDetails } = useUserId();
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

    const initializedRef = useRef(false);
    const prevUserIdRef = useRef<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const transcriptBuffer = useRef("");

    // Initialize welcome message once per user session. React strict-mode double-mounts are ignored.
    useEffect(() => {
        setIsLoading(true);

        // if user changes, allow re-init for new user
        if (userId && prevUserIdRef.current !== userId) {
            initializedRef.current = false;
            prevUserIdRef.current = userId;
        }

        // Only initialize once per user
        if (!userId || initializedRef.current) {
            setIsLoading(false);
            return;
        }

        if (sellerDetails) {
            setMessages([{
                id: Date.now(),
                text: "Hi! I'm your Vyapari Assistant. How can I help you today?",
                isBot: true,
                suggestions: ["Create an invoice", "Summarize my monthly earnings", "Who are my top buyers?", "List all my buyers"],
            }]);
        } else {
            setMessages([{ id: Date.now(), text: "Welcome! To get started, please set up your company profile.", isBot: true }]);
        }

        initializedRef.current = true;
        setIsLoading(false);
    }, [userId, sellerDetails]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isBotTyping]);

    // Prevent duplicate consecutive user messages
    const preventConsecutiveDuplicate = (text: string) => {
        const last = messages[messages.length - 1];
        if (!last) return false;
        return !last.isBot && last.text.trim() === text.trim();
    };

    const sendMessage = async (text: string) => {
         const trimmedText = text.trim();
        if (!trimmedText) return;

        // Prevent duplicate user messages
        if (preventConsecutiveDuplicate(trimmedText)) return;

        if (!userId || !session) {
            toast({ title: "Profile Incomplete", description: "Please log in and set up your profile first.", variant: "destructive" });
            return;
        }

        const userMessage: Message = { id: Date.now(), text: trimmedText, isBot: false };
        setMessages((prev) => [...prev, userMessage]);
        setMessage("");
        setIsBotTyping(true);

        const requestPayload = {
            input_value: trimmedText,
            user_id: userId
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/voice_bot`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify(requestPayload),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
                } catch (jsonError) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
            }

            const data = await response.json();
            const botMessageText = data?.url ? `${data.message}\n${data.url}` : data?.message;

            if (botMessageText) {
                // prepare text for speech (clean)
                const textForSpeech = botMessageText
                    .replace(/\|/g, ', ')
                    .replace(/---/g, '')
                    .replace(/```[\s\S]*?```/g, '')
                    .replace(/`[^`]*`/g, '')
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/#/g, '')
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                    .replace(/\n+/g, ' ');

                const utterance = new SpeechSynthesisUtterance(textForSpeech);
                utterance.lang = "en-IN";
                window.speechSynthesis.speak(utterance);

                setMessages((prev) => [...prev, { id: Date.now() + 1, text: botMessageText, isBot: true }]);
            } else {
                 setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I'm sorry, I didn't get a response. Please try again.", isBot: true }]);
            }
        } catch (err: any) {
            const errorText = err instanceof Error ? err.message : "An unknown error occurred. Please check the console.";
            setMessages((prev) => [...prev, { id: Date.now(), text: `❌ ${errorText}`, isBot: true }]);
            toast({ title: "Error", description: errorText, variant: "destructive" });
        } finally {
            setIsBotTyping(false);
        }
    };

    const startListening = () => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) {
            toast({ title: "Compatibility Error", description: "Speech recognition is not supported in your browser.", variant: "destructive" });
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        setIsListening(true);

        recognition.onresult = (event: any) => {
            let interimTranscript = "";
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            transcriptBuffer.current = finalTranscript;
            setMessage(finalTranscript || interimTranscript);
        };

        recognition.onend = () => {
            setIsListening(false);
            const finalText = transcriptBuffer.current.trim();
            if (finalText) {
                sendMessage(finalText);
            }
        };

        recognition.start();
        setRecognitionInstance(recognition);
    };

    const stopListening = () => {
        recognitionInstance?.stop();
        setIsListening(false);
    };

    // deduplicate messages for UI (normalize whitespace & casing)
    const uniqueMessages = Array.from(
      new Map(messages.map((m) => {
          const key = (m.text || "").replace(/\s+/g, " ").trim().toLowerCase() + "|" + (m.isBot ? "bot" : "user");
          return [key, m];
      })).values()
    );

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
                                    <CardTitle className="text-lg">Vyapari Assistant</CardTitle>
                                </div>
                                <Button onClick={() => setIsOpen(false)} size="icon" variant="ghost" className="rounded-full"><X /></Button>
                            </CardHeader>

                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-3/4 rounded-lg" />
                                        <Skeleton className="h-12 w-1/2 rounded-lg ml-auto" />
                                    </div>
                                ) : (
                                    uniqueMessages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            className={`flex items-end gap-2 ${msg.isBot ? "justify-start" : "justify-end"}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {msg.isBot && <div className="bg-muted text-muted-foreground p-2 rounded-full self-start"><Bot className="w-5 h-5" /></div>}
                                            <div className={`p-3 rounded-2xl max-w-sm md:max-w-md whitespace-pre-wrap ${
                                                msg.isBot
                                                ? "bg-muted rounded-tl-none"
                                                : "bg-primary text-primary-foreground rounded-br-none"
                                            }`}>
                                                <FormattedMessage content={msg.text} />
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
                                        <Button
                                          type="submit"
                                          size="icon"
                                          className="rounded-full flex-shrink-0"
                                          disabled={isBotTyping}
                                        >
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