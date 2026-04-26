'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Loader2, Brain, X, FileText, Image as ImageIcon } from 'lucide-react';
import { ModelSelector } from './model-selector';
import { useAgentStore } from '@/lib/agent-store';

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string; // for text files
  dataUrl?: string; // for images
}

export function ChatInput({ onSend }: { onSend: (message: string, files?: AttachedFile[]) => void }) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoading, agentMode, toggleAgentMode } = useAgentStore();

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if ((!trimmed && attachedFiles.length === 0) || isLoading) return;
    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isLoading, onSend, attachedFiles]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      const id = Math.random().toString(36).substring(2, 10);
      const attached: AttachedFile = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // Read file content
      if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataUrl(file);
        attached.dataUrl = dataUrl;
      } else {
        const content = await readFileAsText(file);
        attached.content = content;
      }

      newFiles.push(attached);
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="border-t border-white/5 px-2 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3 safe-bottom" style={{ backgroundColor: 'hsl(60, 2.7%, 14.5%)' }}>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/10 shadow-lg transition-shadow focus-within:border-white/20 focus-within:shadow-xl" style={{ backgroundColor: 'hsl(30, 3.3%, 11.8%)' }}>
          {/* Model selector row + Agent toggle */}
          <div className="flex items-center justify-between border-b border-white/5 px-2 sm:px-3 py-1.5">
            <ModelSelector />
            <button
              onClick={toggleAgentMode}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs transition-colors ${
                agentMode
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                  : 'text-white/40 hover:bg-white/10 hover:text-white/70'
              }`}
              title={agentMode ? 'Agent mode ON - Uses tools to complete tasks' : 'Chat mode - Direct conversation'}
            >
              <Brain className={`h-3.5 w-3.5 ${agentMode ? 'text-orange-400' : ''}`} />
              <span className="hidden xs:inline sm:inline">{agentMode ? 'Agent' : 'Chat'}</span>
            </button>
          </div>

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-white/5 px-3 py-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
                >
                  {file.type.startsWith('image/') ? (
                    <div className="relative h-8 w-8 overflow-hidden rounded">
                      {file.dataUrl && (
                        <img src={file.dataUrl} alt={file.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                  ) : (
                    <FileText className="h-4 w-4 text-white/30" />
                  )}
                  <span className="max-w-[120px] truncate text-[11px] text-white/60">{file.name}</span>
                  <span className="text-[10px] text-white/25">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="rounded p-0.5 text-white/20 transition-colors hover:bg-white/10 hover:text-white/60"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="flex items-end gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.css,.html,.xml,.yaml,.yml,.toml,.env,.sh,.bash,.sql,.go,.rs,.java,.rb,.php,.swift,.kt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Message 01 11 AI..."
              rows={1}
              className="chat-textarea flex-1 resize-none bg-transparent text-sm text-white/90 placeholder-white/30 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && attachedFiles.length === 0 || isLoading}
              className="shrink-0 rounded-lg p-2 text-white/30 transition-all hover:bg-white/10 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <p className="mt-1.5 sm:mt-2 text-center text-[10px] sm:text-xs text-white/25">
          01 11 AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}

// Helper: read file as text
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Helper: read file as data URL (for images)
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export type { AttachedFile };
