'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import type { ModelType } from '@/types/agent';
import { MODEL_CONFIG } from '@/types/agent';

export function ModelSelector() {
  const { model, setModel } = useAgentStore();
  const [open, setOpen] = useState(false);

  const models: ModelType[] = ['deepseek-v4-pro', 'glm-5.1', 'kimi-k2.6', 'minimax-m2.7'];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <span className="truncate max-w-[100px] sm:max-w-[120px]">{MODEL_CONFIG[model].name}</span>
        <ChevronDown className={`h-3 w-3 transition-transform text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-[calc(100vw-32px)] sm:w-auto sm:min-w-[280px] rounded-xl border border-white/10 p-1.5 shadow-2xl" style={{ backgroundColor: 'hsl(30, 3.3%, 11.8%)' }}>
            {models.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModel(m);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 sm:gap-3 rounded-lg px-2.5 sm:px-3 py-2 sm:py-2.5 text-left transition-colors hover:bg-white/10"
              >
                <div className="flex h-5 w-5 items-center justify-center shrink-0">
                  {model === m ? (
                    <Check className="h-3.5 w-3.5 text-orange-400" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-white/15" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90">{MODEL_CONFIG[m].name}</div>
                  <div className="text-[11px] text-white/40 truncate">{MODEL_CONFIG[m].description}</div>
                </div>
                <span className="text-[10px] text-white/20 shrink-0 hidden sm:inline">{MODEL_CONFIG[m].provider}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
