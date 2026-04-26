import { create } from 'zustand';
import type { ChatMessage, ChatSession, ModelType, ContentBlock } from '@/types/agent';

export interface CodePanelFile {
  fileName: string;
  content: string;
  language: string;
  isPreview?: boolean;
}

interface AgentState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Current chat
  currentChatId: string | null;
  messages: ChatMessage[];
  model: ModelType;
  setModel: (model: ModelType) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Agent mode toggle
  agentMode: boolean;
  toggleAgentMode: () => void;
  setAgentMode: (mode: boolean) => void;

  // Chat history
  chatSessions: ChatSession[];
  addChatSession: (session: ChatSession) => void;
  setCurrentChatId: (id: string | null) => void;
  deleteChatSession: (id: string) => void;
  newChat: () => void;

  // Messages
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendMessageContent: (id: string, content: string) => void;
  appendThinkingContent: (id: string, content: string) => void;
  addContentBlock: (id: string, block: ContentBlock) => void;
  updateLastBlock: (id: string, updates: Partial<ContentBlock>) => void;
  updateBlockByIndex: (id: string, index: number, updates: Partial<ContentBlock>) => void;
  appendToLastTextBlock: (id: string, content: string) => void;
  setToolResult: (id: string, toolUseId: string, result: string, isError?: boolean) => void;
  finalizeToolUse: (id: string, toolId: string) => void;

  // Terminal - Auto-managed by agent
  terminalOpen: boolean;
  terminalContent: string[];
  setTerminalOpen: (open: boolean) => void;
  addTerminalLine: (line: string) => void;
  clearTerminal: () => void;
  closeTerminal: () => void;

  // Code Panel - side panel for file viewing
  codePanelOpen: boolean;
  codePanelFiles: CodePanelFile[];
  codePanelActiveIndex: number;
  openCodePanel: (file: CodePanelFile) => void;
  addCodePanelFile: (file: CodePanelFile) => void;
  setCodePanelActiveIndex: (index: number) => void;
  closeCodePanel: () => void;
  clearCodePanelFiles: () => void;

  // Streaming start time tracking
  streamStartTime: number | null;
  setStreamStartTime: (time: number | null) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Current chat
  currentChatId: null,
  messages: [],
  model: 'deepseek-v4-pro',
  setModel: (model) => set({ model }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error }),

  // Agent mode
  agentMode: false,
  toggleAgentMode: () => set((state) => ({ agentMode: !state.agentMode })),
  setAgentMode: (mode) => set({ agentMode: mode }),

  // Chat history
  chatSessions: [],
  addChatSession: (session) =>
    set((state) => ({ chatSessions: [session, ...state.chatSessions] })),
  setCurrentChatId: (id) => set({ currentChatId: id }),
  deleteChatSession: (id) =>
    set((state) => ({
      chatSessions: state.chatSessions.filter((s) => s.id !== id),
      currentChatId: state.currentChatId === id ? null : state.currentChatId,
      messages: state.currentChatId === id ? [] : state.messages,
    })),
  newChat: () => set({ messages: [], currentChatId: null, error: null, terminalOpen: false, terminalContent: [], codePanelOpen: false, codePanelFiles: [], codePanelActiveIndex: 0 }),

  // Messages
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  appendMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    })),
  appendThinkingContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id || !m.blocks) return m;
        const blocks = [...m.blocks];
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock?.type === 'thinking') {
          blocks[blocks.length - 1] = {
            ...lastBlock,
            content: lastBlock.content + content,
          };
        }
        return { ...m, blocks };
      }),
    })),
  addContentBlock: (id, block) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id) return m;
        return { ...m, blocks: [...(m.blocks || []), block] };
      }),
    })),
  updateLastBlock: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id || !m.blocks || m.blocks.length === 0) return m;
        const blocks = [...m.blocks];
        const lastIdx = blocks.length - 1;
        blocks[lastIdx] = { ...blocks[lastIdx], ...updates } as ContentBlock;
        return { ...m, blocks };
      }),
    })),
  updateBlockByIndex: (id, index, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id || !m.blocks || index >= m.blocks.length) return m;
        const blocks = [...m.blocks];
        blocks[index] = { ...blocks[index], ...updates } as ContentBlock;
        return { ...m, blocks };
      }),
    })),
  appendToLastTextBlock: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id || !m.blocks) return m;
        const blocks = [...m.blocks];
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock?.type === 'text') {
          blocks[blocks.length - 1] = {
            ...lastBlock,
            content: lastBlock.content + content,
          };
        }
        return { ...m, blocks };
      }),
    })),
  setToolResult: (id, toolUseId, result, isError) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id || !m.blocks) return m;
        const blocks = [...m.blocks];
        const resultBlock: ContentBlock = {
          type: 'tool_result',
          toolUseId,
          content: result,
          isError: isError || false,
        };
        return { ...m, blocks: [...blocks, resultBlock] };
      }),
    })),
  finalizeToolUse: (id, toolId) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== id || !m.blocks) return m;
        const blocks = m.blocks.map((b) => {
          if (b.type === 'tool_use' && b.id === toolId) {
            return { ...b, isStreaming: false, status: 'completed' as const };
          }
          return b;
        });
        return { ...m, blocks };
      }),
    })),

  // Terminal - Auto-managed
  terminalOpen: false,
  terminalContent: [],
  setTerminalOpen: (open) => set({ terminalOpen: open }),
  addTerminalLine: (line) =>
    set((state) => ({ terminalContent: [...state.terminalContent, line] })),
  clearTerminal: () => set({ terminalContent: [] }),
  closeTerminal: () => set({ terminalOpen: false }),

  // Code Panel
  codePanelOpen: false,
  codePanelFiles: [],
  codePanelActiveIndex: 0,
  openCodePanel: (file) =>
    set((state) => {
      const existingIndex = state.codePanelFiles.findIndex(f => f.fileName === file.fileName);
      let newFiles: CodePanelFile[];
      let newIndex: number;
      if (existingIndex >= 0) {
        newFiles = [...state.codePanelFiles];
        newFiles[existingIndex] = file;
        newIndex = existingIndex;
      } else {
        newFiles = [...state.codePanelFiles, file];
        newIndex = newFiles.length - 1;
      }
      return { codePanelOpen: true, codePanelFiles: newFiles, codePanelActiveIndex: newIndex };
    }),
  addCodePanelFile: (file) =>
    set((state) => {
      const existingIndex = state.codePanelFiles.findIndex(f => f.fileName === file.fileName);
      if (existingIndex >= 0) {
        const newFiles = [...state.codePanelFiles];
        newFiles[existingIndex] = file;
        return { codePanelFiles: newFiles };
      }
      return { codePanelFiles: [...state.codePanelFiles, file] };
    }),
  setCodePanelActiveIndex: (index) => set({ codePanelActiveIndex: index }),
  closeCodePanel: () => set({ codePanelOpen: false }),
  clearCodePanelFiles: () => set({ codePanelFiles: [], codePanelActiveIndex: 0 }),

  // Stream timing
  streamStartTime: null,
  setStreamStartTime: (time) => set({ streamStartTime: time }),
}));
