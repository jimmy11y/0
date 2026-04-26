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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto agent-scrollbar">
      <div className="mx-auto max-w-3xl w-full">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onRetry={() => onRetry(message.id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
