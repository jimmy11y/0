import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';

interface ThinkingProcessProps {
  reasoning: string;
  thinkingTime?: number;
  isStreaming?: boolean;
  theme?: 'dark' | 'light';
}

export default function ThinkingProcess({ reasoning, thinkingTime, isStreaming = false, theme = 'dark' }: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';

  return (
    <div className={`mb-4 rounded-xl border overflow-hidden ${isDark ? 'border-amber-500/15 bg-amber-500/[0.02]' : 'border-amber-500/20 bg-amber-500/[0.03]'}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
          isDark ? 'hover:bg-amber-500/[0.04]' : 'hover:bg-amber-500/[0.06]'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Animated Brain Icon */}
          <div className="relative">
            <motion.div
              animate={isStreaming ? {
                scale: [1, 1.15, 1],
                opacity: [0.6, 1, 0.6],
              } : {}}
              transition={isStreaming ? {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              } : {}}
            >
              <Brain className={`w-4 h-4 ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`} />
            </motion.div>
            {isStreaming && (
              <motion.div
                className={`absolute inset-0 rounded-full ${isDark ? 'bg-amber-400/20' : 'bg-amber-600/20'}`}
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium tracking-wide ${isDark ? 'text-amber-400/80' : 'text-amber-600/80'}`}>
              {isStreaming ? 'Thinking...' : 'Thinking Process'}
            </span>
            {isStreaming && (
              <motion.div
                className={`flex gap-0.5 ${isDark ? 'text-amber-400/50' : 'text-amber-600/50'}`}
              >
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="text-xs">.</motion.span>
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="text-xs">.</motion.span>
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="text-xs">.</motion.span>
              </motion.div>
            )}
          </div>

          {thinkingTime && !isStreaming && (
            <span className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-white/25' : 'text-[#1a1a1a]/30'}`}>
              <Clock className="w-3 h-3" />
              {(thinkingTime / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        
        {!isStreaming && (
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3 h-3 ${isDark ? 'text-amber-400/40' : 'text-amber-600/40'}`} />
            {expanded ? (
              <ChevronUp className={`w-3.5 h-3.5 ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/30'}`} />
            ) : (
              <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/30'}`} />
            )}
          </div>
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-3 pt-1 ${isDark ? 'border-t border-amber-500/10' : 'border-t border-amber-500/15'}`}>
              <pre className={`whitespace-pre-wrap font-mono text-[11px] leading-relaxed ${isDark ? 'text-white/35' : 'text-[#1a1a1a]/40'}`}>
                {reasoning}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
