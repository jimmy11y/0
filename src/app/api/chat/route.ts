import { NextRequest } from 'next/server';
import Together from 'together-ai';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export const runtime = 'nodejs';

const WORKSPACE = process.env.VERCEL ? '/tmp/agent-workspace' : (process.env.AGENT_WORKSPACE || '/tmp/agent-workspace');
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'tgp_v1_XqDbDKys7YGaatpRTVAtLF_3zOW16pK3Eeei-wwn5kw';

const MODEL_MAP: Record<string, string> = {
  'deepseek-v4-pro': 'deepseek-ai/DeepSeek-V4-Pro',
  'glm-5.1': 'zai-org/GLM-5.1',
  'kimi-k2.6': 'moonshotai/Kimi-K2.6',
  'minimax-m2.7': 'MiniMaxAI/MiniMax-M2.7',
};

// Models that support native structured tool calling via Together API
const NATIVE_TOOL_MODELS = new Set(['deepseek-ai/DeepSeek-V4-Pro']);

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

function ensureWorkspace() {
  try {
    if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE, { recursive: true });
  } catch {}
}

function createSSE(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function resolveSecurePath(inputPath: string): string {
  const resolved = path.resolve(WORKSPACE, inputPath);
  if (!resolved.startsWith(WORKSPACE)) throw new Error('Access denied: path outside workspace');
  return resolved;
}

// ============================================================
// CORE FIX: XML Tool Call Parser
// Handles ALL model formats that output tool calls as text:
//   GLM 5.1:     <tool_call>{"name":"write_file","arguments":{...}}</tool_call>
//   Kimi K2.6:   <tool_call>{"name":"...","arguments":{...}}</tool_call>
//   MiniMax:     <tool_call>...</tool_call>
//   DeepSeek:    <|DSML|>tool_name\nargs
//   Generic:     ```json\n{"function":"name","parameters":{...}}\n```
// ============================================================

interface ParsedToolCall {
  name: string;
  args: Record<string, unknown>;
  raw: string; // the full matched text to strip from output
}

function parseXMLToolCalls(text: string): ParsedToolCall[] {
  const results: ParsedToolCall[] = [];

  // Pattern 1: <tool_call>JSON</tool_call> (GLM, Kimi, MiniMax style)
  const xmlPattern = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match;
  while ((match = xmlPattern.exec(text)) !== null) {
    try {
      const json = match[1].trim();
      const parsed = JSON.parse(json);
      const name = parsed.name || parsed.function || parsed.tool;
      const args = parsed.arguments || parsed.parameters || parsed.args || parsed.input || {};
      if (name && typeof name === 'string') {
        results.push({ name, args, raw: match[0] });
      }
    } catch {
      // Try extracting name and args separately
      try {
        const nameMatch = /"name"\s*:\s*"([^"]+)"/.exec(match[1]);
        const argsMatch = /"arguments"\s*:\s*(\{[\s\S]*?\})(?=\s*[,}])/.exec(match[1]);
        if (nameMatch) {
          const args = argsMatch ? JSON.parse(argsMatch[1]) : {};
          results.push({ name: nameMatch[1], args, raw: match[0] });
        }
      } catch {}
    }
  }

  // Pattern 2: <|DSML|>function_calls\n<invoke name="...">...</invoke> (DeepSeek XML variant)
  const dsmlPattern = /<\|DSML\|>[\s\S]*?<invoke\s+name="([^"]+)">([\s\S]*?)<\/invoke>/gi;
  while ((match = dsmlPattern.exec(text)) !== null) {
    try {
      const name = match[1];
      const argsText = match[2];
      const args: Record<string, unknown> = {};
      const argPattern = /<(\w+)>([\s\S]*?)<\/\1>/gi;
      let argMatch;
      while ((argMatch = argPattern.exec(argsText)) !== null) {
        args[argMatch[1]] = argMatch[2].trim();
      }
      results.push({ name, args, raw: match[0] });
    } catch {}
  }

  // Pattern 3: ```json\n{"function":"name","parameters":{...}}\n``` (markdown code block style)
  const mdPattern = /```(?:json|tool_call|function)?\s*\n?\s*(\{[\s\S]*?\})\s*\n?```/gi;
  while ((match = mdPattern.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const name = parsed.function || parsed.tool || parsed.name || parsed.action;
      const args = parsed.parameters || parsed.arguments || parsed.args || parsed.input || {};
      if (name && TOOL_NAME_MAP[name]) {
        results.push({ name, args, raw: match[0] });
      }
    } catch {}
  }

  // Pattern 4: Plain JSON on its own line matching known tool names
  // {"name": "write_file", "arguments": {"filepath": "...", "content": "..."}}
  const jsonLinePattern = /^\s*\{"(?:name|function|tool)"\s*:\s*"(\w+)"[\s\S]*?\}\s*$/gm;
  while ((match = jsonLinePattern.exec(text)) !== null) {
    if (results.some(r => r.raw === match![0])) continue; // already parsed
    try {
      const parsed = JSON.parse(match[0].trim());
      const name = parsed.name || parsed.function || parsed.tool;
      const args = parsed.arguments || parsed.parameters || parsed.args || {};
      if (name && TOOL_NAME_MAP[name]) {
        results.push({ name, args, raw: match[0] });
      }
    } catch {}
  }

  return results;
}

// Strip all tool call XML/markers from text to get clean prose
function stripToolCallsFromText(text: string): string {
  let clean = text;
  // Remove <tool_call>...</tool_call>
  clean = clean.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '');
  // Remove <|DSML|> blocks
  clean = clean.replace(/<\|DSML\|>[\s\S]*?(?=<\|DSML\|>|$)/g, '');
  // Remove DeepSeek XML invoke blocks
  clean = clean.replace(/<invoke[\s\S]*?<\/invoke>/gi, '');
  clean = clean.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '');
  // Remove JSON tool call code blocks
  clean = clean.replace(/```(?:json|tool_call|function)\s*\n[\s\S]*?\n```/gi, '');
  // Remove raw JSON lines that are tool calls
  clean = clean.replace(/^\s*\{"(?:name|function|tool)"\s*:\s*"(?:write_file|read_file|edit_file|run_command|list_directory|search_code|find_files|web_search|web_read)"[\s\S]*?\}\s*$/gm, '');
  // Remove fullwidth pipe variants
  clean = clean.replace(/＜\|[^＞]*\|＞[\s\S]*?(?=＜\||$)/g, '');
  // Collapse excess newlines
  clean = clean.replace(/\n{3,}/g, '\n\n').trim();
  return clean;
}

// ============================================================
// Streaming XML Interceptor
// Buffers the stream and detects tool call patterns in real-time
// Without this, tool call XML leaks into the chat text
// ============================================================
class StreamingXMLInterceptor {
  private buffer = '';
  private inToolCall = false;
  private toolCallBuffer = '';
  private readonly OPEN_TAG = '<tool_call>';
  private readonly CLOSE_TAG = '</tool_call>';
  public pendingToolCalls: ParsedToolCall[] = [];

  // Process a new chunk. Returns the clean text to display (if any).
  processChunk(chunk: string): string {
    this.buffer += chunk;
    let output = '';

    while (this.buffer.length > 0) {
      if (this.inToolCall) {
        const closeIdx = this.buffer.indexOf(this.CLOSE_TAG);
        if (closeIdx !== -1) {
          // Found end of tool call
          this.toolCallBuffer += this.buffer.slice(0, closeIdx);
          this.buffer = this.buffer.slice(closeIdx + this.CLOSE_TAG.length);
          this.inToolCall = false;
          // Parse the buffered tool call
          const calls = parseXMLToolCalls(`<tool_call>${this.toolCallBuffer}</tool_call>`);
          this.pendingToolCalls.push(...calls);
          this.toolCallBuffer = '';
        } else {
          // Still inside tool call — buffer everything
          this.toolCallBuffer += this.buffer;
          this.buffer = '';
        }
      } else {
        const openIdx = this.buffer.indexOf(this.OPEN_TAG);
        if (openIdx !== -1) {
          // Found start of tool call — output text before it
          output += this.buffer.slice(0, openIdx);
          this.buffer = this.buffer.slice(openIdx + this.OPEN_TAG.length);
          this.inToolCall = true;
          this.toolCallBuffer = '';
        } else {
          // No tool call tag — but might be partial tag at end
          const partialMatch = this.findPartialTag();
          if (partialMatch > 0) {
            // Safe to output up to possible partial tag
            output += this.buffer.slice(0, partialMatch);
            this.buffer = this.buffer.slice(partialMatch);
          } else {
            // No partial match — output everything
            output += this.buffer;
            this.buffer = '';
          }
        }
      }
    }

    return output;
  }

  private findPartialTag(): number {
    // Check if buffer ends with a partial <tool_call> open tag
    const tag = this.OPEN_TAG;
    for (let len = Math.min(tag.length - 1, this.buffer.length); len > 0; len--) {
      if (tag.startsWith(this.buffer.slice(-len))) {
        return this.buffer.length - len;
      }
    }
    return -1; // no partial, return -1 (but we use 0 to mean "no safe cutoff")
  }

  // Flush remaining buffer at stream end
  flush(): { text: string; toolCalls: ParsedToolCall[] } {
    let text = this.buffer;
    if (this.toolCallBuffer) {
      // Incomplete tool call at end — treat as text (shouldn't happen)
      text += this.toolCallBuffer;
    }
    const cleanText = stripToolCallsFromText(text);
    return { text: cleanText, toolCalls: this.pendingToolCalls };
  }
}

// ============================================================
// File system helpers
// ============================================================
function listDirRecursive(dirPath: string, prefix = '', depth = 0, maxDepth = 3): string {
  if (depth > maxDepth) return prefix + '... (max depth reached)\n';
  let result = '';
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && depth > 0) continue;
      const icon = entry.isDirectory() ? '📁 ' : '📄 ';
      result += prefix + icon + entry.name + '\n';
      if (entry.isDirectory()) {
        result += listDirRecursive(path.join(dirPath, entry.name), prefix + '  ', depth + 1, maxDepth);
      }
    }
  } catch { result += prefix + '(error reading directory)\n'; }
  return result;
}

function searchInFiles(searchPath: string, pattern: string, maxResults = 20): string {
  const results: string[] = [];
  const regex = new RegExp(pattern, 'i');
  function searchDir(dirPath: string, depth = 0) {
    if (depth > 5 || results.length >= maxResults) return;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath, depth + 1);
        } else {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length && results.length < maxResults; i++) {
              if (regex.test(lines[i])) {
                results.push(`${path.relative(WORKSPACE, fullPath)}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
              }
            }
          } catch {}
        }
      }
    } catch {}
  }
  searchDir(searchPath);
  return results.length > 0 ? results.join('\n') : 'No matches found';
}

function findFilesByGlob(basePath: string, pattern: string, maxResults = 50): string {
  const results: string[] = [];
  const globRegex = new RegExp('^' + pattern
    .replace(/\*\*/g, '<<<G>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<G>>>/g, '.*')
    .replace(/\?/g, '[^/]')
    .replace(/\./g, '\\.') + '$');
  function walkDir(dirPath: string, depth = 0) {
    if (depth > 8 || results.length >= maxResults) return;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.relative(basePath, fullPath);
        if (entry.isDirectory()) walkDir(fullPath, depth + 1);
        else if (globRegex.test(relPath) || globRegex.test(entry.name)) results.push(relPath);
      }
    } catch {}
  }
  walkDir(basePath);
  return results.length > 0 ? results.join('\n') : 'No files found matching pattern';
}

// ============================================================
// Tool Definitions (for native tool calling models)
// ============================================================
const AGENT_TOOLS = [
  { type: 'function' as const, function: { name: 'read_file', description: 'Read the contents of a file from the workspace.', parameters: { type: 'object', properties: { filepath: { type: 'string', description: 'Path to the file relative to workspace' } }, required: ['filepath'] } } },
  { type: 'function' as const, function: { name: 'write_file', description: 'Write content to a file, creating it and any parent directories if needed.', parameters: { type: 'object', properties: { filepath: { type: 'string', description: 'Path to the file relative to workspace' }, content: { type: 'string', description: 'Full content to write to the file' } }, required: ['filepath', 'content'] } } },
  { type: 'function' as const, function: { name: 'edit_file', description: 'Edit a file by replacing specific text.', parameters: { type: 'object', properties: { filepath: { type: 'string' }, old_content: { type: 'string', description: 'Exact text to replace' }, new_content: { type: 'string', description: 'Replacement text' } }, required: ['filepath', 'old_content', 'new_content'] } } },
  { type: 'function' as const, function: { name: 'list_directory', description: 'List files and directories.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Directory path (default: ".")' } }, required: [] } } },
  { type: 'function' as const, function: { name: 'search_code', description: 'Search for a pattern in files.', parameters: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } } },
  { type: 'function' as const, function: { name: 'find_files', description: 'Find files matching a glob pattern.', parameters: { type: 'object', properties: { pattern: { type: 'string', description: 'Glob pattern e.g. "**/*.html"' } }, required: ['pattern'] } } },
  { type: 'function' as const, function: { name: 'run_command', description: 'Execute a shell command in the workspace directory.', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } },
  { type: 'function' as const, function: { name: 'web_search', description: 'Search the web for information.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function' as const, function: { name: 'web_read', description: 'Read the content of a web page.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
];

// ============================================================
// System Prompts
// ============================================================
const AGENT_SYSTEM_PROMPT = `You are an elite AI agent with full capabilities. You can read, write, and edit files, execute commands, search the web, and browse URLs.

Your approach:
1. ANALYZE: Understand the user's request thoroughly
2. PLAN: Break the task into clear steps
3. EXECUTE: Use your tools to complete each step
4. VERIFY: Check your work by reading files back, running commands, etc.

Rules:
- Always provide COMPLETE file contents when writing files - never use placeholders
- Execute commands when needed to install packages, build, or test
- Use web_search and web_read to find current information when needed
- Be thorough and accurate - zero tolerance for incomplete or broken code
- Respond in the same language as the user's message`;

// System prompt for models that use XML tool calling format
const XML_TOOL_SYSTEM_PROMPT = `You are an elite AI agent. You have access to tools to read/write files, run commands, and search the web.

To use a tool, output EXACTLY this format (nothing else on those lines):
<tool_call>{"name": "TOOL_NAME", "arguments": {ARGS_JSON}}</tool_call>

Available tools:
- write_file: {"filepath": "path/to/file", "content": "full file content here"}
- read_file: {"filepath": "path/to/file"}
- edit_file: {"filepath": "path", "old_content": "text to find", "new_content": "replacement"}
- list_directory: {"path": "."}
- run_command: {"command": "shell command"}
- search_code: {"pattern": "text to find", "path": "."}
- find_files: {"pattern": "**/*.html"}
- web_search: {"query": "search query"}
- web_read: {"url": "https://..."}

CRITICAL RULES:
1. Use ONE tool call at a time, then wait for the result before proceeding
2. Always write COMPLETE file contents - never truncate or use placeholders
3. After tool results, continue with next step or provide final answer
4. Never output raw XML or JSON outside of <tool_call> tags as chat text
5. Respond in the same language as the user's message`;

const CHAT_SYSTEM_PROMPT = `You are a helpful, accurate, and direct AI assistant. Provide clear, complete answers without unnecessary filler. If unsure, say so rather than guessing.`;

// ============================================================
// Tool Executor
// ============================================================
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  ensureWorkspace();
  try {
    switch (name) {
      case 'read_file': {
        const filePath = resolveSecurePath((args.filepath as string) || '');
        if (!fs.existsSync(filePath)) return `Error: File not found: ${args.filepath}`;
        return fs.readFileSync(filePath, 'utf-8');
      }
      case 'write_file': {
        const filePath = resolveSecurePath((args.filepath as string) || '');
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, (args.content as string) || '', 'utf-8');
        const size = fs.statSync(filePath).size;
        return `File written successfully: ${args.filepath} (${size} bytes)`;
      }
      case 'edit_file': {
        const filePath = resolveSecurePath((args.filepath as string) || '');
        if (!fs.existsSync(filePath)) return `Error: File not found: ${args.filepath}`;
        const content = fs.readFileSync(filePath, 'utf-8');
        const oldContent = args.old_content as string;
        if (!content.includes(oldContent)) return `Error: Old content not found in file.`;
        fs.writeFileSync(filePath, content.replace(oldContent, args.new_content as string), 'utf-8');
        return `File edited successfully: ${args.filepath}`;
      }
      case 'list_directory': {
        const inputPath = (args.path as string) || '.';
        const dirPath = resolveSecurePath(inputPath);
        if (!fs.existsSync(dirPath)) return `Workspace is empty. No files have been created yet.`;
        if (!fs.statSync(dirPath).isDirectory()) return `Error: Not a directory: ${inputPath}`;
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        if (entries.length === 0) return '(empty directory)';
        return entries.map(e => (e.isDirectory() ? '📁 ' : '📄 ') + e.name).join('\n');
      }
      case 'search_code': {
        const searchPath = resolveSecurePath((args.path as string) || '.');
        if (!fs.existsSync(searchPath)) return 'No matches found (workspace may be empty)';
        return searchInFiles(searchPath, (args.pattern as string) || '');
      }
      case 'find_files': {
        if (!fs.existsSync(WORKSPACE)) return 'No files found (workspace is empty)';
        return findFilesByGlob(WORKSPACE, (args.pattern as string) || '**/*');
      }
      case 'run_command': {
        const command = (args.command as string) || '';
        try {
          const result = execSync(command, {
            encoding: 'utf-8', timeout: 30000,
            maxBuffer: 100 * 1024, cwd: WORKSPACE, shell: '/bin/sh',
          });
          return result || '(command completed with no output)';
        } catch (error: any) {
          const stdout = error.stdout || '';
          const stderr = error.stderr || '';
          if (stderr.includes('command not found') || stderr.includes('not recognized')) {
            return `Error: Command not available: ${command.split(' ')[0]}`;
          }
          return `Exit code ${error.status || 'unknown'}\nStdout: ${stdout.slice(0, 3000)}\nStderr: ${stderr.slice(0, 3000)}`;
        }
      }
      case 'web_search': {
        const query = (args.query as string) || '';
        try {
          const ZAI = (await import('z-ai-web-dev-sdk')).default;
          const zai = await ZAI.create();
          const searchResult = await zai.functions.invoke('web_search', { query, num: 5 });
          if (Array.isArray(searchResult)) {
            return searchResult.map((r: any) => `${r.rank || ''}. ${r.name || ''}\n   ${r.url || ''}\n   ${r.snippet || ''}`).join('\n\n');
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
          const result = await zai.functions.invoke('web_read', { url }) as any;
          if (typeof result === 'object' && result !== null) {
            return `Title: ${result.title || ''}\n\n${result.html ? result.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000) : JSON.stringify(result).slice(0, 5000)}`;
          }
          return String(result).slice(0, 5000);
        } catch {
          try {
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const html = await response.text();
            return html.replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 5000);
          } catch { return `Failed to read URL: ${url}`; }
        }
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    return `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// ============================================================
// NATIVE TOOL CALLING AGENT LOOP (DeepSeek V4 Pro)
// Uses Together AI's structured tool_calls — reliable
// ============================================================
async function runNativeToolLoop(
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
    // Show thinking indicator
    send('thinking_start', {});
    const thinkingText = iteration === 0
      ? 'Analyzing the request...'
      : 'Processing results, deciding next step...';
    for (const word of thinkingText.split(' ')) {
      send('thinking_delta', { thinking: ` ${word}` });
      await sleep(10);
    }
    send('thinking_end', {});
    await sleep(30);

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

    // No tool calls → final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (message.content) {
        const clean = stripToolCallsFromText(message.content);
        if (clean.trim()) {
          for (const chunk of clean.split(/(\s+)/)) {
            send('text_delta', { content: chunk });
            await sleep(6);
          }
        }
      }
      return;
    }

    // Record assistant turn with tool calls
    conversationMessages.push({
      role: 'assistant',
      content: message.content || '',
      tool_calls: message.tool_calls,
    });

    // Execute each tool
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      const displayName = TOOL_NAME_MAP[fnName] || fnName;
      let toolArgs: Record<string, unknown>;
      try { toolArgs = JSON.parse(toolCall.function.arguments || '{}'); }
      catch { toolArgs = {}; }

      const toolId = toolCall.id || `tool_${Date.now()}`;
      send('tool_use_start', { toolId, toolName: displayName, toolInput: toolArgs });
      await sleep(80);

      const result = await executeTool(fnName, toolArgs);
      const isError = result.startsWith('Error:');

      send('tool_use_end', { toolName: displayName });
      send('tool_result', { toolUseId: toolId, content: result, isError });
      await sleep(50);

      conversationMessages.push({ role: 'tool', tool_call_id: toolId, content: result });
    }
  }

  send('text_delta', { content: '\n\n*Task completed. Maximum iterations reached.*' });
}

// ============================================================
// XML STREAMING AGENT LOOP (GLM, Kimi, MiniMax, and any model
// that outputs tool calls as inline XML text)
// 
// Algorithm:
// 1. Stream the model response chunk by chunk
// 2. StreamingXMLInterceptor buffers <tool_call> tags in real-time
// 3. Clean text before <tool_call> is sent as text_delta events
// 4. Once </tool_call> is complete, parse & execute the tool
// 5. Feed result back to model and continue
// ============================================================
async function runXMLToolLoop(
  together: Together,
  model: string,
  userMessages: Array<{ role: string; content: string }>,
  send: (event: string, data: unknown) => void
) {
  const MAX_ITERATIONS = 20;
  const conversationMessages: Array<Record<string, any>> = [
    { role: 'system', content: XML_TOOL_SYSTEM_PROMPT },
    ...userMessages.map(m => ({ role: m.role, content: m.content })),
  ];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Show thinking indicator
    send('thinking_start', {});
    const thinkingText = iteration === 0
      ? 'Starting task analysis...'
      : 'Processing tool result, deciding next step...';
    for (const word of thinkingText.split(' ')) {
      send('thinking_delta', { thinking: ` ${word}` });
      await sleep(10);
    }
    send('thinking_end', {});
    await sleep(30);

    // Stream the response
    const stream = await together.chat.completions.create({
      model,
      messages: conversationMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
      // No tools parameter — model uses XML format
    });

    const interceptor = new StreamingXMLInterceptor();
    let fullResponseText = '';
    let activeToolId: string | null = null;
    let activeToolName: string | null = null;
    let lastTextBuffer = '';

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;

      fullResponseText += delta;

      // Process through XML interceptor
      const cleanText = interceptor.processChunk(delta);

      // Stream clean text as text_delta
      if (cleanText) {
        lastTextBuffer += cleanText;
        send('text_delta', { content: cleanText });
      }

      // Check for newly completed tool calls
      if (interceptor.pendingToolCalls.length > 0 &&
          interceptor.pendingToolCalls.length > (activeToolId ? 1 : 0)) {
        // Handle all new tool calls
        for (const toolCall of interceptor.pendingToolCalls) {
          if (activeToolId === toolCall.raw) continue; // already processed

          const fnName = toolCall.name;
          const displayName = TOOL_NAME_MAP[fnName] || fnName;
          const toolId = `xml_tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

          activeToolId = toolCall.raw;
          activeToolName = displayName;

          send('tool_use_start', { toolId, toolName: displayName, toolInput: toolCall.args });
          await sleep(80);

          const result = await executeTool(fnName, toolCall.args);
          const isError = result.startsWith('Error:');

          send('tool_use_end', { toolName: displayName });
          send('tool_result', { toolUseId: toolId, content: result, isError });
          await sleep(50);
        }
      }
    }

    // Flush remaining buffer
    const { text: finalText, toolCalls: finalToolCalls } = interceptor.flush();

    // Output any remaining clean text
    if (finalText && !lastTextBuffer.endsWith(finalText.slice(-20))) {
      const remaining = finalText.replace(lastTextBuffer, '');
      if (remaining.trim()) {
        send('text_delta', { content: remaining });
      }
    }

    // If no tool calls were found in this iteration → we're done
    if (interceptor.pendingToolCalls.length === 0 && finalToolCalls.length === 0) {
      return;
    }

    // Build context for next iteration: add assistant response + tool results
    const assistantContent = stripToolCallsFromText(fullResponseText);
    conversationMessages.push({
      role: 'assistant',
      content: assistantContent || fullResponseText,
    });

    // Add tool results as user message (XML models don't support tool role)
    const toolResults: string[] = [];
    for (const toolCall of [...interceptor.pendingToolCalls, ...finalToolCalls]) {
      const fnName = toolCall.name;
      const displayName = TOOL_NAME_MAP[fnName] || fnName;

      // Only execute tools that weren't already executed during streaming
      if (activeToolId !== toolCall.raw) {
        const toolId = `xml_tool_${Date.now()}`;
        send('tool_use_start', { toolId, toolName: displayName, toolInput: toolCall.args });
        await sleep(80);
        const result = await executeTool(fnName, toolCall.args);
        const isError = result.startsWith('Error:');
        send('tool_use_end', { toolName: displayName });
        send('tool_result', { toolUseId: toolId, content: result, isError });
        await sleep(50);
        toolResults.push(`Tool: ${fnName}\nResult: ${result.slice(0, 3000)}`);
      } else {
        // Already executed — just include result in context
        const lastResult = finalToolCalls.find(c => c.raw === toolCall.raw);
        if (!lastResult) toolResults.push(`Tool: ${fnName}\nStatus: executed`);
      }
    }

    if (toolResults.length > 0) {
      conversationMessages.push({
        role: 'user',
        content: `Tool execution results:\n\n${toolResults.join('\n\n---\n\n')}\n\nPlease continue with the task based on these results.`,
      });
    }
  }

  send('text_delta', { content: '\n\n*Task completed. Maximum iterations reached.*' });
}

// ============================================================
// Simple Chat (streaming, no tools)
// ============================================================
async function streamChat(
  together: Together,
  model: string,
  userMessages: Array<{ role: string; content: string }>,
  send: (event: string, data: unknown) => void
) {
  try {
    const stream = await together.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...userMessages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        const clean = stripToolCallsFromText(delta);
        if (clean) send('text_delta', { content: clean });
      }
    }
  } catch {
    // Fallback
    try {
      const mod = await import('z-ai-web-dev-sdk');
      const ZAI = mod.default;
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        model,
        messages: userMessages.map(m => ({ role: m.role as any, content: m.content })),
        stream: true,
      });
      for await (const chunk of response) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) send('text_delta', { content: delta });
      }
    } catch {
      const fallback = `I'm here to help! (Running in limited mode — please check API configuration)`;
      for (const word of fallback.split(' ')) {
        send('text_delta', { content: word + ' ' });
        await sleep(15);
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function generateFallbackResponse(message: string, model: string): string {
  return `I'm here to help. Please check the API configuration. (Model: ${model})`;
}

// ============================================================
// Main POST Handler
// ============================================================
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
          } catch {}
        };

        try {
          if (agentMode) {
            if (NATIVE_TOOL_MODELS.has(togetherModelId)) {
              // DeepSeek V4 Pro: native structured tool calling
              await runNativeToolLoop(together, togetherModelId, messages, send);
            } else {
              // GLM, Kimi, MiniMax: XML streaming interception
              await runXMLToolLoop(together, togetherModelId, messages, send);
            }
          } else {
            await streamChat(together, togetherModelId, messages, send);
          }
          send('done', {});
        } catch (error) {
          send('error', { content: error instanceof Error ? error.message : 'An unexpected error occurred' });
        } finally {
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
