import { useState, useCallback } from 'react';
import CodeBlock from './CodeBlock';
import TerminalPreview from './TerminalPreview';

interface MessageContentProps {
  content: string;
  theme?: 'dark' | 'light';
  isStreaming?: boolean;
}

interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }
    // Add code block
    parts.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: content.trim() }];
}

function formatText(text: string, isDark: boolean): string {
  const inlineCodeBg = isDark ? 'bg-white/[0.08] text-white/80' : 'bg-[#1a1a1a]/[0.08] text-[#1a1a1a]/80';
  const strongCls = isDark ? 'text-white/90' : 'text-[#1a1a1a]/90';
  const emCls = isDark ? 'text-white/70' : 'text-[#1a1a1a]/70';

  return text
    .replace(/`([^`]+)`/g, `<code class="${inlineCodeBg} px-1.5 py-0.5 text-xs rounded-md font-mono">$1</code>`)
    .replace(/\*\*(.+?)\*\*/g, `<strong class="${strongCls} font-semibold">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em class="${emCls}">$1</em>`)
    .replace(/\n/g, '<br />');
}

export default function MessageContent({ content, theme = 'dark', isStreaming = false }: MessageContentProps) {
  const [showTerminal, setShowTerminal] = useState(false);
  const [activeCode, setActiveCode] = useState<string>('');
  const isDark = theme === 'dark';
  const parts = parseContent(content);
  const hasCode = parts.some(p => p.type === 'code');

  const handleRunCode = useCallback((code: string) => {
    setActiveCode(code);
    setShowTerminal(true);
  }, []);

  return (
    <div className="space-y-1">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div key={index} className="relative group">
              <CodeBlock
                code={part.content}
                language={part.language}
                theme={theme}
              />
              {/* Run Button */}
              <button
                onClick={() => handleRunCode(part.content)}
                className={`absolute top-10 right-16 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] ${
                  isDark 
                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                    : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                }`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Run
              </button>
            </div>
          );
        }

        return (
          <div
            key={index}
            className={`text-sm leading-relaxed ${isDark ? 'text-white/75' : 'text-[#1a1a1a]/75'}`}
            dangerouslySetInnerHTML={{ __html: formatText(part.content, isDark) }}
          />
        );
      })}

      {/* Terminal Preview Panel */}
      {hasCode && showTerminal && (
        <TerminalPreview
          code={activeCode || content}
          isActive={showTerminal}
          onClose={() => setShowTerminal(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
