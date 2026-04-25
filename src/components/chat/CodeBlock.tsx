import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  theme?: 'dark' | 'light';
}

export default function CodeBlock({ code, language = 'text', theme = 'dark' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizedLang = language.toLowerCase().trim() || 'text';

  return (
    <div className={`rounded-lg overflow-hidden my-3 border ${isDark ? 'border-white/[0.08]' : 'border-[#1a1a1a]/10'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-[#1a1a2e]' : 'bg-[#f0f0f0]'}`}>
        <div className="flex items-center gap-2">
          <Terminal className={`w-3.5 h-3.5 ${isDark ? 'text-white/40' : 'text-[#1a1a1a]/40'}`} />
          <span className={`text-xs font-mono tracking-wide ${isDark ? 'text-white/50' : 'text-[#1a1a1a]/50'}`}>
            {normalizedLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-all duration-200 ${
            copied
              ? isDark ? 'text-green-400 bg-green-400/10' : 'text-green-600 bg-green-600/10'
              : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]' : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70 hover:bg-[#1a1a1a]/[0.06]'
          }`}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <SyntaxHighlighter
        language={normalizedLang}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '16px',
          fontSize: '13px',
          lineHeight: '1.6',
          background: isDark ? '#0d0d1a' : '#1a1a2e',
          borderRadius: 0,
        }}
        showLineNumbers
        lineNumberStyle={{
          minWidth: '2.5em',
          paddingRight: '1em',
          color: 'rgba(255,255,255,0.15)',
          fontSize: '11px',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
