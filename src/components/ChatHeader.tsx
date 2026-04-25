import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import {
  PanelLeft,
  Bot,
  Square,
  Settings,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';
import ModelSelector from './ModelSelector';
import SettingsModal from './SettingsModal';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onOpenAgentPopup: () => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
}

export default function ChatHeader({
  onToggleSidebar,
  onOpenAgentPopup,
  isGenerating,
  onStopGeneration,
}: ChatHeaderProps) {
  const { sidebarOpen, selectedAgent, agents, selectedModel, models, theme, toggleTheme } = useAppStore();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isDark = theme === 'dark';

  const currentAgent = agents.find((a) => a.id === selectedAgent);
  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <div className={`relative border-b ${isDark ? 'border-white/[0.06]' : 'border-[#d4cfc8]'}`}>
      <div className={`h-14 flex items-center justify-between px-4 flex-shrink-0 ${
        isDark ? 'bg-[#0a0a0a]' : 'bg-[#f0ede8]'
      }`}>
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/[0.06]'}`}
              onClick={onToggleSidebar}
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          )}

          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${
              isDark
                ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]'
                : 'bg-[#1a1a1a]/[0.04] hover:bg-[#1a1a1a]/[0.08] border-[#1a1a1a]/[0.10]'
            }`}
          >
            <span className={`text-xs tracking-wide ${isDark ? 'text-white/60' : 'text-[#1a1a1a]/60'}`}>
              {currentModel?.name || 'Select Model'}
            </span>
            <ChevronDown className={`w-3 h-3 ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/30'}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={`h-8 w-8 ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/[0.06]'}`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Agent Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAgentPopup}
            className={`h-8 text-xs tracking-wide gap-2 ${isDark ? 'text-white/40 hover:text-white hover:bg-white/[0.06]' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/[0.06]'}`}
          >
            <Bot className="w-3.5 h-3.5" />
            {currentAgent ? currentAgent.name : 'Agent'}
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className={`h-8 w-8 ${isDark ? 'text-white/30 hover:text-white hover:bg-white/[0.06]' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/[0.06]'}`}
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Stop Button */}
          {isGenerating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStopGeneration}
              className="h-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs tracking-wide gap-2"
            >
              <Square className="w-3 h-3" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {showModelSelector && (
        <ModelSelector onClose={() => setShowModelSelector(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
