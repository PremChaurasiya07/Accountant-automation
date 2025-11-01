// "use client"

// import { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';

// // A list of engaging messages to display while loading
// const loadingMessages = [
//   "Authenticating your session...",
//   "Connecting to your dashboard...",
//   "Preparing your workspace...",
//   "Almost there..."
// ];

// export function AuthLoadingScreen() {
//   const [messageIndex, setMessageIndex] = useState(0);

//   useEffect(() => {
//     // Set up an interval to cycle through messages every 2.5 seconds
//     const interval = setInterval(() => {
//       setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
//     }, 2500);

//     // Clean up the interval when the component unmounts
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 text-white">
//       {/* Animated pulsing circles */}
//       <div className="relative h-24 w-24">
//         <motion.div
//           className="absolute inset-0 rounded-full border-2 border-blue-500"
//           animate={{
//             scale: [1, 1.5, 1],
//             opacity: [0.5, 1, 0.5],
//           }}
//           transition={{
//             duration: 2.5,
//             ease: "easeInOut",
//             repeat: Infinity,
//           }}
//         />
//         <motion.div
//           className="absolute inset-0 rounded-full border-2 border-blue-400"
//           animate={{
//             scale: [1.5, 1, 1.5],
//             opacity: [1, 0.5, 1],
//           }}
//           transition={{
//             duration: 2.5,
//             ease: "easeInOut",
//             repeat: Infinity,
//             delay: 0.5,
//           }}
//         />
//         <div className="absolute inset-0 flex items-center justify-center">
//           <svg className="h-10 w-10 text-blue-300 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//           </svg>
//         </div>
//       </div>

//       {/* Cycling text with fade transition */}
//       <div className="mt-8 text-center">
//         <AnimatePresence mode="wait">
//           <motion.p
//             key={messageIndex}
//             initial={{ opacity: 0, y: 10 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -10 }}
//             transition={{ duration: 0.5 }}
//             className="text-lg text-gray-300"
//           >
//             {loadingMessages[messageIndex]}
//           </motion.p>
//         </AnimatePresence>
//       </div>
//     </div>
//   );
// }


"use client"

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Shield, CheckCircle2 } from 'lucide-react';

// Enhanced loading messages with icons
const loadingMessages = [
  { text: "Authenticating your session...", icon: Shield },
  { text: "Connecting to your dashboard...", icon: Zap },
  { text: "Preparing your workspace...", icon: Sparkles },
  { text: "Almost there...", icon: CheckCircle2 }
];

export function AuthLoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000);

    // Smooth progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 15;
      });
    }, 300);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const currentMessage = loadingMessages[messageIndex];
  const IconComponent = currentMessage.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        {/* Animated loader */}
        <div className="relative">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0 w-32 h-32 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, #3b82f6 50%, transparent 100%)',
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Middle pulsing ring */}
          <motion.div
            className="absolute inset-2 w-28 h-28 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-xl"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Inner circle with icon */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/50"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(59, 130, 246, 0.5)',
                  '0 0 40px rgba(59, 130, 246, 0.8)',
                  '0 0 20px rgba(59, 130, 246, 0.5)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                >
                  <IconComponent className="w-10 h-10 text-white" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Orbiting dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.4,
              }}
            >
              <motion.div
                className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 shadow-lg"
                style={{
                  transform: `translateX(${50 + i * 5}px)`,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Loading text with icon */}
        <div className="text-center space-y-4 min-h-[60px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={messageIndex}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
              className="flex items-center gap-3"
            >
              <p className="text-xl font-medium text-white/90">
                {currentMessage.text}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${progress}%`,
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ 
                width: { duration: 0.5, ease: "easeOut" },
                backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" }
              }}
              style={{
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          {/* Progress percentage */}
          <motion.p
            className="text-sm text-white/60 font-medium tabular-nums"
            key={Math.floor(progress)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {Math.floor(progress)}%
          </motion.p>
        </div>

        {/* Decorative particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/40 rounded-full"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom branding/text */}
      <motion.div
        className="absolute bottom-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-white/40 font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Powered by Vyapari
        </p>
      </motion.div>
    </div>
  );
}