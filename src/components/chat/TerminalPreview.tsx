import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Eye, X, Maximize2, Minimize2, Play } from 'lucide-react';

interface TerminalPreviewProps {
  code?: string;
  language?: string;
  isActive?: boolean;
  onClose?: () => void;
  theme?: 'dark' | 'light';
}

export default function TerminalPreview({ code, language, isActive = false, onClose, theme = 'dark' }: TerminalPreviewProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const [expanded, setExpanded] = useState(false);
  const isDark = theme === 'dark';

  if (!isActive) return null;

  const terminalLines = code?.split('\n') || ['$ Waiting for code execution...'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`rounded-xl border overflow-hidden mb-4 shadow-2xl ${
          expanded ? 'fixed inset-4 z-[100]' : ''
        } ${isDark ? 'border-white/[0.08] bg-[#0a0a14]' : 'border-[#1a1a1a]/10 bg-white'}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
          isDark ? 'bg-[#11111a] border-white/[0.06]' : 'bg-gray-50 border-[#1a1a1a]/8'
        }`}>
          <div className="flex items-center gap-1">
            {/* Tab: Terminal */}
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                activeTab === 'terminal'
                  ? isDark ? 'bg-white/[0.08] text-white/80' : 'bg-[#1a1a1a]/[0.08] text-[#1a1a1a]/80'
                  : isDark ? 'text-white/30 hover:text-white/50' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal
            </button>
            {/* Tab: Preview */}
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                activeTab === 'preview'
                  ? isDark ? 'bg-white/[0.08] text-white/80' : 'bg-[#1a1a1a]/[0.08] text-[#1a1a1a]/80'
                  : isDark ? 'text-white/30 hover:text-white/50' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/50'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/[0.06]'}`}
            >
              {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/[0.06]'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`${expanded ? 'h-[calc(100%-48px)]' : 'h-[280px]'}`}>
          {activeTab === 'terminal' ? (
            <div className={`h-full overflow-auto p-4 font-mono text-xs ${isDark ? 'bg-[#0a0a14]' : 'bg-[#fafafa]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className={`text-[10px] ${isDark ? 'text-white/20' : 'text-[#1a1a1a]/25'}`}>bash — {language || 'sh'}</span>
              </div>
              <div className={`space-y-1 ${isDark ? 'text-white/60' : 'text-[#1a1a1a]/70'}`}>
                {terminalLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-2"
                  >
                    <span className={`select-none ${isDark ? 'text-green-400/50' : 'text-green-600/50'}`}>$</span>
                    <span>{line}</span>
                  </motion.div>
                ))}
                <motion.div
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className={`inline-block w-2 h-4 ${isDark ? 'bg-white/40' : 'bg-[#1a1a1a]/40'}`}
                />
              </div>
            </div>
          ) : (
            <div className={`h-full overflow-auto p-4 ${isDark ? 'bg-[#0a0a14]' : 'bg-[#fafafa]'}`}>
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.05]' : 'bg-[#1a1a1a]/[0.05]'}`}>
                  <Play className={`w-5 h-5 ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/30'}`} />
                </div>
                <p className={`text-xs ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/40'}`}>
                  Preview will appear here after code execution
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
