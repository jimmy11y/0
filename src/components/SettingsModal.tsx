import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Eye, EyeOff, Save, Settings, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { apiKey, setApiKey, streamResponse, setStreamResponse, showThinking, setShowThinking, theme } = useAppStore();
  const [localKey, setLocalKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const isDark = theme === 'dark';

  const handleSave = () => {
    setApiKey(localKey.trim());
    onClose();
  };

  const Toggle = ({ value, onToggle, icon: Icon, label, description }: { value: boolean; onToggle: () => void; icon: any; label: string; description: string }) => (
    <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-[#1a1a1a]/[0.02]'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-[#1a1a1a]/[0.06]'}`}>
          <Icon className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-[#1a1a1a]/40'}`} />
        </div>
        <div>
          <span className={`text-sm block ${isDark ? 'text-white/60' : 'text-[#1a1a1a]/60'}`}>{label}</span>
          <span className={`text-[10px] ${isDark ? 'text-white/25' : 'text-[#1a1a1a]/30'}`}>{description}</span>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 relative rounded-full transition-colors duration-200 ${value
          ? isDark ? 'bg-white/30' : 'bg-[#1a1a1a]/30'
          : isDark ? 'bg-white/10' : 'bg-[#1a1a1a]/15'
        }`}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`absolute top-1 w-4 h-4 rounded-full ${isDark ? 'bg-white' : 'bg-white shadow-sm'}`}
        />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111118] border-white/[0.08]' : 'bg-[#faf8f4] border-[#d4cfc8]'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/[0.06]' : 'border-[#d4cfc8]/60'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-[#1a1a1a]/[0.06]'}`}>
                <Settings className={`w-4.5 h-4.5 ${isDark ? 'text-white/50' : 'text-[#1a1a1a]/50'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-medium tracking-wide ${isDark ? 'text-white/80' : 'text-[#1a1a1a]/80'}`}>Settings</h3>
                <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/35'}`}>Configure your AI interface</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/[0.06]'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* API Key */}
            <div className="space-y-3">
              <label className={`text-xs font-medium tracking-wider uppercase ${isDark ? 'text-white/50' : 'text-[#1a1a1a]/50'}`}>
                Together AI API Key
              </label>
              <div className="relative">
                <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/20' : 'text-[#1a1a1a]/25'}`} />
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="Enter your API key..."
                  className={`h-11 pl-10 pr-10 rounded-xl text-sm focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
                    isDark
                      ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/30'
                      : 'bg-white/60 border-[#1a1a1a]/15 text-[#1a1a1a] placeholder:text-[#1a1a1a]/25 focus:border-[#1a1a1a]/30'
                  }`}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-white/20 hover:text-white/40' : 'text-[#1a1a1a]/25 hover:text-[#1a1a1a]/50'}`}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-[10px] ${isDark ? 'text-white/20' : 'text-[#1a1a1a]/30'}`}>
                Get your key from{' '}
                <a href="https://api.together.xyz" target="_blank" rel="noopener noreferrer"
                  className={`underline transition-colors ${isDark ? 'text-white/40 hover:text-white/60' : 'text-[#1a1a1a]/50 hover:text-[#1a1a1a]/70'}`}>
                  api.together.xyz
                </a>
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className={`text-xs font-medium tracking-wider uppercase block ${isDark ? 'text-white/50' : 'text-[#1a1a1a]/50'}`}>
                Preferences
              </label>
              <Toggle
                value={streamResponse}
                onToggle={() => setStreamResponse(!streamResponse)}
                icon={Zap}
                label="Stream Responses"
                description="Receive responses in real-time"
              />
              <Toggle
                value={showThinking}
                onToggle={() => setShowThinking(!showThinking)}
                icon={Brain}
                label="Show Thinking Process"
                description="Display AI reasoning steps"
              />
            </div>

            {/* Save */}
            <Button
              onClick={handleSave}
              className={`w-full h-11 rounded-xl text-sm tracking-wide font-medium transition-all duration-200 ${
                isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/90'
              }`}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
