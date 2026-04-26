'use client';

import { WelcomeScreen } from './welcome-screen';
import { ChatInput } from './chat-input';
import { MessageList } from './message-list';
import { MacTerminal } from './mac-terminal';
import { CodePanel } from './code-panel';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { Square } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import type { AttachedFile } from './chat-input';

export function ChatInterface() {
  const { messages, isLoading, codePanelOpen, agentMode } = useAgentStore();
  const { sendMessage, retryMessage, stopGeneration } = useAgentChat();
  const hasMessages = messages.length > 0;

  const handleSend = (content: string, files?: AttachedFile[]) => {
    let messageContent = content;
    if (files && files.length > 0) {
      const fileInfo = files.map(f => {
        if (f.dataUrl) {
          return `[Image: ${f.name}]`;
        }
        return `[File: ${f.name}]\n${f.content?.slice(0, 2000) || ''}`;
      }).join('\n\n');
      messageContent = fileInfo + (content ? '\n\n' + content : '');
    }
    sendMessage(messageContent);
  };

  return (
    <div className="flex flex-1 overflow-hidden min-w-0">
      {/* Chat area */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Messages or Welcome Screen */}
        {hasMessages ? (
          <MessageList messages={messages} onRetry={retryMessage} />
        ) : (
          <WelcomeScreen
            onSelectPrompt={(prompt) => sendMessage(prompt)}
          />
        )}

        {/* Stop generation button */}
        {isLoading && (
          <div className="absolute bottom-[76px] sm:bottom-24 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={stopGeneration}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white/50 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/70"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          </div>
        )}

        {/* Terminal - only opens when agent runs Bash commands */}
        <MacTerminal />

        {/* Chat Input */}
        <ChatInput onSend={handleSend} />
      </div>

      {/* Code Panel - side panel for file viewing */}
      <CodePanel />
    </div>
  );
}
