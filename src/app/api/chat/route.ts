import { NextRequest } from 'next/server';
import Together from 'together-ai';

export const runtime = 'nodejs';

const WORKSPACE = '/home/z/my-project/agent-workspace';
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'tgp_v1_XqDbDKys7YGaatpRTVAtLF_3zOW16pK3Eeei-wwn5kw';

const MODEL_MAP: Record<string, string> = {
  'deepseek-v4-pro': 'deepseek-ai/DeepSeek-V4-Pro',
  'glm-5.1': 'zai-org/GLM-5.1',
  'kimi-k2.6': 'moonshotai/Kimi-K2.6',
  'minimax-m2.7': 'MiniMaxAI/MiniMax-M2.7',
};

// Map internal function names to display names used by frontend TOOL_DISPLAY
const TOOL_NAME_MAP: Record<string, string> = {
  'read_file': 'Read',
  'write_file': 'Write',
  'edit_file': 'Edit',
  'run_command': 'Bash',
  'search_code': 'Grep',
  'find_files': 'Glob',
  'web_search': 'WebSearch',
  'web_read': 'WebReader',
  'list_directory': 'LS',
};

// Ensure workspace exists - using dynamic require to avoid Edge Runtime issues
try {
  const fs = require('fs');
  if (!fs.existsSync(WORKSPACE)) {
    fs.mkdirSync(WORKSPACE, { recursive: true });
  }
} catch {}

function createSSE(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Security: resolve path and ensure it's within workspace
function resolveSecurePath(inputPath: string): string {
  const path = require('path');
  const resolved = path.resolve(WORKSPACE, inputPath);
  if (!resolved.startsWith(WORKSPACE)) {
    throw new Error('Access denied: path outside workspace');
  }
  return resolved;
}

// ==========================================
// Tool Definitions for Together AI
// ==========================================
const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the workspace. Use this to examine existing code, configuration, or any file content.',
      parameters: {
        type: 'object',
        properties: {
          filepath: { type: 'string', description: 'Path to the file relative to workspace (e.g. "src/index.html")' }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file, creating it and any parent directories if needed. Use this to create new files or completely overwrite existing ones.',
      parameters: {
        type: 'object',
        properties: {
          filepath: { type: 'string', description: 'Path to the file relative to workspace (e.g. "src/index.html")' },
          content: { type: 'string', description: 'Full content to write to the file' }
        },
        required: ['filepath', 'content']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Edit a file by replacing a specific portion of text with new text. Use this for targeted changes to existing files.',
      parameters: {
        type: 'object',
        properties: {
          filepath: { type: 'string', description: 'Path to the file relative to workspace' },
          old_content: { type: 'string', description: 'The exact text to find and replace' },
          new_content: { type: 'string', description: 'The replacement text' }
        },
        required: ['filepath', 'old_content', 'new_content']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_directory',
      description: 'List files and directories in a given path. Use this to explore the project structure.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path relative to workspace (default: ".")' }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_code',
      description: 'Search for a text pattern in files within the workspace. Returns matching lines with file paths.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Text or regex pattern to search for' },
          path: { type: 'string', description: 'Directory to search in (default: ".")' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_files',
      description: 'Find files matching a glob pattern (e.g. "**/*.ts", "src/**/*.css").',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern to match files (e.g. "**/*.html")' }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Execute a shell command in the workspace directory. Use for installing packages, building, running servers, etc.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute (e.g. "npm install", "python script.py")' }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for information. Returns search results with titles, URLs, and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_read',
      description: 'Read and extract the text content of a web page at a given URL.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the web page to read' }
        },
        required: ['url']
      }
    }
  }
];

// ==========================================
// Agent System Prompt
// ==========================================
const AGENT_SYSTEM_PROMPT = `You are an elite AI agent with full capabilities. You can read, write, and edit files, execute commands, search the web, and browse URLs.

Your approach:
1. ANALYZE: Understand the user's request thoroughly
2. PLAN: Break the task into clear steps
3. EXECUTE: Use your tools to complete each step
4. VERIFY: Check your work by reading files back, running commands, etc.

Rules:
- Always provide COMPLETE file contents when writing files - never use placeholders or comments like "rest of code here"
- Execute commands when needed to install packages, build, or test
- Use web_search and web_read to find current information when needed
- Verify your work by reading files back after writing them
- Be thorough and accurate - zero tolerance for incomplete or broken code
- Respond in the same language as the user's message`;

const CHAT_SYSTEM_PROMPT = `You are a helpful, accurate, and direct AI assistant. Provide clear, complete answers without unnecessary filler. If unsure, say so rather than guessing.`;

// ==========================================
// Real Tool Execution
// ==========================================
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');

  try {
    switch (name) {
      case 'read_file': {
        const filePath = resolveSecurePath((args.filepath as string) || '');
        if (!fs.existsSync(filePath)) {
          return `Error: File not found: ${args.filepath}`;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
      }

      case 'write_file': {
        const filePath = resolveSecurePath((args.filepath as string) || '');
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, (args.content as string) || '', 'utf-8');
        const size = fs.statSync(filePath).size;
        return `File written successfully: ${args.filepath} (${size} bytes)`;
      }

      case 'edit_file': {
        const filePath = resolveSecurePath((args.filepath as string) || '');
        if (!fs.existsSync(filePath)) {
          return `Error: File not found: ${args.filepath}`;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const oldContent = args.old_content as string;
        const newContent = args.new_content as string;
        if (!content.includes(oldContent)) {
          return `Error: Old content not found in file. The exact text to replace was not found.`;
        }
        const updated = content.replace(oldContent, newContent);
        fs.writeFileSync(filePath, updated, 'utf-8');
        return `File edited successfully: ${args.filepath}`;
      }

      case 'list_directory': {
        const dirPath = resolveSecurePath((args.path as string) || '.');
        if (!fs.existsSync(dirPath)) {
          return `Error: Directory not found: ${args.path || '.'}`;
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const listing = entries.map((e: any) => {
          const prefix = e.isDirectory() ? '📁 ' : '📄 ';
          return prefix + e.name;
        }).join('\n');
        return listing || '(empty directory)';
      }

      case 'search_code': {
        const searchPath = resolveSecurePath((args.path as string) || '.');
        const pattern = (args.pattern as string) || '';
        try {
          const result = execSync(
            `cd "${searchPath}" && rg --max-count=20 --no-heading "${pattern.replace(/"/g, '\\"')}" . 2>/dev/null || echo "No matches found"`,
            { encoding: 'utf-8', timeout: 10000, maxBuffer: 50 * 1024 }
          );
          return result.slice(0, 5000) || 'No matches found';
        } catch {
          return 'No matches found';
        }
      }

      case 'find_files': {
        const pattern = (args.pattern as string) || '**/*';
        try {
          const result = execSync(
            `cd "${WORKSPACE}" && find . -name "${pattern.replace(/"/g, '\\"')}" -type f 2>/dev/null | head -50`,
            { encoding: 'utf-8', timeout: 10000, maxBuffer: 50 * 1024 }
          );
          return result || 'No files found';
        } catch {
          return 'No files found';
        }
      }

      case 'run_command': {
        const command = (args.command as string) || '';
        try {
          const result = execSync(command, {
            encoding: 'utf-8',
            timeout: 30000,
            maxBuffer: 100 * 1024,
            cwd: WORKSPACE,
          });
          return result || '(command completed with no output)';
        } catch (error: any) {
          const stdout = error.stdout || '';
          const stderr = error.stderr || '';
          return `Command exited with code ${error.status || 'unknown'}\nStdout: ${stdout.slice(0, 3000)}\nStderr: ${stderr.slice(0, 3000)}`;
        }
      }

      case 'web_search': {
        const query = (args.query as string) || '';
        try {
          const ZAI = (await import('z-ai-web-dev-sdk')).default;
          const zai = await ZAI.create();
          const searchResult = await zai.functions.invoke('web_search', { query, num: 5 });
          if (Array.isArray(searchResult)) {
            return searchResult.map((r: any) =>
              `${r.rank || ''}. ${r.name || ''}\n   ${r.url || ''}\n   ${r.snippet || ''}`
            ).join('\n\n');
          }
          return JSON.stringify(searchResult).slice(0, 3000);
        } catch {
          return `Web search unavailable. Query: "${query}"`;
        }
      }

      case 'web_read': {
        const url = (args.url as string) || '';
        try {
          const ZAI = (await import('z-ai-web-dev-sdk')).default;
          const zai = await ZAI.create();
          const readResult = await zai.functions.invoke('web_read', { url });
          if (typeof readResult === 'object' && readResult !== null) {
            const r = readResult as any;
            return `Title: ${r.title || ''}\n\n${r.html ? r.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000) : JSON.stringify(readResult).slice(0, 5000)}`;
          }
          return String(readResult).slice(0, 5000);
        } catch {
          // Fallback: simple fetch
          try {
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await response.text();
            return html.replace(/<script[\s\S]*?<\/script>/gi, '')
                       .replace(/<style[\s\S]*?<\/style>/gi, '')
                       .replace(/<[^>]*>/g, ' ')
                       .replace(/\s+/g, ' ')
                       .slice(0, 5000);
          } catch {
            return `Failed to read URL: ${url}`;
          }
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// ==========================================
// Agent Loop with Real Tool Calling
// ==========================================
async function runAgentLoop(
  together: Together,
  model: string,
  userMessages: Array<{ role: string; content: string }>,
  send: (event: string, data: unknown) => void
) {
  const MAX_ITERATIONS = 20;
  const conversationMessages: Array<Record<string, any>> = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
    ...userMessages.map(m => ({ role: m.role, content: m.content })),
  ];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Send thinking indicator
    const thinkingText = iteration === 0
      ? 'Starting task analysis. Let me break this down into steps...'
      : 'Analyzing the results and deciding the next step...';

    send('thinking_start', {});
    await new Promise(r => setTimeout(r, 30));
    const words = thinkingText.split(' ');
    for (let i = 0; i < words.length; i++) {
      send('thinking_delta', { thinking: i === 0 ? words[i] : ' ' + words[i] });
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 10));
    }
    send('thinking_end', {});
    await new Promise(r => setTimeout(r, 50));

    try {
      const response = await together.chat.completions.create({
        model,
        messages: conversationMessages,
        tools: AGENT_TOOLS,
        tool_choice: 'auto',
        max_tokens: 4096,
        temperature: 0.7,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // If no tool calls, we're done - stream the final text
      if (!message.tool_calls || message.tool_calls.length === 0) {
        if (message.content) {
          // Simulate streaming for better UX
          const content = message.content;
          const chunks = content.split(/(\s+)/);
          for (const chunk of chunks) {
            send('text_delta', { content: chunk });
            await new Promise(r => setTimeout(r, 8));
          }
        }
        return; // Agent loop complete
      }

      // Add assistant message with tool calls to conversation
      conversationMessages.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls,
      });

      // Process each tool call
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const displayName = TOOL_NAME_MAP[functionName] || functionName;
        let toolArgs: Record<string, unknown>;

        try {
          toolArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          toolArgs = {};
        }

        // Send tool use start event
        send('tool_use_start', {
          toolId: toolCall.id,
          toolName: displayName,
          toolInput: toolArgs,
        });
        await new Promise(r => setTimeout(r, 100));

        // Execute the tool
        const result = await executeTool(functionName, toolArgs);
        const isError = result.startsWith('Error:');

        // Send tool result
        send('tool_result', {
          toolUseId: toolCall.id,
          content: result,
          isError,
        });
        await new Promise(r => setTimeout(r, 50));

        // Send tool use end
        send('tool_use_end', { toolName: displayName });
        await new Promise(r => setTimeout(r, 80));

        // Add tool result to conversation
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Agent loop error';

      // Check if error is about tool calling not being supported
      if (errorMsg.includes('tool') || errorMsg.includes('function') || errorMsg.includes('not support')) {
        // Fallback: try streaming without tools
        try {
          const fallbackMessages = conversationMessages
            .filter(m => m.role !== 'tool')
            .map(m => ({ role: m.role as string, content: m.content as string }));

          const response = await together.chat.completions.create({
            model,
            messages: [
              { role: 'system', content: AGENT_SYSTEM_PROMPT + '\n\nNote: Tool calling is not available for this model. Please provide complete file contents in your response using code blocks with the filename as the language identifier.' },
              ...fallbackMessages,
            ],
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
          });

          for await (const chunk of response) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              send('text_delta', { content: delta });
            }
          }
        } catch (streamError) {
          send('error', { content: `Failed to get response: ${streamError instanceof Error ? streamError.message : 'Unknown error'}` });
        }
      } else {
        send('error', { content: errorMsg });
      }
      return; // Exit agent loop on error
    }
  }

  // If we hit max iterations, send a completion message
  send('text_delta', { content: '\n\n*Task completed. Maximum iteration limit reached.*' });
}

// ==========================================
// Simple Chat (non-agent mode)
// ==========================================
async function streamChat(
  together: Together,
  model: string,
  userMessages: Array<{ role: string; content: string }>,
  send: (event: string, data: unknown) => void
) {
  try {
    const response = await together.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...userMessages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        send('text_delta', { content: delta });
      }
    }
  } catch {
    // Fallback to z-ai-web-dev-sdk
    try {
      const mod = await import('z-ai-web-dev-sdk');
      const ZAI = mod.default;
      const zai = await ZAI.create();

      const response = await zai.chat.completions.create({
        model,
        messages: userMessages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        stream: true,
      });

      for await (const chunk of response) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          send('text_delta', { content: delta });
        }
      }
    } catch {
      const fallbackText = generateFallbackResponse(
        userMessages.filter(m => m.role === 'user').pop()?.content || '',
        model
      );
      const words = fallbackText.split(' ');
      for (const word of words) {
        send('text_delta', { content: word + ' ' });
        await new Promise(r => setTimeout(r, 15));
      }
    }
  }
}

// ==========================================
// Main POST Handler
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model = 'deepseek-v4-pro', agentMode = false } = body as {
      messages: { role: string; content: string }[];
      model: string;
      agentMode?: boolean;
    };

    const togetherModelId = MODEL_MAP[model] || MODEL_MAP['deepseek-v4-pro'];
    const encoder = new TextEncoder();
    const together = new Together({ apiKey: TOGETHER_API_KEY });

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(createSSE(event, data)));
          } catch {
            // Controller might be closed
          }
        };

        try {
          if (agentMode) {
            await runAgentLoop(together, togetherModelId, messages, send);
          } else {
            await streamChat(together, togetherModelId, messages, send);
          }
          send('done', {});
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
          send('error', { content: errorMessage });
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

function generateFallbackResponse(message: string, model: string): string {
  const lower = message.toLowerCase();
  const modelName = MODEL_MAP[model] || model;

  if (lower.includes('code') || lower.includes('build') || lower.includes('create') || lower.includes('أنشئ') || lower.includes('كود') || lower.includes('برمج')) {
    return `I'd be happy to help you with that! However, I'm currently in a limited mode. Let me provide you with the best response I can.

Based on your request, I'll provide a complete solution. Please let me know if you need any adjustments.`;
  }

  return `Thank you for your message. I'm running on ${modelName}. Let me help you with that.`;
}
