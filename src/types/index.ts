export interface AIModel {
  id: string;
  name: string;
  provider: string;
  providerLogo: string;
  capabilities: string[];
  paramCount?: string;
  serverless: boolean;
  inputPrice: number;
  outputPrice: number;
  description: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsThinking: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  timestamp: number;
  model?: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  attachments?: Attachment[];
  thinkingTime?: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  expiresAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
}

export type Theme = 'dark' | 'light';
