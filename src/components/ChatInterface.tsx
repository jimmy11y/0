import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Message, Attachment } from '@/types';
import { TogetherAIService } from '@/lib/together';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import AgentPopup from './AgentPopup';

export default function ChatInterface() {
  const {
    conversations,
    currentConversationId,
    createConversation,
    addMessage,
    updateMessage,
    selectedModel,
    models,
    apiKey,
    streamResponse,
    selectedAgent,
    agents,
    showThinking,
    sidebarOpen,
    setSidebarOpen,
    theme,
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showAgentPopup, setShowAgentPopup] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortRef = useRef(false);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const currentModel = models.find((m) => m.id === selectedModel) || models[0];
  const currentAgent = agents.find((a) => a.id === selectedAgent) ?? null;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (!currentConversationId) {
      createConversation();
    }
  }, [currentConversationId, createConversation]);

  const handleSendMessage = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      if (!apiKey || !currentConversationId || !content.trim()) return;

      abortRef.current = false;

      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'complete',
        attachments,
      };

      addMessage(currentConversationId, userMessage);

      const assistantMessageId = `msg_${Date.now()}_assistant`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'streaming',
        model: currentModel.id,
      };

      addMessage(currentConversationId, assistantMessage);
      setIsGenerating(true);

      const service = new TogetherAIService(apiKey);
      // Use agent system prompt if agent selected, else use the global prompt
      const systemPrompt = currentAgent?.systemPrompt;
      const messagesForAPI: Message[] = [
        ...(currentConversation?.messages || []).slice(-20),
        userMessage,
      ];

      const thinkingStartTime = Date.now();

      if (streamResponse) {
        try {
          let fullContent = '';
          let fullReasoning = '';
          let hasReasoning = false;

          for await (const chunk of service.streamChatCompletion(
            messagesForAPI,
            currentModel,
            systemPrompt,
            currentAgent
          )) {
            if (abortRef.current) break;

            if (chunk.error) {
              updateMessage(currentConversationId, assistantMessageId, {
                status: 'error',
                content: chunk.error,
              });
              break;
            }

            if (chunk.done) {
              updateMessage(currentConversationId, assistantMessageId, {
                status: 'complete',
                thinkingTime: hasReasoning ? Date.now() - thinkingStartTime : undefined,
              });
              break;
            }

            if (chunk.content) {
              fullContent += chunk.content;
              updateMessage(currentConversationId, assistantMessageId, {
                content: fullContent,
              });
            }

            if (chunk.reasoning) {
              hasReasoning = true;
              fullReasoning += chunk.reasoning;
              updateMessage(currentConversationId, assistantMessageId, {
                reasoning: fullReasoning,
              });
            }
          }
        } catch {
          updateMessage(currentConversationId, assistantMessageId, {
            status: 'error',
            content: 'Stream interrupted. Please try again.',
          });
        }
      } else {
        const result = await service.chatCompletion(
          messagesForAPI,
          currentModel,
          systemPrompt,
          currentAgent
        );

        if (result.error) {
          updateMessage(currentConversationId, assistantMessageId, {
            status: 'error',
            content: result.error,
          });
        } else {
          updateMessage(currentConversationId, assistantMessageId, {
            content: result.content,
            reasoning: result.reasoning,
            status: 'complete',
            thinkingTime: result.reasoning ? Date.now() - thinkingStartTime : undefined,
          });
        }
      }

      setIsGenerating(false);
    },
    [
      apiKey,
      currentConversationId,
      currentConversation?.messages,
      currentModel,
      currentAgent,
      streamResponse,
      addMessage,
      updateMessage,
    ]
  );

  const handleStopGeneration = useCallback(() => {
    abortRef.current = true;
    setIsGenerating(false);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0ede8] text-[#1a1a1a]'
    }`}>
      {sidebarOpen && (
        <div className={`w-[260px] min-w-[260px] border-r ${
          isDark ? 'border-white/[0.06] bg-[#0a0a0a]' : 'border-[#d4cfc8] bg-[#e8e4de]'
        }`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenAgentPopup={() => setShowAgentPopup(true)}
          isGenerating={isGenerating}
          onStopGeneration={handleStopGeneration}
        />

        <div className="flex-1 overflow-y-auto">
          {currentConversation?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className={`w-12 h-12 flex items-center justify-center font-bold text-xl tracking-tighter ${
                    isDark ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white'
                  }`}>
                    01
                  </div>
                  <div className={`w-12 h-12 border flex items-center justify-center font-bold text-xl tracking-tighter ${
                    isDark ? 'border-white/20 text-white' : 'border-[#1a1a1a]/30 text-[#1a1a1a]'
                  }`}>
                    11
                  </div>
                </div>
                <h2 className={`text-xl font-medium mb-2 ${isDark ? 'text-white/80' : 'text-[#1a1a1a]/80'}`}>
                  How can I help you today?
                </h2>
                <p className={`text-sm ${isDark ? 'text-white/30' : 'text-[#1a1a1a]/40'}`}>
                  Select a model and start the conversation
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  'Write optimized React code',
                  'Analyze this data structure',
                  'Debug this error pattern',
                  'Explain system architecture',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className={`p-4 text-left border transition-all duration-200 group ${
                      isDark
                        ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                        : 'border-[#1a1a1a]/10 bg-white/40 hover:bg-white/70 hover:border-[#1a1a1a]/20'
                    }`}
                  >
                    <p className={`text-xs tracking-wide transition-colors ${
                      isDark
                        ? 'text-white/50 group-hover:text-white/70'
                        : 'text-[#1a1a1a]/50 group-hover:text-[#1a1a1a]/80'
                    }`}>
                      {prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4">
              {currentConversation?.messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  showThinking={showThinking}
                  model={
                    message.role === 'assistant'
                      ? models.find((m) => m.id === message.model)
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className={`border-t px-4 py-4 ${isDark ? 'border-white/[0.06]' : 'border-[#d4cfc8]'}`}>
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSendMessage} disabled={isGenerating} />
          </div>
        </div>
      </div>

      {showAgentPopup && (
        <AgentPopup onClose={() => setShowAgentPopup(false)} />
      )}
    </div>
  );
}
