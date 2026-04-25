import { useState } from 'react';
import type { Message, AIModel } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ThinkingProcess from './chat/ThinkingProcess';
import MessageContent from './chat/MessageContent';
import StreamingIndicator from './chat/StreamingIndicator';

interface MessageItemProps {
  message: Message;
  showThinking: boolean;
  model?: AIModel;
}

export default function MessageItem({ message, model }: MessageItemProps) {
  const { showThinking: globalShowThinking, theme } = useAppStore();
  const isDark = theme === 'dark';

  const isUser = message.role === 'user';
  const hasReasoning = message.reasoning && message.reasoning.length > 0;
  const shouldShowThinking = globalShowThinking && hasReasoning;
  const isStreaming = message.status === 'streaming';

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`py-5 ${isUser ? '' : `border-b ${isDark ? 'border-white/[0.04]' : 'border-[#d4cfc8]/40'}`}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-lg ${
          isUser
            ? isDark ? 'bg-white/10 text-white/70' : 'bg-[#1a1a1a]/10 text-[#1a1a1a]/70'
            : isDark ? 'bg-gradient-to-br from-white to-white/80 text-black' : 'bg-gradient-to-br from-[#1a1a1a] to-[#1a1a1a]/80 text-white'
        }`}>
          {isUser ? 'U' : model?.providerLogo || 'A'}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium tracking-wide ${isDark ? 'text-white/60' : 'text-[#1a1a1a]/60'}`}>
            {isUser ? 'You' : model?.name || 'Assistant'}
          </span>
          <span className={`text-[10px] ${isDark ? 'text-white/20' : 'text-[#1a1a1a]/25'}`}>
            {formatTime(message.timestamp)}
          </span>
          {message.status === 'error' && (
            <span className="flex items-center gap-1 text-red-400/60 text-[10px]">
              <AlertCircle className="w-3 h-3" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Attachments */}
      {isUser && message.attachments && message.attachments.length > 0 && (
        <div className="flex gap-2 mb-3">
          {message.attachments.map((att) => (
            <div
              key={att.id}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs ${
                isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/50' : 'bg-[#1a1a1a]/[0.04] border-[#1a1a1a]/[0.08] text-[#1a1a1a]/50'
              }`}
            >
              <span className="truncate max-w-[200px]">{att.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thinking / Reasoning */}
      {shouldShowThinking && (
        <ThinkingProcess
          reasoning={message.reasoning!}
          thinkingTime={message.thinkingTime}
          isStreaming={isStreaming && !message.content}
          theme={theme}
        />
      )}

      {/* Content */}
      {message.content && (
        <MessageContent
          content={message.content}
          theme={theme}
          isStreaming={isStreaming}
        />
      )}

      {/* Streaming indicator - when no content yet */}
      {isStreaming && !message.content && !message.reasoning && (
        <StreamingIndicator theme={theme} />
      )}
    </motion.div>
  );
}
