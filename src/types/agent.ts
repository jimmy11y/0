export type ModelType = 'deepseek-v4-pro' | 'glm-5.1' | 'kimi-k2.6' | 'minimax-m2.7';

// Content block types - 01 11 AI style
export type ContentBlockType = 'thinking' | 'tool_use' | 'tool_result' | 'text';

export interface ThinkingBlock {
  type: 'thinking';
  content: string;
  duration?: number; // ms
  isStreaming?: boolean;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string; // e.g. 'Read', 'Write', 'Bash', 'Grep', 'Edit', 'WebSearch'
  input: Record<string, unknown>;
  status?: 'running' | 'completed' | 'error';
  duration?: number; // ms
  isStreaming?: boolean;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
  duration?: number;
}

export interface TextBlock {
  type: 'text';
  content: string;
  isStreaming?: boolean;
}

export type ContentBlock = ThinkingBlock | ToolUseBlock | ToolResultBlock | TextBlock;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  blocks?: ContentBlock[];
  timestamp: number;
  model?: ModelType;
  isStreaming?: boolean;
  isError?: boolean;
  thinkingDuration?: number; // total thinking time in ms
}

export interface ChatSession {
  id: string;
  title: string;
  model: ModelType;
  createdAt: number;
  updatedAt: number;
}

// SSE event types
export type SSEEventType = 'thinking_start' | 'thinking_delta' | 'thinking_end' | 'tool_use_start' | 'tool_use_end' | 'tool_result' | 'text_delta' | 'error' | 'done';

export interface SSEEvent {
  event: SSEEventType;
  data: {
    thinking?: string;
    toolId?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolUseId?: string;
    content?: string;
    isError?: boolean;
    duration?: number;
    error?: string;
  };
}

// Model configuration - Together AI models, no emojis, just names
export const MODEL_CONFIG: Record<ModelType, { name: string; provider: string; togetherId: string; description: string }> = {
  'deepseek-v4-pro': {
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    togetherId: 'deepseek-ai/DeepSeek-V4-Pro',
    description: 'Advanced reasoning & coding',
  },
  'glm-5.1': {
    name: 'GLM 5.1',
    provider: '01 11 AI',
    togetherId: 'zai-org/GLM-5.1',
    description: 'Balanced performance',
  },
  'kimi-k2.6': {
    name: 'Kimi K2.6',
    provider: 'Moonshot',
    togetherId: 'moonshotai/Kimi-K2.6',
    description: 'Long context & analysis',
  },
  'minimax-m2.7': {
    name: 'MiniMax M2.7',
    provider: 'MiniMax',
    togetherId: 'MiniMaxAI/MiniMax-M2.7',
    description: 'Multilingual & creative',
  },
};

// Tool display config - matches 01 11 AI tool icons
export const TOOL_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
  Read: { label: 'Read', icon: '📄', color: 'text-blue-400' },
  Write: { label: 'Write', icon: '✏️', color: 'text-green-400' },
  Edit: { label: 'Edit', icon: '📝', color: 'text-yellow-400' },
  Bash: { label: 'Bash', icon: '⚡', color: 'text-purple-400' },
  Grep: { label: 'Search', icon: '🔍', color: 'text-cyan-400' },
  Glob: { label: 'Find', icon: '🔎', color: 'text-cyan-400' },
  WebSearch: { label: 'Web Search', icon: '🌐', color: 'text-orange-400' },
  WebReader: { label: 'Read URL', icon: '🔗', color: 'text-blue-400' },
  Task: { label: 'Agent', icon: '🤖', color: 'text-pink-400' },
  LS: { label: 'List', icon: '📁', color: 'text-amber-400' },
};
