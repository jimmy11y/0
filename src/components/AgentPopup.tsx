import { useAppStore } from '@/store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Thermometer, Coins, Sparkles } from 'lucide-react';

interface AgentPopupProps {
  onClose: () => void;
}

export default function AgentPopup({ onClose }: AgentPopupProps) {
  const { agents, selectedAgent, setSelectedAgent, setSelectedModel, models, theme } = useAppStore();
  const isDark = theme === 'dark';

  const handleSelectAgent = (agentId: string | null) => {
    setSelectedAgent(agentId);
    if (agentId) {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) setSelectedModel(agent.model);
    }
    onClose();
  };

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
          className={`w-full max-w-lg mx-4 rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111118] border-white/[0.08]' : 'bg-[#faf8f4] border-[#d4cfc8]'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/[0.06]' : 'border-[#d4cfc8]/60'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-[#1a1a1a]/[0.06]'}`}>
                <Bot className={`w-4.5 h-4.5 ${isDark ? 'text-white/50' : 'text-[#1a1a1a]/50'}`} />
              </div>
              <div>
                <h3 className={`text-sm font-medium tracking-wide ${isDark ? 'text-white/80' : 'text-[#1a1a1a]/80'}`}>Select Agent</h3>
                <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/35'}`}>Choose an AI agent for your task</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/[0.06]'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {/* No Agent */}
            <button
              onClick={() => handleSelectAgent(null)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                selectedAgent === null
                  ? isDark ? 'border-white/20 bg-white/[0.06] shadow-lg shadow-white/[0.02]' : 'border-[#1a1a1a]/20 bg-[#1a1a1a]/[0.06] shadow-lg shadow-[#1a1a1a]/[0.02]'
                  : isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]' : 'border-[#1a1a1a]/[0.08] bg-white/40 hover:bg-white/70 hover:border-[#1a1a1a]/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isDark ? 'bg-white/10 text-white/60' : 'bg-[#1a1a1a]/10 text-[#1a1a1a]/60'
                }`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-[#1a1a1a]/70'}`}>Default Assistant</h4>
                  <p className={`text-xs ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/35'}`}>Use current model settings without specialization</p>
                </div>
              </div>
            </button>

            {agents.map((agent) => {
              const agentModel = models.find((m) => m.id === agent.model);
              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedAgent === agent.id
                      ? isDark ? 'border-white/20 bg-white/[0.06] shadow-lg shadow-white/[0.02]' : 'border-[#1a1a1a]/20 bg-[#1a1a1a]/[0.06] shadow-lg shadow-[#1a1a1a]/[0.02]'
                      : isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]' : 'border-[#1a1a1a]/[0.08] bg-white/40 hover:bg-white/70 hover:border-[#1a1a1a]/15'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      isDark ? 'bg-gradient-to-br from-white to-white/80 text-black' : 'bg-gradient-to-br from-[#1a1a1a] to-[#1a1a1a]/80 text-white'
                    }`}>
                      {agent.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-[#1a1a1a]/70'}`}>{agent.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.06] text-white/40' : 'bg-[#1a1a1a]/[0.06] text-[#1a1a1a]/40'}`}>
                          {agentModel?.name}
                        </span>
                      </div>
                      <p className={`text-xs mb-2.5 ${isDark ? 'text-white/35' : 'text-[#1a1a1a]/40'}`}>
                        {agent.description}
                      </p>
                      <div className={`flex items-center gap-4 text-[10px] ${isDark ? 'text-white/25' : 'text-[#1a1a1a]/30'}`}>
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3" />
                          {agent.temperature}
                        </span>
                        {agent.maxTokens && (
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {agent.maxTokens.toLocaleString()} tokens
                          </span>
                        )}
                        {agentModel && (
                          <span>${agentModel.inputPrice.toFixed(2)}/M in</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
