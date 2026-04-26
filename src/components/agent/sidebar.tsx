'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Plus,
  Search,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, chatSessions, newChat, currentChatId, setCurrentChatId, deleteChatSession } = useAgentStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const isLight = resolvedTheme === 'light';

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 288 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={`fixed left-0 top-0 z-40 h-screen overflow-hidden md:relative md:z-auto ${isLight ? 'border-r border-black/[0.06]' : 'border-r border-white/10'}`}
        style={{ backgroundColor: 'var(--agent-bg-200)' }}
      >
        <div className="flex h-full w-72 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className={`text-sm font-semibold ${isLight ? 'text-black/80' : 'text-white/80'}`}>01 11 AI</span>
            <button
              onClick={toggleSidebar}
              className={`rounded-md p-1.5 transition-colors ${isLight ? 'text-black/50 hover:bg-black/5 hover:text-black/70' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-3 pb-2">
            <button
              onClick={() => {
                newChat();
                if (window.innerWidth < 768) {
                  toggleSidebar();
                }
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${isLight ? 'border border-black/[0.08] text-black/70 hover:bg-black/5 active:bg-black/[0.08]' : 'border border-white/10 text-white/80 hover:bg-white/10 active:bg-white/15'}`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>
                <Plus className="h-3.5 w-3.5" />
              </div>
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <button className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isLight ? 'text-black/40 hover:bg-black/5 hover:text-black/60' : 'text-white/50 hover:bg-white/5 hover:text-white/70'}`}>
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search chats...</span>
              <span className={`ml-auto text-[10px] hidden sm:inline ${isLight ? 'text-black/20' : 'text-white/20'}`}>⌘K</span>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto agent-scrollbar px-3">
            {chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className={`mb-3 h-8 w-8 ${isLight ? 'text-black/15' : 'text-white/20'}`} />
                <p className={`text-sm ${isLight ? 'text-black/40' : 'text-white/40'}`}>Your chats will show up here</p>
                <p className={`mt-1 text-xs ${isLight ? 'text-black/25' : 'text-white/25'}`}>
                  Start a new conversation to begin
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="group relative"
                    onMouseEnter={() => setHoveredSession(session.id)}
                    onMouseLeave={() => setHoveredSession(null)}
                  >
                    <button
                      onClick={() => {
                        setCurrentChatId(session.id);
                        if (window.innerWidth < 768) {
                          toggleSidebar();
                        }
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        currentChatId === session.id
                          ? isLight ? 'bg-black/[0.06] text-black/90' : 'bg-white/10 text-white'
                          : isLight ? 'text-black/60 hover:bg-black/[0.03]' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <MessageSquare className={`h-4 w-4 shrink-0 ${isLight ? 'text-black/30' : 'text-white/40'}`} />
                      <span className="truncate flex-1">{session.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-colors hover:bg-red-500/20 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 ${isLight ? 'text-black/25' : 'text-white/30'}`}
                      title="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section with theme toggle */}
          <div className={`p-3 ${isLight ? 'border-t border-black/[0.06]' : 'border-t border-white/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg px-2 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-[10px] font-bold text-white">
                  01
                </div>
                <span className={`text-xs ${isLight ? 'text-black/40' : 'text-white/40'}`}>01 11 AI</span>
              </div>
              <button
                onClick={() => setTheme(isLight ? 'dark' : 'light')}
                className={`rounded-lg p-2 transition-colors ${isLight ? 'text-black/40 hover:bg-black/5 hover:text-black/70' : 'text-white/40 hover:bg-white/10 hover:text-white/70'}`}
                title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className={`fixed left-3 top-3 z-30 rounded-lg p-2 transition-colors md:relative md:left-auto md:top-auto ${isLight ? 'text-black/50 hover:bg-black/5 hover:text-black/70' : 'text-white/50 hover:bg-white/10 hover:text-white/80'}`}
          style={{ backgroundColor: 'var(--agent-bg-200)' }}
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
