'use client';

import { useRef, useEffect } from 'react';
import { MessageItem } from './message-item';
import type { ChatMessage } from '@/types/agent';

interface MessageListProps {
  messages: ChatMessage[];
  onRetry: (messageId: string) => void;
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto agent-scrollbar overscroll-contain">
      <div className="mx-auto max-w-3xl w-full px-2 sm:px-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onRetry={() => onRetry(message.id)}
          />
        ))}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
