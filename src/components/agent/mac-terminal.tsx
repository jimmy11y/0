'use client';

import { useRef, useEffect, useState } from 'react';
import { useAgentStore } from '@/lib/agent-store';
import { X, Minus, Copy, Check, Trash2, Terminal } from 'lucide-react';

export function MacTerminal() {
  const { terminalOpen, terminalContent, closeTerminal, clearTerminal } = useAgentStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalContent]);

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(terminalContent.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!terminalOpen) return null;

  return (
    <div className="absolute bottom-16 sm:bottom-20 left-2 right-2 sm:left-4 sm:right-4 z-50 md:left-auto md:right-4 md:w-[680px]">
      <div
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="overflow-hidden rounded-xl border border-white/10 shadow-2xl transition-all duration-200"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {/* Title bar - Mac style */}
        <div className="flex items-center border-b border-white/[0.06] px-3 py-2 select-none">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={closeTerminal}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f56] transition-all hover:brightness-110 active:brightness-90"
              title="Close"
            >
              <X className={`h-[6px] w-[6px] text-black/60 transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-[#ffbd2e] transition-all hover:brightness-110 active:brightness-90"
              title="Minimize"
            >
              <Minus className={`h-[6px] w-[6px] text-black/60 transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
            </button>
            <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>

          {/* Title */}
          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-white/40 flex items-center justify-center gap-1.5">
              <Terminal className="h-3 w-3" />
              Terminal
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyAll}
              className="rounded p-1 text-white/15 transition-colors hover:bg-white/10 hover:text-white/40"
              title="Copy all"
            >
              {copied ? <Check className="h-3 w-3 text-green-400/60" /> : <Copy className="h-3 w-3" />}
            </button>
            <button
              onClick={clearTerminal}
              className="rounded p-1 text-white/15 transition-colors hover:bg-white/10 hover:text-white/40"
              title="Clear"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Terminal content - collapsible when minimized */}
        {!isMinimized && (
          <div className="h-64 overflow-y-auto terminal-scrollbar p-3 font-mono text-xs leading-5">
            {terminalContent.length === 0 ? (
              <div className="flex items-center gap-2 text-white/15">
                <span className="text-emerald-400/40">$</span>
                <span>Waiting for agent actions...</span>
              </div>
            ) : (
              terminalContent.map((line, i) => (
                <TerminalLine key={i} line={line} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalLine({ line }: { line: string }) {
  if (line.startsWith('$')) {
    return (
      <div className="whitespace-pre-wrap break-all">
        <span className="text-emerald-400/50">$ </span>
        <span className="text-white/50">{line.slice(1).trim()}</span>
      </div>
    );
  }
  if (line.startsWith('❌') || line.startsWith('ERROR:')) {
    return <div className="text-red-400/60 whitespace-pre-wrap break-all">{line}</div>;
  }
  if (line.startsWith('✓') || line.startsWith('✔') || line.startsWith('SUCCESS:')) {
    return <div className="text-emerald-400/60 whitespace-pre-wrap break-all">{line}</div>;
  }
  if (line.startsWith('→') || line.startsWith('⟩')) {
    return <div className="text-cyan-400/50 whitespace-pre-wrap break-all">{line}</div>;
  }
  if (line.startsWith('⚠') || line.startsWith('WARN:')) {
    return <div className="text-amber-400/60 whitespace-pre-wrap break-all">{line}</div>;
  }
  if (line.startsWith('⟫')) {
    return <div className="text-orange-400/50 whitespace-pre-wrap break-all">{line}</div>;
  }
  return <div className="text-white/35 whitespace-pre-wrap break-all">{line}</div>;
}
