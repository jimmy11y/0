'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronRight, Loader2, Copy, Check } from 'lucide-react';
import { MessageActions } from './message-actions';
import type { ChatMessage, ContentBlock, ToolUseBlock, ToolResultBlock, ThinkingBlock } from '@/types/agent';
import { TOOL_DISPLAY, MODEL_CONFIG } from '@/types/agent';
import { useState, useEffect } from 'react';

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
  onEdit?: () => void;
}

export function MessageItem({ message, onRetry, onEdit }: MessageItemProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="group flex justify-end px-2 sm:px-4 py-2 sm:py-3"
      >
        <div className="max-w-[85%] sm:max-w-[80%]">
          <div className="rounded-2xl rounded-tr-sm bg-white/[0.07] px-4 py-2.5">
            {renderUserContent(message.content)}
          </div>
          <div className="mt-1.5 flex justify-end">
            <MessageActions
              content={message.content}
              role={message.role}
              onEdit={onEdit}
              onRetry={onRetry}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group px-2 sm:px-4 py-3 sm:py-4"
    >
      <div className="min-w-0">
        {message.model && !isUser && (
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/30">
              {MODEL_CONFIG[message.model]?.name || message.model}
            </span>
          </div>
        )}

        {message.blocks && message.blocks.length > 0 && (
          <ZaiStyleBlocks blocks={message.blocks} isStreaming={message.isStreaming} />
        )}

        {(!message.blocks || message.blocks.length === 0) && message.content && (
          <div className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap break-words">
            {message.content}
            {message.isStreaming && <StreamingCursor />}
          </div>
        )}

        {message.isStreaming && (!message.blocks || message.blocks.length === 0) && !message.content && (
          <ThinkingIndicator />
        )}

        {message.isError && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
            <span>Failed to generate response.</span>
            {onRetry && (
              <button onClick={onRetry} className="text-red-400 underline underline-offset-2 hover:text-red-300">
                Retry
              </button>
            )}
          </div>
        )}

        {!message.isStreaming && message.content && !message.isError && (
          <div className="mt-2">
            <MessageActions
              content={message.content}
              role={message.role}
              onRetry={onRetry}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function renderUserContent(content: string) {
  return (
    <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap break-words">
      {content}
    </p>
  );
}

// ============================================
// Z.ai Style Grouped Blocks
// ============================================
function ZaiStyleBlocks({ blocks, isStreaming }: { blocks: ContentBlock[]; isStreaming?: boolean }) {
  const groups: Array<{ type: 'thinking-group' | 'text'; blocks: ContentBlock[] }> = [];
  let currentGroup: ContentBlock[] = [];
  let currentGroupType: 'thinking' | 'text' = 'thinking';

  for (const block of blocks) {
    const isTextBlock = block.type === 'text';
    if (isTextBlock) {
      if (currentGroup.length > 0 && currentGroupType === 'thinking') {
        groups.push({ type: 'thinking-group', blocks: [...currentGroup] });
        currentGroup = [];
      }
      currentGroupType = 'text';
      currentGroup.push(block);
    } else {
      if (currentGroup.length > 0 && currentGroupType === 'text') {
        groups.push({ type: 'text', blocks: [...currentGroup] });
        currentGroup = [];
      }
      currentGroupType = 'thinking';
      currentGroup.push(block);
    }
  }
  if (currentGroup.length > 0) {
    groups.push({
      type: currentGroupType === 'text' ? 'text' : 'thinking-group',
      blocks: [...currentGroup]
    });
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        if (group.type === 'text') {
          return (
            <div key={`text-g-${gi}`}>
              {group.blocks.map((block, bi) => (
                <TextBlockComponent key={`t-${gi}-${bi}`} block={block as ContentBlock & { type: 'text' }} />
              ))}
            </div>
          );
        }
        return <ThinkingGroupBlock key={`tg-${gi}`} blocks={group.blocks} isStreaming={isStreaming} />;
      })}
    </div>
  );
}

// ============================================
// Thinking Group with pulsing wave animations
// ============================================
function ThinkingGroupBlock({ blocks, isStreaming }: { blocks: ContentBlock[]; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const anyStreaming = blocks.some(b => 'isStreaming' in b && b.isStreaming);

  useEffect(() => {
    if (anyStreaming) setExpanded(true);
  }, [anyStreaming]);

  const totalDuration = blocks.reduce((sum, b) => {
    if ('duration' in b && typeof b.duration === 'number') return sum + b.duration;
    return sum;
  }, 0);

  const toolBlocks = blocks.filter(b => b.type === 'tool_use') as ToolUseBlock[];
  const completedTools = toolBlocks.filter(b => b.status === 'completed');
  const runningTool = toolBlocks.find(b => b.status !== 'completed');
  const runningToolDisplay = runningTool
    ? (TOOL_DISPLAY[runningTool.name] || { label: runningTool.name })
    : null;

  const summaryText = anyStreaming
    ? runningToolDisplay
      ? runningToolDisplay.label + '...'
      : 'Thinking...'
    : totalDuration > 0
      ? `Thought for ${formatDuration(totalDuration)}`
      : 'Thoughts';

  return (
    <div className="relative">
      {/* Header - brain icon with pulse wave animation */}
      <button
        onClick={() => !anyStreaming && setExpanded(!expanded)}
        className={`flex items-center gap-2.5 py-1.5 text-left transition-colors ${
          anyStreaming ? 'cursor-default' : 'group/btn cursor-pointer'
        }`}
      >
        {anyStreaming ? (
          <div className="relative">
            <Brain className="h-5 w-5 text-orange-400 animate-brain-pulse shrink-0" />
            <div className="absolute inset-0 rounded-full animate-ripple" />
          </div>
        ) : (
          <Brain className="h-5 w-5 text-orange-400/50 shrink-0 group-hover/btn:text-orange-400/70 transition-colors" />
        )}
        <span className={`text-xs font-medium transition-colors ${
          anyStreaming ? 'text-white/50' : 'text-white/40 group-hover/btn:text-white/60'
        }`}>
          {summaryText}
        </span>
        {!anyStreaming && (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-white/25 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-white/25 shrink-0" />
          )
        )}
        {toolBlocks.length > 0 && !anyStreaming && (
          <span className="text-[10px] text-white/20 ml-1">
            {completedTools.length}/{toolBlocks.length} tools
          </span>
        )}
      </button>

      {/* Live Task Steps - with wave pulse animation */}
      {anyStreaming && (
        <div className="ml-7 mt-1 space-y-1.5">
          {toolBlocks.map((tool, i) => (
            <div
              key={`step-${i}`}
              className="animate-step-in flex items-center gap-2"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {tool.status === 'completed' ? (
                <CheckIcon className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
              ) : (
                <div className="relative shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400/70" />
                  <div className="absolute inset-0 rounded-full animate-ripple" />
                </div>
              )}
              <span className={`text-[11px] font-medium ${
                tool.status === 'completed' ? 'text-white/25' : 'text-orange-400/70 animate-pulse-wave'
              }`}>
                {TOOL_DISPLAY[tool.name]?.label || tool.name}
              </span>
              <span className="truncate text-[10px] text-white/15 font-mono max-w-[120px] sm:max-w-[200px]">
                {formatToolInputPreview(tool.input)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expandable detail content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-7 border-l border-white/[0.06] pl-3 py-2 space-y-2">
              {blocks.map((block, index) => {
                switch (block.type) {
                  case 'thinking':
                    return <InlineThinkingContent key={`it-${index}`} block={block} />;
                  case 'tool_use':
                    return <InlineToolAction key={`tu-${index}`} block={block} />;
                  case 'tool_result':
                    return <InlineToolOutput key={`tr-${index}`} block={block} />;
                  default:
                    return null;
                }
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Thinking Indicator with brain pulse
// ============================================
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="relative">
        <Brain className="h-5 w-5 text-orange-400 animate-brain-pulse" />
        <div className="absolute inset-0 rounded-full animate-ripple" />
      </div>
      <span className="text-xs font-medium text-orange-400/70 animate-pulse-wave">Thinking...</span>
    </div>
  );
}

// ============================================
// Inline Thinking Content
// ============================================
function InlineThinkingContent({ block }: { block: ThinkingBlock }) {
  return (
    <div className="py-0.5">
      <p className="text-xs leading-relaxed text-white/20 italic whitespace-pre-wrap break-words">
        {block.content}
        {block.isStreaming && (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-orange-400/40 rounded-full align-middle" />
        )}
      </p>
    </div>
  );
}

// ============================================
// Inline Tool Action with pulse
// ============================================
function InlineToolAction({ block }: { block: ToolUseBlock }) {
  const [expanded, setExpanded] = useState(false);
  const toolDisplay = TOOL_DISPLAY[block.name] || { label: block.name, icon: '🔧', color: 'text-white/40' };
  const isRunning = block.status !== 'completed';
  const inputEntries = Object.entries(block.input);

  return (
    <div className="py-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left group/tool"
      >
        {isRunning ? (
          <div className="relative shrink-0">
            <Loader2 className="h-3 w-3 animate-spin text-orange-400/50" />
            <div className="absolute inset-0 rounded-full animate-ripple" />
          </div>
        ) : (
          <CheckIcon className="h-3 w-3 text-emerald-400/50 shrink-0" />
        )}
        <span className={`text-xs font-medium ${toolDisplay.color} ${isRunning ? 'opacity-70 animate-pulse-wave' : 'opacity-50'}`}>
          {toolDisplay.label}
        </span>
        <span className="flex-1 truncate text-[11px] text-white/20 font-mono">
          {formatToolInputPreview(block.input)}
        </span>
        {block.duration && !isRunning && (
          <span className="text-[10px] text-white/15 shrink-0">{block.duration}ms</span>
        )}
        <ChevronRight className={`h-2.5 w-2.5 text-white/15 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 rounded-md border border-white/5 bg-white/[0.015] p-2.5">
              {inputEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2 py-0.5">
                  <span className="text-[11px] text-white/20 shrink-0 font-mono">{key}:</span>
                  <span className="text-[11px] text-white/35 font-mono break-all">
                    {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Inline Tool Output
// ============================================
function InlineToolOutput({ block }: { block: ToolResultBlock }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = block.content.split('\n');
  const isLong = lines.length > 4;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-md border overflow-hidden ${block.isError ? 'border-red-500/10' : 'border-white/[0.04]'} bg-white/[0.01]`}>
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-white/20 hover:text-white/35 transition-colors"
        >
          <ChevronRight className={`h-2.5 w-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span>{block.isError ? 'Error' : 'Output'}</span>
          {isLong && !expanded && <span className="text-white/10">({lines.length} lines)</span>}
        </button>
        <button
          onClick={handleCopy}
          className="rounded p-0.5 text-white/10 transition-colors hover:text-white/30"
        >
          {copied ? <Check className="h-2.5 w-2.5 text-green-400/50" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04] px-2.5 py-2">
              <pre className={`whitespace-pre-wrap break-words font-mono text-[11px] leading-4 max-h-[300px] overflow-y-auto agent-scrollbar ${block.isError ? 'text-red-400/40' : 'text-white/25'}`}>
                {block.content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Text Block
// ============================================
function TextBlockComponent({ block }: { block: ContentBlock & { type: 'text' } }) {
  return (
    <div className="text-sm leading-relaxed text-white/85 prose prose-invert prose-sm max-w-none">
      {renderMarkdown(block.content)}
      {block.isStreaming && <StreamingCursor />}
    </div>
  );
}

function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-orange-400/70 rounded-full align-middle" />
  );
}

function renderMarkdown(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const content = part.slice(3, -3);
      const firstNewline = content.indexOf('\n');
      const lang = firstNewline > 0 ? content.slice(0, firstNewline).trim() : '';
      const code = firstNewline > 0 ? content.slice(firstNewline + 1) : content;
      return (
        <div key={i} className="my-2.5 rounded-lg border border-white/10 bg-black/40 overflow-hidden">
          {lang && (
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
              <span className="text-[10px] text-white/30 font-mono">{lang}</span>
              <CopyButton text={code} />
            </div>
          )}
          <pre className="p-3 overflow-x-auto">
            <code className="text-xs text-white/60 font-mono whitespace-pre">{code}</code>
          </pre>
        </div>
      );
    }
    return <span key={i}>{renderInlineMarkdown(part)}</span>;
  });
}

function renderInlineMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const elements: React.ReactNode[] = [];
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${li}`} className="text-base font-semibold text-white/90 mt-3 mb-1">{processInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${li}`} className="text-lg font-semibold text-white/90 mt-4 mb-1.5">{processInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${li}`} className="text-xl font-bold text-white/90 mt-4 mb-2">{processInline(line.slice(2))}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${li}`} className="flex gap-2 my-0.5">
          <span className="text-white/30 mt-0.5">•</span>
          <span className="flex-1">{processInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={`oli-${li}`} className="flex gap-2 my-0.5">
            <span className="text-white/30 text-xs mt-0.5">{match[1]}.</span>
            <span className="flex-1">{processInline(match[2])}</span>
          </div>
        );
      }
    } else if (line.trim() === '') {
      elements.push(<div key={`br-${li}`} className="h-2" />);
    } else {
      elements.push(<span key={`p-${li}`}>{processInline(line)}</span>);
    }
    return (
      <span key={`line-${li}`}>
        {elements}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

function processInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    const m = match[0];
    if (m.startsWith('**') && m.endsWith('**')) {
      result.push(<strong key={key++} className="font-semibold text-white/90">{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('`') && m.endsWith('`')) {
      result.push(<code key={key++} className="rounded bg-white/10 px-1 py-0.5 text-xs text-orange-300/70 font-mono">{m.slice(1, -1)}</code>);
    } else if (m.startsWith('[')) {
      const linkMatch = m.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        result.push(<a key={key++} href={linkMatch[2]} className="text-orange-400/70 underline underline-offset-2 hover:text-orange-400">{linkMatch[1]}</a>);
      }
    }
    lastIndex = match.index + m.length;
  }
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  return result;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-white/20 transition-colors hover:bg-white/10 hover:text-white/50"
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3 text-green-400/70" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds}s`;
}

function formatToolInputPreview(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => {
      if (key === 'content') return '(file content)';
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      return val.length > 40 ? val.slice(0, 40) + '...' : val;
    })
    .join(' · ');
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
