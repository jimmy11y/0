import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIModel, Message, Conversation, Agent, Attachment, Theme } from '@/types';

interface AppState {
  isAuthenticated: boolean;
  password: string;
  login: (password: string) => boolean;
  logout: () => void;
  theme: Theme;
  toggleTheme: () => void;
  models: AIModel[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  createConversation: () => string;
  setCurrentConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearConversations: () => void;
  agents: Agent[];
  selectedAgent: string | null;
  setSelectedAgent: (agentId: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  attachments: Attachment[];
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  clearExpiredAttachments: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  streamResponse: boolean;
  setStreamResponse: (stream: boolean) => void;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'deepseek-ai/DeepSeek-V4-Pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek AI',
    providerLogo: 'D',
    capabilities: ['Chat', 'JSON Mode', 'Tool Calling'],
    serverless: true,
    inputPrice: 2.10,
    outputPrice: 4.40,
    description: 'DeepSeek V4 Pro - advanced reasoning and coding',
    maxTokens: 8192,
    supportsVision: false,
    supportsThinking: false,
  },
  {
    id: 'zai-org/GLM-5.1',
    name: 'GLM 5.1 FP4',
    provider: 'Zai Org',
    providerLogo: 'Z',
    capabilities: ['Chat', 'JSON Mode', 'Tool Calling'],
    paramCount: '435.2B',
    serverless: true,
    inputPrice: 1.40,
    outputPrice: 4.40,
    description: 'GLM 5.1 - advanced reasoning and coding',
    maxTokens: 8192,
    supportsVision: false,
    supportsThinking: false,
  },
  {
    id: 'moonshotai/Kimi-K2.6',
    name: 'Kimi K2.6 Fp4',
    provider: 'Moonshot AI',
    providerLogo: 'M',
    capabilities: ['Chat', 'Multi-Modal', 'JSON Mode', 'Tool Calling'],
    serverless: true,
    inputPrice: 1.20,
    outputPrice: 4.50,
    description: 'Kimi K2.6 - multimodal with long context',
    maxTokens: 16384,
    supportsVision: true,
    supportsThinking: true,
  },
  {
    id: 'MiniMaxAI/MiniMax-M2.7',
    name: 'MiniMax M2.7 FP4',
    provider: 'MiniMaxAI',
    providerLogo: 'X',
    capabilities: ['Chat', 'JSON Mode', 'Tool Calling'],
    paramCount: '130.4B',
    serverless: true,
    inputPrice: 0.30,
    outputPrice: 1.20,
    description: 'MiniMax M2.7 - cost-efficient powerhouse',
    maxTokens: 8192,
    supportsVision: false,
    supportsThinking: false,
  },
];

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'default',
    name: 'General Assistant',
    avatar: 'A',
    description: 'General purpose assistant',
    systemPrompt: `Role: Elite Multi-Domain Expert (Senior Developer, Academic Researcher, Technical Writer).
Core Mission: Provide 100% accurate, verified, and bug-free solutions with absolute token efficiency.

Rules:
1. FACT-CHECKING: Validate all data before responding. Zero tolerance for hallucinations.
2. THINK-THEN-ACT: Logic-check internally. If ambiguous, ask briefly instead of guessing.
3. OUTPUT RULE: Always provide the full solution requested. Never skip core content.
4. STYLE: Professional and direct. No fluff, but NEVER omit actual data or code.
5. CODING: Optimized, secure code with zero redundant lines.
6. TOKEN-SAVER: If 10 words solve it, do not use 11.

Constraint: Billed per token. Be brilliantly brief.`,
    model: 'MiniMaxAI/MiniMax-M2.7',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  },
  {
    id: 'coder',
    name: 'Code Expert',
    avatar: 'C',
    description: 'Expert programmer and debugger',
    systemPrompt: `Role: Senior Software Engineer.
Rules:
- Write COMPLETE, runnable, production-ready code only. Never truncate or use placeholders.
- Zero redundant lines. Optimal algorithms only.
- Bug fix: root cause in 1 line → full fixed code.
- New code: implement directly, no preamble.
- Handle edge cases. Add only essential comments.
- Code speaks louder than explanations.`,
    model: 'deepseek-ai/DeepSeek-V4-Pro',
    temperature: 0.2,
    maxTokens: 8192,
    topP: 0.95,
  },
  {
    id: 'researcher',
    name: 'Research Analyst',
    avatar: 'R',
    description: 'Deep research and analysis',
    systemPrompt: `Role: Research Analyst & Academic Expert.
Rules:
- Fact-based, structured analysis only.
- Cite sources or acknowledge uncertainty explicitly.
- Structure: Key Finding → Evidence → Implication.
- No filler. Every sentence must add value.
- Complex topics: numbered sections, max 3 levels deep.`,
    model: 'moonshotai/Kimi-K2.6',
    temperature: 0.5,
    maxTokens: 8192,
    topP: 0.85,
  },
  {
    id: 'writer',
    name: 'Technical Writer',
    avatar: 'W',
    description: 'Clear technical documentation',
    systemPrompt: `Role: Technical Writer & Documentation Expert.
Rules:
- Clear, structured, reader-first documentation.
- Active voice. Short sentences. Precise terminology.
- Format: Headers → Body → Examples (when needed).
- Never pad. Every word earns its place.
- Code samples: only what's necessary to demonstrate the point.`,
    model: 'zai-org/GLM-5.1',
    temperature: 0.6,
    maxTokens: 4096,
    topP: 0.9,
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      password: '',
      login: (password: string) => {
        const validPassword = password.length >= 4;
        if (validPassword) {
          set({ isAuthenticated: true, password });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false, currentConversationId: null }),
      theme: 'dark',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      models: AVAILABLE_MODELS,
      selectedModel: 'MiniMaxAI/MiniMax-M2.7',
      setSelectedModel: (model: string) => set({ selectedModel: model }),
      conversations: [],
      currentConversationId: null,
      createConversation: () => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newConversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          model: get().selectedModel,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));
        return id;
      },
      setCurrentConversation: (id: string) => set({ currentConversationId: id }),
      addMessage: (conversationId: string, message: Message) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: Date.now(),
                  title:
                    conv.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                      : conv.title,
                }
              : conv
          ),
        }));
      },
      updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                  updatedAt: Date.now(),
                }
              : conv
          ),
        }));
      },
      deleteConversation: (id: string) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: newConversations,
            currentConversationId:
              state.currentConversationId === id
                ? newConversations.length > 0
                  ? newConversations[0].id
                  : null
                : state.currentConversationId,
          };
        });
      },
      renameConversation: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, title } : conv
          ),
        }));
      },
      clearConversations: () => set({ conversations: [], currentConversationId: null }),
      agents: DEFAULT_AGENTS,
      selectedAgent: null,
      setSelectedAgent: (agentId: string | null) => set({ selectedAgent: agentId }),
      sidebarOpen: true,
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      showThinking: true,
      setShowThinking: (show: boolean) => set({ showThinking: show }),
      isTyping: false,
      setIsTyping: (typing: boolean) => set({ isTyping: typing }),
      attachments: [],
      addAttachment: (attachment: Attachment) =>
        set((state) => ({ attachments: [...state.attachments, attachment] })),
      removeAttachment: (id: string) =>
        set((state) => ({ attachments: state.attachments.filter((a) => a.id !== id) })),
      clearExpiredAttachments: () =>
        set((state) => ({
          attachments: state.attachments.filter((a) => a.expiresAt > Date.now()),
        })),
      apiKey: '',
      setApiKey: (key: string) => set({ apiKey: key }),
      streamResponse: true,
      setStreamResponse: (stream: boolean) => set({ streamResponse: stream }),
    }),
    {
      name: '0111-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        password: state.password,
        conversations: state.conversations,
        selectedModel: state.selectedModel,
        selectedAgent: state.selectedAgent,
        apiKey: state.apiKey,
        streamResponse: state.streamResponse,
        showThinking: state.showThinking,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
);
