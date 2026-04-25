import type { AIModel, Message, Agent } from '@/types';

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      reasoning_content?: string;
      reasoning?: string;
    };
    finish_reason: string | null;
  }>;
}

export class TogetherAIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private buildRequestBody(
    messages: Array<{ role: string; content: string }>,
    model: AIModel,
    agent?: Agent | null,
    stream = true
  ) {
    // Per-agent settings override model defaults for max token efficiency
    const maxTokens = agent?.maxTokens ?? model.maxTokens;
    const temperature = agent?.temperature ?? 0.7;
    const topP = agent?.topP ?? 0.9;

    return {
      model: model.id,
      messages,
      stream,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
    };
  }

  async *streamChatCompletion(
    messages: Message[],
    model: AIModel,
    systemPrompt?: string,
    agent?: Agent | null
  ): AsyncGenerator<{ content?: string; reasoning?: string; done: boolean; error?: string }> {
    const formattedMessages = this.formatMessages(messages, systemPrompt);

    try {
      const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(this.buildRequestBody(formattedMessages, model, agent, true)),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { done: true, error: `API Error: ${response.status} - ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { done: true, error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let hasYieldedContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') {
            if (trimmed === 'data: [DONE]') {
              yield { done: true };
              return;
            }
            continue;
          }
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data: StreamChunk = JSON.parse(trimmed.slice(6));
            const choice = data.choices?.[0];
            const delta = choice?.delta;

            if (delta) {
              const content = delta.content || '';
              const reasoning = delta.reasoning_content || delta.reasoning || '';

              if (content) {
                hasYieldedContent = true;
                yield { content, reasoning: undefined, done: false };
              }
              if (reasoning) {
                yield { content: undefined, reasoning, done: false };
              }
            }

            if (choice?.finish_reason && choice.finish_reason !== null) {
              yield { done: true };
              return;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      // Flush remaining buffer
      if (buffer.trim() && buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
        try {
          const data: StreamChunk = JSON.parse(buffer.trim().slice(6));
          const delta = data.choices?.[0]?.delta;
          if (delta?.content) {
            yield { content: delta.content, done: false };
          }
        } catch { /* ignore */ }
      }

      if (!hasYieldedContent) {
        yield { done: true, error: 'Model returned no content. Try again.' };
        return;
      }

      yield { done: true };
    } catch (err) {
      yield { done: true, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private formatMessages(messages: Message[], systemPrompt?: string): Array<{ role: string; content: string }> {
    const formatted: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      if (!msg.content?.trim()) continue; // skip empty messages
      formatted.push({ role: msg.role, content: msg.content });
    }

    return formatted;
  }

  async chatCompletion(
    messages: Message[],
    model: AIModel,
    systemPrompt?: string,
    agent?: Agent | null
  ): Promise<{ content: string; reasoning?: string; error?: string }> {
    const formattedMessages = this.formatMessages(messages, systemPrompt);

    try {
      const response = await fetch(`${TOGETHER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(this.buildRequestBody(formattedMessages, model, agent, false)),
      });

      if (!response.ok) {
        const error = await response.text();
        return { content: '', error: `API Error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      return {
        content: message?.content || '',
        reasoning: message?.reasoning_content || message?.reasoning || '',
      };
    } catch (err) {
      return { content: '', error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
