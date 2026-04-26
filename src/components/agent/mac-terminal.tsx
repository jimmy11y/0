'use client';

import { useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Copy, Trash2 } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';

export function MacTerminal() {
  const { terminalOpen, terminalContent, closeTerminal, clearTerminal } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalContent]);

  if (!terminalOpen) return null;

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(terminalContent.join('\n'));
  };

  return (
    <div className={`relative border-t ${isLight ? 'border-black/[0.06] bg-[#f0f0f0]' : 'border-white/[0.06] bg-[#1a1a1a]'}`} style={{ maxHeight: '180px' }}>
      {/* Traffic light buttons + title */}
      <div className={`flex items-center gap-2 px-3 py-1.5 ${isLight ? 'bg-[#e8e8e8]' : 'bg-[#252526]'}`}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={closeTerminal}
            className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all"
          />
          <button
            onClick={closeTerminal}
            className="h-2.5 w-2.5 rounded-full bg-[#febc2e] hover:brightness-110 transition-all"
          />
          <div className="h-2.5 w-2.5 rounded-full bg-[#28c840] opacity-50" />
        </div>
        <span className={`text-[10px] font-mono flex-1 text-center ${isLight ? 'text-black/30' : 'text-white/30'}`}>Terminal</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyAll}
            className={`rounded p-0.5 transition-colors ${isLight ? 'text-black/20 hover:text-black/50' : 'text-white/20 hover:text-white/50'}`}
            title="Copy all"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={clearTerminal}
            className={`rounded p-0.5 transition-colors ${isLight ? 'text-black/20 hover:text-black/50' : 'text-white/20 hover:text-white/50'}`}
            title="Clear"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="overflow-y-auto terminal-scrollbar px-3 py-2 font-mono text-[11px] leading-[18px] max-h-[140px]"
      >
        {terminalContent.map((line, i) => (
          <TerminalLine key={i} line={line} isLight={isLight} />
        ))}
      </div>
    </div>
  );
}

function TerminalLine({ line, isLight }: { line: string; isLight: boolean }) {
  if (line.startsWith('$')) {
    return <div className={isLight ? 'text-emerald-700/70' : 'text-emerald-400/70'}>{line}</div>;
  }
  if (line.startsWith('❌')) {
    return <div className={isLight ? 'text-red-700/70' : 'text-red-400/70'}>{line}</div>;
  }
  if (line.startsWith('✓')) {
    return <div className={isLight ? 'text-emerald-700/70' : 'text-emerald-400/70'}>{line}</div>;
  }
  if (line.startsWith('→')) {
    return <div className={isLight ? 'text-cyan-700/70' : 'text-cyan-400/70'}>{line}</div>;
  }
  if (line.startsWith('⚠')) {
    return <div className={isLight ? 'text-amber-700/70' : 'text-amber-400/70'}>{line}</div>;
  }
  if (line.startsWith('⟫')) {
    return <div className={isLight ? 'text-orange-700/70' : 'text-orange-400/70'}>{line}</div>;
  }
  return <div className={isLight ? 'text-black/50' : 'text-white/50'}>{line}</div>;
}
