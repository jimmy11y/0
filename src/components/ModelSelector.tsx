import { useAppStore } from '@/store/useAppStore';
import { X, Server, DollarSign, Brain, Eye } from 'lucide-react';
import type { AIModel } from '@/types';

interface ModelSelectorProps {
  onClose: () => void;
}

export default function ModelSelector({ onClose }: ModelSelectorProps) {
  const { models, selectedModel, setSelectedModel, theme } = useAppStore();
  const isDark = theme === 'dark';

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Dropdown - fixed scrollable */}
      <div className={`absolute top-14 left-0 right-0 z-50 border-b shadow-2xl ${
        isDark
          ? 'bg-[#111111] border-white/[0.08]'
          : 'bg-[#f7f4ef] border-[#d4cfc8]'
      }`}>
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm tracking-wide ${isDark ? 'text-white/70' : 'text-[#1a1a1a]/60'}`}>
              Select Model
            </h3>
            <button
              onClick={onClose}
              className={`p-1 transition-colors ${isDark ? 'text-white/30 hover:text-white/60' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ✅ Fixed: max-height + overflow-y-auto for scrollable model list */}
          <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={model.id === selectedModel}
                onSelect={() => handleSelect(model.id)}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ModelCard({
  model,
  isSelected,
  onSelect,
  isDark,
}: {
  model: AIModel;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 border transition-all duration-200 ${
        isSelected
          ? isDark
            ? 'border-white/20 bg-white/[0.06]'
            : 'border-[#1a1a1a]/25 bg-[#1a1a1a]/[0.06]'
          : isDark
          ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]'
          : 'border-[#1a1a1a]/[0.08] bg-white/30 hover:bg-white/60 hover:border-[#1a1a1a]/15'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className={`text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-[#1a1a1a]/80'}`}>
            {model.name}
          </h4>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 border flex items-center justify-center text-[9px] font-bold ${
              isDark ? 'border-white/20 text-white/50' : 'border-[#1a1a1a]/20 text-[#1a1a1a]/50'
            }`}>
              {model.providerLogo}
            </div>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-[#1a1a1a]/40'}`}>
              {model.provider}
            </span>
          </div>
        </div>
        {isSelected && (
          <div className={`w-2 h-2 ${isDark ? 'bg-white/60' : 'bg-[#1a1a1a]/60'}`} />
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {model.capabilities.map((cap) => (
          <span
            key={cap}
            className={`px-2 py-0.5 border text-[10px] tracking-wider ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.06] text-white/40'
                : 'bg-[#1a1a1a]/[0.04] border-[#1a1a1a]/[0.08] text-[#1a1a1a]/40'
            }`}
          >
            {cap}
          </span>
        ))}
      </div>

      <div className={`flex items-center gap-4 text-[10px] ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/35'}`}>
        {model.paramCount && (
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {model.paramCount}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Server className="w-3 h-3" />
          {model.serverless ? 'Serverless' : 'Dedicated'}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          ${model.inputPrice.toFixed(2)} / ${model.outputPrice.toFixed(2)}
        </span>
        {model.supportsVision && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Vision
          </span>
        )}
      </div>
    </button>
  );
}
