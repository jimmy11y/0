import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  PanelLeftClose,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    renameConversation,
    logout,
    selectedModel,
    models,
    theme,
  } = useAppStore();

  const isDark = theme === 'dark';
  const currentModel = models.find((m) => m.id === selectedModel);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const cls = {
    bg: isDark ? 'bg-[#0a0a0a]' : 'bg-[#e8e4de]',
    border: isDark ? 'border-white/[0.06]' : 'border-[#d4cfc8]',
    logo1: isDark ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white',
    logo2: isDark ? 'border-white/20 text-white' : 'border-[#1a1a1a]/30 text-[#1a1a1a]',
    brand: isDark ? 'text-white/60' : 'text-[#1a1a1a]/50',
    btn: isDark
      ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70 hover:text-white border-white/[0.08]'
      : 'bg-[#1a1a1a]/[0.06] hover:bg-[#1a1a1a]/[0.12] text-[#1a1a1a]/60 hover:text-[#1a1a1a] border-[#1a1a1a]/[0.10]',
    convActive: isDark ? 'bg-white/[0.06]' : 'bg-[#1a1a1a]/[0.07]',
    convHover: isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#1a1a1a]/[0.04]',
    convText: isDark ? 'text-white/50' : 'text-[#1a1a1a]/55',
    convIcon: isDark ? 'text-white/30' : 'text-[#1a1a1a]/30',
    editInput: isDark ? 'text-white/70' : 'text-[#1a1a1a]/70',
    actionBtn: isDark ? 'text-white/30 hover:text-white/60' : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60',
    empty: isDark ? 'text-white/20' : 'text-[#1a1a1a]/25',
    labelText: isDark ? 'text-white/30' : 'text-[#1a1a1a]/35',
    valueText: isDark ? 'text-white/50' : 'text-[#1a1a1a]/50',
    logoutBtn: isDark
      ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
      : 'text-[#1a1a1a]/30 hover:text-[#1a1a1a]/60 hover:bg-[#1a1a1a]/[0.04]',
  };

  return (
    <div className={`h-full flex flex-col ${cls.bg}`}>
      {/* Top Bar */}
      <div className={`flex items-center justify-between p-3 border-b ${cls.border}`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold ${cls.logo1}`}>
              01
            </div>
            <div className={`w-6 h-6 border flex items-center justify-center text-[10px] font-bold ${cls.logo2}`}>
              11
            </div>
          </div>
          <span className={`text-xs tracking-wider ${cls.brand}`}>0111</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${cls.actionBtn}`}
          onClick={onClose}
        >
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={() => createConversation()}
          className={`w-full h-9 border rounded-none text-xs tracking-wide font-normal ${cls.btn}`}
        >
          <Plus className="w-3.5 h-3.5 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <p className={`text-xs ${cls.empty}`}>No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-2 py-2 cursor-pointer transition-colors ${
                  conv.id === currentConversationId ? cls.convActive : cls.convHover
                }`}
                onClick={() => setCurrentConversation(conv.id)}
              >
                <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${cls.convIcon}`} />
                <div className="flex-1 min-w-0">
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => {
                        if (editTitle.trim()) renameConversation(conv.id, editTitle.trim());
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editTitle.trim()) renameConversation(conv.id, editTitle.trim());
                          setEditingId(null);
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className={`w-full bg-transparent text-xs outline-none border-none p-0 ${cls.editInput}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p className={`text-xs truncate ${cls.convText}`}>{conv.title}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(conv.id);
                      setEditTitle(conv.title);
                    }}
                    className={`p-1 ${cls.actionBtn}`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className={`p-1 ${isDark ? 'text-white/30 hover:text-red-400/80' : 'text-[#1a1a1a]/30 hover:text-red-500/70'}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`border-t p-3 space-y-3 ${cls.border}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] tracking-wider uppercase ${cls.labelText}`}>Active Model</span>
          <span className={`text-[10px] ${cls.valueText}`}>{currentModel?.name || 'Unknown'}</span>
        </div>
        <Button
          onClick={logout}
          variant="ghost"
          className={`w-full h-8 text-xs tracking-wide ${cls.logoutBtn}`}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Exit
        </Button>
      </div>
    </div>
  );
}
