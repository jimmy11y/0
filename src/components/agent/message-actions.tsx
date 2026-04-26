'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, RotateCcw, Edit3 } from 'lucide-react';

interface MessageActionsProps {
  content: string;
  role: 'user' | 'assistant';
  onRetry?: () => void;
  onEdit?: () => void;
}

export function MessageActions({ content, role, onRetry, onEdit }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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

  return (
    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      {/* Copy - available for both user and assistant */}
      <button
        onClick={handleCopy}
        className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Retry - available for both user and assistant */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
          title="Retry"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Edit - only for user messages */}
      {role === 'user' && onEdit && (
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
          title="Edit"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
