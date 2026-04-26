'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronRight, Loader2, Copy, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { MessageActions } from './message-actions';
import type { ChatMessage, ContentBlock, ToolUseBlock, ToolResultBlock, ThinkingBlock } from '@/types/agent';
import { TOOL_DISPLAY, MODEL_CONFIG } from '@/types/agent';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
  onEdit?: () => void;
}

export function MessageItem({ message, onRetry, onEdit }: MessageItemProps) {
  const isUser = message.role === 'user';
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="group flex justify-end px-2 sm:px-4 py-2 sm:py-3"
      >
        <div className="max-w-[85%] sm:max-w-[80%]">
          <div className={`rounded-2xl rounded-tr-sm px-4 py-2.5 ${isLight ? 'bg-black/[0.05]' : 'bg-white/[0.07]'}`}>
            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isLight ? 'text-black/85' : 'text-white/90'}`}>
              {message.content}
            </p>
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
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${isLight ? 'bg-black/[0.04] text-black/30' : 'bg-white/5 text-white/30'}`}>
              {MODEL_CONFIG[message.model]?.name || message.model}
            </span>
          </div>
        )}

        {message.blocks && message.blocks.length > 0 && (
          <ClaudeStyleBlocks blocks={message.blocks} isStreaming={message.isStreaming} />
        )}

        {(!message.blocks || message.blocks.length === 0) && message.content && (
          <div className={`agent-markdown text-sm leading-relaxed ${isLight ? 'text-black/80' : 'text-white/85'}`}>
            <MarkdownRenderer content={message.content} />
            {message.isStreaming && <StreamingCursor />}
          </div>
        )}

        {message.isStreaming && (!message.blocks || message.blocks.length === 0) && !message.content && (
          <ThinkingIndicator />
        )}

        {message.isError && (
          <div className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${isLight ? 'border-red-500/20 bg-red-500/5 text-red-600' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
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

// ============================================
// Markdown Renderer - Shared component
// ============================================
function MarkdownRenderer({ content }: { content: string }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const isInline = !match && !codeString.includes('\n');

          if (isInline) {
            return (
              <code className={`rounded px-1.5 py-0.5 text-xs font-mono ${isLight ? 'bg-black/[0.06] text-orange-700/80' : 'bg-white/10 text-orange-300/80'}`} {...props}>
                {children}
              </code>
            );
          }

          return (
            <CodeBlock language={match?.[1] || 'text'} code={codeString} />
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-7">{children}</p>;
        },
        h1({ children }) {
          return <h1 className={`text-xl font-bold mt-4 mb-2 ${isLight ? 'text-black/90' : 'text-white/90'}`}>{children}</h1>;
        },
        h2({ children }) {
          return <h2 className={`text-lg font-semibold mt-4 mb-1.5 ${isLight ? 'text-black/90' : 'text-white/90'}`}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 className={`text-base font-semibold mt-3 mb-1 ${isLight ? 'text-black/90' : 'text-white/90'}`}>{children}</h3>;
        },
        ul({ children }) {
          return <ul className="my-1.5 ml-4 space-y-1 list-disc list-outside">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="my-1.5 ml-4 space-y-1 list-decimal list-outside">{children}</ol>;
        },
        li({ children }) {
          return <li className={isLight ? 'text-black/70 leading-6' : 'text-white/80 leading-6'}>{children}</li>;
        },
        strong({ children }) {
          return <strong className={`font-semibold ${isLight ? 'text-black/90' : 'text-white/95'}`}>{children}</strong>;
        },
        a({ href, children }) {
          return <a href={href} className="text-orange-500/80 underline underline-offset-2 hover:text-orange-500" target="_blank" rel="noopener">{children}</a>;
        },
        blockquote({ children }) {
          return <blockquote className={`border-l-2 pl-3 my-2 italic ${isLight ? 'border-orange-500/30 text-black/50' : 'border-orange-400/30 text-white/60'}`}>{children}</blockquote>;
        },
        table({ children }) {
          return <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>;
        },
        th({ children }) {
          return <th className={`border px-2 py-1 text-left ${isLight ? 'border-black/10 bg-black/[0.03] text-black/70' : 'border-white/10 bg-white/5 text-white/70'}`}>{children}</th>;
        },
        td({ children }) {
          return <td className={`border px-2 py-1 ${isLight ? 'border-black/10 text-black/60' : 'border-white/10 text-white/60'}`}>{children}</td>;
        },
        hr() {
          return <hr className={isLight ? 'border-black/10 my-4' : 'border-white/10 my-4'} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ============================================
// Code Block - With syntax highlighting & copy
// ============================================
function CodeBlock({ language, code }: { language: string; code: string }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3 rounded-lg overflow-hidden border ${isLight ? 'border-black/[0.08]' : 'border-white/10'}`}>
      <div className={`flex items-center justify-between px-3 py-1.5 border-b ${isLight ? 'bg-[#fafafa] border-black/[0.06]' : 'bg-[#282c34] border-white/5'}`}>
        <span className={`text-[10px] font-mono ${isLight ? 'text-black/35' : 'text-white/40'}`}>{language}</span>
        <button
          onClick={handleCopy}
          className={`rounded p-1 transition-colors ${isLight ? 'text-black/20 hover:bg-black/5 hover:text-black/50' : 'text-white/20 hover:bg-white/10 hover:text-white/50'}`}
          title="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-green-500/70" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <SyntaxHighlighter
        style={isLight ? oneLight : oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '12px',
          background: isLight ? '#fafafa' : '#1e1e2e',
          padding: '12px',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// ============================================
// Claude-Style Grouped Blocks - Clean, minimal
// ============================================
function ClaudeStyleBlocks({ blocks, isStreaming }: { blocks: ContentBlock[]; isStreaming?: boolean }) {
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
        return <ClaudeThinkingGroup key={`tg-${gi}`} blocks={group.blocks} isStreaming={isStreaming} />;
      })}
    </div>
  );
}

// ============================================
// Claude-Style Thinking Group - Minimal, clean like Claude
// ============================================
function ClaudeThinkingGroup({ blocks, isStreaming }: { blocks: ContentBlock[]; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
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
      {/* Collapsed summary - Claude style: just a clean line */}
      <button
        onClick={() => !anyStreaming && setExpanded(!expanded)}
        className={`flex items-center gap-2.5 py-1 text-left transition-colors ${
          anyStreaming ? 'cursor-default' : 'group/btn cursor-pointer'
        }`}
      >
        {anyStreaming ? (
          <div className="relative">
            <Brain className="h-4 w-4 text-orange-500 animate-brain-pulse shrink-0" />
            <div className="absolute inset-0 rounded-full animate-ripple" />
          </div>
        ) : (
          <Brain className={`h-4 w-4 shrink-0 transition-colors ${isLight ? 'text-orange-500/40 group-hover/btn:text-orange-500/60' : 'text-orange-400/50 group-hover/btn:text-orange-400/70'}`} />
        )}
        <span className={`text-xs font-medium transition-colors ${
          anyStreaming
            ? isLight ? 'text-orange-600/70' : 'text-orange-400/70'
            : isLight ? 'text-black/30 group-hover/btn:text-black/50' : 'text-white/40 group-hover/btn:text-white/60'
        }`}>
          {summaryText}
        </span>
        {!anyStreaming && (
          expanded ? (
            <ChevronDown className={`h-3 w-3 shrink-0 ${isLight ? 'text-black/20' : 'text-white/25'}`} />
          ) : (
            <ChevronRight className={`h-3 w-3 shrink-0 ${isLight ? 'text-black/20' : 'text-white/25'}`} />
          )
        )}
        {toolBlocks.length > 0 && !anyStreaming && (
          <span className={`text-[10px] ml-1 ${isLight ? 'text-black/15' : 'text-white/20'}`}>
            {completedTools.length}/{toolBlocks.length} tools
          </span>
        )}
      </button>

      {/* Streaming tool steps - Claude style: minimal steps */}
      {anyStreaming && (
        <div className="ml-6 mt-1 space-y-1">
          {toolBlocks.map((tool, i) => (
            <div
              key={`step-${i}`}
              className="animate-step-in flex items-center gap-2"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {tool.status === 'completed' ? (
                <CheckIcon className={`h-3 w-3 shrink-0 ${isLight ? 'text-emerald-600/60' : 'text-emerald-400/70'}`} />
              ) : (
                <div className="relative shrink-0">
                  <Loader2 className={`h-3 w-3 animate-spin ${isLight ? 'text-orange-600/60' : 'text-orange-400/70'}`} />
                  <div className="absolute inset-0 rounded-full animate-ripple" />
                </div>
              )}
              <span className={`text-[11px] font-medium ${
                tool.status === 'completed'
                  ? isLight ? 'text-black/20' : 'text-white/25'
                  : isLight ? 'text-orange-600/70 animate-pulse-wave' : 'text-orange-400/70 animate-pulse-wave'
              }`}>
                {TOOL_DISPLAY[tool.name]?.label || tool.name}
              </span>
              <span className={`truncate text-[10px] font-mono max-w-[120px] sm:max-w-[200px] ${isLight ? 'text-black/15' : 'text-white/15'}`}>
                {formatToolInputPreview(tool.input)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded details - Claude style: thin border, no background */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={`ml-6 border-l pl-3 py-2 space-y-1.5 ${isLight ? 'border-black/[0.06]' : 'border-white/[0.06]'}`}>
              {blocks.map((block, index) => {
                switch (block.type) {
                  case 'thinking':
                    return <InlineThinkingContent key={`it-${index}`} block={block} />;
                  case 'tool_use':
                    return <ClaudeToolAction key={`tu-${index}`} block={block} />;
                  case 'tool_result':
                    return <ClaudeToolResult key={`tr-${index}`} block={block} />;
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
// Thinking Indicator
// ============================================
function ThinkingIndicator() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="relative">
        <Brain className={`h-4 w-4 ${isLight ? 'text-orange-500' : 'text-orange-400'} animate-brain-pulse`} />
        <div className="absolute inset-0 rounded-full animate-ripple" />
      </div>
      <span className={`text-xs font-medium ${isLight ? 'text-orange-600/70' : 'text-orange-400/70'} animate-pulse-wave`}>Thinking...</span>
    </div>
  );
}

// ============================================
// Inline Thinking - Minimal, Claude style
// ============================================
function InlineThinkingContent({ block }: { block: ThinkingBlock }) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  return (
    <div className="py-0.5">
      <p className={`text-xs leading-relaxed italic whitespace-pre-wrap break-words ${isLight ? 'text-black/20' : 'text-white/20'}`}>
        {block.content}
        {block.isStreaming && (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-orange-400/40 rounded-full align-middle" />
        )}
      </p>
    </div>
  );
}

// ============================================
// Claude-Style Tool Action - Clean, no background
// ============================================
function ClaudeToolAction({ block }: { block: ToolUseBlock }) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const toolDisplay = TOOL_DISPLAY[block.name] || { label: block.name, color: isLight ? 'text-black/40' : 'text-white/40' };
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
            <Loader2 className={`h-3 w-3 animate-spin ${isLight ? 'text-orange-600/50' : 'text-orange-400/50'}`} />
            <div className="absolute inset-0 rounded-full animate-ripple" />
          </div>
        ) : (
          <CheckIcon className={`h-3 w-3 shrink-0 ${isLight ? 'text-emerald-600/50' : 'text-emerald-400/50'}`} />
        )}
        <span className={`text-xs font-medium ${toolDisplay.color} ${isRunning ? 'opacity-70 animate-pulse-wave' : 'opacity-50'}`}>
          {toolDisplay.label}
        </span>
        <span className={`flex-1 truncate text-[11px] font-mono ${isLight ? 'text-black/15' : 'text-white/20'}`}>
          {formatToolInputPreview(block.input)}
        </span>
        {block.duration && !isRunning && (
          <span className={`text-[10px] shrink-0 ${isLight ? 'text-black/15' : 'text-white/15'}`}>{block.duration}ms</span>
        )}
        <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''} ${isLight ? 'text-black/15' : 'text-white/15'}`} />
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
            <div className={`mt-1.5 rounded-md border p-2.5 ${isLight ? 'border-black/[0.06] bg-black/[0.015]' : 'border-white/5 bg-white/[0.015]'}`}>
              {inputEntries.map(([key, value]) => (
                <div key={key} className="flex gap-2 py-0.5">
                  <span className={`text-[11px] shrink-0 font-mono ${isLight ? 'text-black/20' : 'text-white/20'}`}>{key}:</span>
                  <span className={`text-[11px] font-mono break-all line-clamp-3 ${isLight ? 'text-black/35' : 'text-white/35'}`}>
                    {key === 'content'
                      ? (typeof value === 'string' ? value.slice(0, 200) + (value.length > 200 ? '...' : '') : JSON.stringify(value).slice(0, 200))
                      : (typeof value === 'string' ? value : JSON.stringify(value, null, 2))
                    }
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
// Claude-Style Tool Result - Minimal, no code dump
// ============================================
function ClaudeToolResult({ block }: { block: ToolResultBlock }) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [copied, setCopied] = useState(false);
  const lines = block.content.split('\n');
  const isLong = lines.length > 4;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewText = block.isError
    ? 'Error output'
    : isLong
      ? `Output (${lines.length} lines)`
      : lines[0]?.slice(0, 80) + (lines[0]?.length > 80 ? '...' : '');

  return (
    <div className={`rounded-md overflow-hidden ${block.isError
      ? isLight ? 'border border-red-300/30' : 'border border-red-500/10'
      : isLight ? 'border border-black/[0.04]' : 'border border-white/[0.04]'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors ${
          isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.02]'
        }`}
      >
        <ChevronRight className={`h-2.5 w-2.5 transition-transform ${expanded ? 'rotate-90' : ''} ${isLight ? 'text-black/20' : 'text-white/20'}`} />
        <span className={`text-[11px] ${block.isError ? (isLight ? 'text-red-600/50' : 'text-red-400/50') : (isLight ? 'text-black/25' : 'text-white/25')}`}>
          {block.isError ? 'Error' : 'Output'}
        </span>
        {!expanded && (
          <span className={`text-[10px] truncate max-w-[200px] ${isLight ? 'text-black/15' : 'text-white/15'}`}>
            {previewText}
          </span>
        )}
        {isLong && !expanded && (
          <span className={`text-[10px] ${isLight ? 'text-black/10' : 'text-white/10'}`}>{lines.length} lines</span>
        )}
        <div className="flex-1" />
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className={`rounded p-0.5 transition-colors ${isLight ? 'text-black/10 hover:text-black/30' : 'text-white/10 hover:text-white/30'}`}
        >
          {copied ? <Check className="h-2.5 w-2.5 text-green-500/50" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
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
            <div className={`border-t px-2.5 py-2 ${isLight ? 'border-black/[0.04]' : 'border-white/[0.04]'}`}>
              <pre className={`whitespace-pre-wrap break-words font-mono text-[11px] leading-4 max-h-[300px] overflow-y-auto agent-scrollbar ${
                block.isError
                  ? isLight ? 'text-red-600/40' : 'text-red-400/40'
                  : isLight ? 'text-black/30' : 'text-white/25'
              }`}>
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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  return (
    <div className={`agent-markdown text-sm leading-relaxed ${isLight ? 'text-black/80' : 'text-white/85'}`}>
      <MarkdownRenderer content={block.content} />
      {block.isStreaming && <StreamingCursor />}
    </div>
  );
}

function StreamingCursor() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  return (
    <span className={`ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full align-middle ${isLight ? 'bg-orange-500/70' : 'bg-orange-400/70'}`} />
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
