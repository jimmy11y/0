'use client';

import { useCallback, useRef, useState } from 'react';
import { useAgentStore } from '@/lib/agent-store';
import type { ChatMessage, ContentBlock } from '@/types/agent';

export function useAgentChat() {
  const {
    messages,
    model,
    agentMode,
    addMessage,
    updateMessage,
    appendMessageContent,
    addContentBlock,
    updateLastBlock,
    updateBlockByIndex,
    appendToLastTextBlock,
    finalizeToolUse,
    setIsLoading,
    setError,
    addChatSession,
    setCurrentChatId,
    currentChatId,
    addTerminalLine,
    setTerminalOpen,
    closeTerminal,
    openCodePanel,
    streamStartTime,
    setStreamStartTime,
  } = useAgentStore();

  const abortRef = useRef<AbortController | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setIsLoading(true);
      setError(null);
      setStreamStartTime(Date.now());

      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      // Create placeholder assistant message
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        blocks: [],
        timestamp: Date.now(),
        model,
        isStreaming: true,
      };
      addMessage(assistantMessage);
      setStreamingMessageId(assistantId);

      // Create chat session if needed
      if (!currentChatId) {
        const sessionId = generateId();
        const session = {
          id: sessionId,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addChatSession(session);
        setCurrentChatId(sessionId);
      }

      // Abort any previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages, model, agentMode }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = '';
        let currentThinkingStartTime = 0;
        let currentToolStartTime = 0;
        let currentToolUseBlockIndex = -1;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const now = Date.now();

                switch (currentEventType) {
                  case 'thinking_start': {
                    currentThinkingStartTime = now;
                    const thinkingBlock: ContentBlock = {
                      type: 'thinking',
                      content: '',
                      isStreaming: true,
                    };
                    addContentBlock(assistantId, thinkingBlock);
                    break;
                  }

                  case 'thinking_delta': {
                    const thinking = data.thinking || '';
                    const currentMsg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    const lastBlock = currentMsg?.blocks?.[currentMsg.blocks.length - 1];
                    if (lastBlock?.type === 'thinking') {
                      appendThinkingContent(assistantId, thinking);
                    } else {
                      const thinkingBlock: ContentBlock = {
                        type: 'thinking',
                        content: thinking,
                        isStreaming: true,
                      };
                      addContentBlock(assistantId, thinkingBlock);
                    }
                    break;
                  }

                  case 'thinking_end': {
                    const thinkingDuration = now - currentThinkingStartTime;
                    const currentMsg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    if (currentMsg?.blocks) {
                      const lastIdx = currentMsg.blocks.length - 1;
                      if (currentMsg.blocks[lastIdx]?.type === 'thinking') {
                        updateBlockByIndex(assistantId, lastIdx, {
                          isStreaming: false,
                          duration: thinkingDuration,
                        });
                      }
                    }
                    break;
                  }

                  case 'tool_use_start': {
                    currentToolStartTime = now;

                    // Open terminal ONLY for Bash commands
                    if (data.toolName === 'Bash') {
                      setTerminalOpen(true);
                      const cmd = data.toolInput?.command || data.toolInput?.['command'];
                      if (cmd) {
                        addTerminalLine(`$ ${typeof cmd === 'string' ? cmd : JSON.stringify(cmd)}`);
                      }
                    }

                    // Finalize any open thinking block
                    const msg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    if (msg?.blocks) {
                      const lastIdx = msg.blocks.length - 1;
                      if (msg.blocks[lastIdx]?.type === 'thinking' && msg.blocks[lastIdx].isStreaming) {
                        updateBlockByIndex(assistantId, lastIdx, { isStreaming: false });
                      }
                    }

                    const toolBlock: ContentBlock = {
                      type: 'tool_use',
                      id: data.toolId,
                      name: data.toolName,
                      input: data.toolInput || {},
                      status: 'running',
                      isStreaming: true,
                    };
                    addContentBlock(assistantId, toolBlock);

                    // Track block index for later updates
                    const updatedMsg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    currentToolUseBlockIndex = (updatedMsg?.blocks?.length || 1) - 1;

                    break;
                  }

                  case 'tool_use_end': {
                    const toolDuration = now - currentToolStartTime;
                    const msg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    if (msg?.blocks && currentToolUseBlockIndex >= 0 && currentToolUseBlockIndex < msg.blocks.length) {
                      updateBlockByIndex(assistantId, currentToolUseBlockIndex, {
                        isStreaming: false,
                        status: 'completed',
                        duration: toolDuration,
                      });
                    }
                    break;
                  }

                  case 'tool_result': {
                    // Finalize the tool_use block
                    finalizeToolUse(assistantId, data.toolUseId);

                    const resultBlock: ContentBlock = {
                      type: 'tool_result',
                      toolUseId: data.toolUseId,
                      content: data.content || '',
                      isError: data.isError || false,
                    };
                    addContentBlock(assistantId, resultBlock);

                    // Log Bash output to terminal
                    if (data.content) {
                      const contentStr = data.content as string;
                      // Check if this looks like Bash output (from the tool_result for a Bash tool)
                      const currentMsg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                      const toolBlocks = currentMsg?.blocks?.filter(b => b.type === 'tool_use') || [];
                      const lastToolBlock = toolBlocks[toolBlocks.length - 1];
                      if (lastToolBlock && lastToolBlock.type === 'tool_use' && lastToolBlock.name === 'Bash') {
                        if (data.isError) {
                          addTerminalLine(`❌ ${contentStr.slice(0, 200)}`);
                        } else {
                          contentStr.split('\n').forEach(line => {
                            addTerminalLine(line);
                          });
                        }
                      }

                      // Open Code Panel for Read/Write/Edit tools
                      if (lastToolBlock && lastToolBlock.type === 'tool_use' && ['Read', 'Write', 'Edit'].includes(lastToolBlock.name)) {
                        const fileName = (lastToolBlock.input?.filepath || lastToolBlock.input?.path || lastToolBlock.input?.fileName || '') as string;
                        const ext = fileName.split('.').pop()?.toLowerCase() || '';
                        const langMap: Record<string, string> = {
                          ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
                          py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
                          css: 'css', scss: 'scss', html: 'html', json: 'json', yaml: 'yaml', yml: 'yaml',
                          md: 'markdown', sql: 'sql', sh: 'bash', bash: 'bash',
                          svg: 'xml', xml: 'xml', txt: 'text', env: 'text',
                        };
                        const language = langMap[ext] || 'text';
                        // For Write tool, use the input content (actual file content)
                        // For Read/Edit, use the result content (file being read)
                        const codePanelContent = lastToolBlock.name === 'Write'
                          ? (lastToolBlock.input?.content as string || contentStr)
                          : contentStr;
                        openCodePanel({
                          fileName: fileName || 'untitled',
                          content: codePanelContent,
                          language,
                        });
                      }
                    }

                    break;
                  }

                  case 'text_delta': {
                    // Finalize any open thinking/tool blocks
                    const msg2 = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    if (msg2?.blocks) {
                      const lastIdx = msg2.blocks.length - 1;
                      const last = msg2.blocks[lastIdx];
                      if (last && 'isStreaming' in last && last.isStreaming && last.type !== 'text') {
                        updateBlockByIndex(assistantId, lastIdx, { isStreaming: false });
                      }
                    }

                    // Append to text block or create new one
                    const msg3 = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    const lastBlock = msg3?.blocks?.[msg3.blocks.length - 1];
                    if (lastBlock?.type === 'text') {
                      appendToLastTextBlock(assistantId, data.content);
                    } else {
                      const textBlock: ContentBlock = {
                        type: 'text',
                        content: data.content,
                        isStreaming: true,
                      };
                      addContentBlock(assistantId, textBlock);
                    }
                    appendMessageContent(assistantId, data.content);
                    break;
                  }

                  case 'error': {
                    updateMessage(assistantId, {
                      isError: true,
                      isStreaming: false,
                      content: data.content || data.error || 'An error occurred. Please try again.',
                    });
                    setError(data.content || data.error || 'Unknown error');
                    setStreamingMessageId(null);
                    break;
                  }

                  case 'done': {
                    // Finalize all streaming blocks
                    const finalMsg = useAgentStore.getState().messages.find(m => m.id === assistantId);
                    if (finalMsg?.blocks) {
                      const updatedBlocks = finalMsg.blocks.map(b =>
                        ('isStreaming' in b && b.isStreaming) ? { ...b, isStreaming: false } as ContentBlock : b
                      );
                      updateMessage(assistantId, { blocks: updatedBlocks });
                    }

                    // Close terminal after a delay if no more actions
                    setTimeout(() => {
                      const stillLoading = useAgentStore.getState().isLoading;
                      if (!stillLoading) {
                        closeTerminal();
                      }
                    }, 4000);

                    break;
                  }
                }
              } catch {
                // Ignore parse errors
              }
              currentEventType = '';
            }
          }
        }

        // Finalize
        updateMessage(assistantId, { isStreaming: false });
        setStreamingMessageId(null);
        setStreamStartTime(null);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send message';
        updateMessage(assistantId, {
          isError: true,
          isStreaming: false,
          content: 'Failed to generate a response. Please try again.',
        });
        setError(errorMessage);
        setStreamingMessageId(null);
        // Connection error logged
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      model,
      agentMode,
      currentChatId,
      addMessage,
      updateMessage,
      appendMessageContent,
      addContentBlock,
      updateLastBlock,
      updateBlockByIndex,
      appendToLastTextBlock,
      finalizeToolUse,
      setIsLoading,
      setError,
      addChatSession,
      setCurrentChatId,
      addTerminalLine,
      setTerminalOpen,
      closeTerminal,
      openCodePanel,
      streamStartTime,
      setStreamStartTime,
    ]
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex > 0) {
        const userMessage = messages[messageIndex - 1];
        if (userMessage?.role === 'user') {
          sendMessage(userMessage.content);
        }
      }
    },
    [messages, sendMessage]
  );

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    closeTerminal();
  }, [setIsLoading, closeTerminal]);

  return {
    sendMessage,
    retryMessage,
    stopGeneration,
    streamingMessageId,
  };
}
