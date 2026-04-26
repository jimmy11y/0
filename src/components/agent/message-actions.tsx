'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, RotateCcw, Edit3 } from 'lucide-react';
import { useTheme } from 'next-themes';

interface MessageActionsProps {
  content: string;
  role: 'user' | 'assistant';
  onRetry?: () => void;
  onEdit?: () => void;
}

export function MessageActions({ content, role, onRetry, onEdit }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const btnClass = isLight
    ? 'rounded-md p-1.5 text-black/30 transition-colors hover:bg-black/5 hover:text-black/70'
    : 'rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70';

  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button onClick={handleCopy} className={btnClass} title="Copy">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {onRetry && (
        <button onClick={onRetry} className={btnClass} title="Retry">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}

      {role === 'user' && onEdit && (
        <button onClick={onEdit} className={btnClass} title="Edit">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
