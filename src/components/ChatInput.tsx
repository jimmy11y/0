import { useState, useRef, useCallback } from 'react';
import type { Attachment } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X, File } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || disabled) return;
    onSend(input, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          expiresAt: Date.now() + 30 * 60 * 1000,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="space-y-2">
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className={`flex items-center gap-2 px-2 py-1 border text-xs ${
                isDark
                  ? 'bg-white/[0.06] border-white/[0.10] text-white/50'
                  : 'bg-[#1a1a1a]/[0.05] border-[#1a1a1a]/[0.12] text-[#1a1a1a]/50'
              }`}
            >
              <File className={`w-3 h-3 ${isDark ? 'text-white/40' : 'text-[#1a1a1a]/40'}`} />
              <span className="truncate max-w-[150px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className={isDark ? 'text-white/30 hover:text-red-400/80' : 'text-[#1a1a1a]/30 hover:text-red-500/70'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className={`flex items-end gap-2 border p-3 ${
        isDark
          ? 'border-white/[0.10] bg-white/[0.03]'
          : 'border-[#1a1a1a]/[0.12] bg-white/50'
      }`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 flex-shrink-0 ${
            isDark
              ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
              : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/[0.06]'
          }`}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Processing...' : 'Message...'}
          disabled={disabled}
          className={`flex-1 bg-transparent border-none outline-none text-sm resize-none min-h-[24px] max-h-[200px] py-0.5 ${
            isDark
              ? 'text-white/70 placeholder:text-white/20'
              : 'text-[#1a1a1a]/70 placeholder:text-[#1a1a1a]/30'
          }`}
          rows={1}
        />

        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
            isDark
              ? 'text-white/40 hover:text-white hover:bg-white/[0.08]'
              : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/[0.08]'
          }`}
          onClick={handleSend}
          disabled={disabled || (!input.trim() && attachments.length === 0)}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-between">
        <p className={`text-[10px] tracking-wider ${isDark ? 'text-white/15' : 'text-[#1a1a1a]/20'}`}>
          {attachments.length > 0 ? 'Attachments expire in 30 min' : ''}
        </p>
        <p className={`text-[10px] tracking-wider ${isDark ? 'text-white/15' : 'text-[#1a1a1a]/20'}`}>
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
