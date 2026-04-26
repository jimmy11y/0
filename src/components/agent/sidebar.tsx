'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  MessageSquare,
  FolderKanban,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, chatSessions, newChat, currentChatId, setCurrentChatId, deleteChatSession } = useAgentStore();
  const [activeNav, setActiveNav] = useState<'chats' | 'projects'>('chats');
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
        className="fixed left-0 top-0 z-40 h-screen overflow-hidden border-r border-white/10 md:relative md:z-auto"
        style={{ backgroundColor: 'hsl(30, 3.3%, 11.8%)' }}
      >
        <div className="flex h-full w-72 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-white/80">01 11 AI</span>
            <button
              onClick={toggleSidebar}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-3 pb-2">
            <button
              onClick={() => {
                newChat();
                // Close sidebar on mobile after creating new chat
                if (window.innerWidth < 768) {
                  toggleSidebar();
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                <Plus className="h-3.5 w-3.5" />
              </div>
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/70">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search chats...</span>
              <span className="ml-auto text-[10px] text-white/20 hidden sm:inline">⌘K</span>
            </button>
          </div>

          {/* Navigation tabs */}
          <div className="px-3 pb-2">
            <div className="flex gap-1 rounded-lg bg-white/5 p-1">
              <button
                onClick={() => setActiveNav('chats')}
                className={`flex-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeNav === 'chats'
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
                Chats
              </button>
              <button
                onClick={() => setActiveNav('projects')}
                className={`flex-1 rounded-md px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeNav === 'projects'
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <FolderKanban className="mr-1 inline h-3.5 w-3.5" />
                Projects
              </button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto agent-scrollbar px-3">
            {chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="mb-3 h-8 w-8 text-white/20" />
                <p className="text-sm text-white/40">Your chats will show up here</p>
                <p className="mt-1 text-xs text-white/25">
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
                        // Close sidebar on mobile when selecting a chat
                        if (window.innerWidth < 768) {
                          toggleSidebar();
                        }
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        currentChatId === session.id
                          ? 'bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="truncate flex-1">{session.title}</span>
                    </button>
                    {/* Delete button - appears on hover (desktop) or always visible (mobile) */}
                    {(hoveredSession === session.id || 'ontouchstart' in window) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(session.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                        title="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-[10px] font-bold text-white">
                01
              </div>
              <span className="text-xs text-white/40">01 11 AI</span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-3 top-3 z-30 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 md:relative md:left-auto md:top-auto"
          style={{ backgroundColor: 'hsl(30, 3.3%, 11.8%)' }}
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
