'use client';

/**
 * SkillsDisplay — Claude-style skill cards shown in chat
 * 
 * Claude triggers skills at the moment a relevant task arrives.
 * Here we mimic that by detecting skill-relevant tool calls and
 * showing a badge/card inline in the message flow.
 * 
 * Skills are shown:
 *  1. BEFORE tool execution: "Reading skill..." (loading state)
 *  2. AFTER tool execution: "Skill applied ✓" (done state)
 *  3. Never shown for pure chat messages
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { BookOpen, FileCode, BarChart2, FileText, Globe, Check, Loader2 } from 'lucide-react';

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'reading' | 'applied' | 'loading';
  trigger: string; // the tool name that triggered this skill
}

// Skill catalog — map tool names → relevant skill
const SKILL_MAP: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
  Read: {
    name: 'file-reading',
    description: 'Smart file reading with type detection',
    icon: <FileCode className="h-3 w-3" />,
  },
  Write: {
    name: 'docx / pdf / xlsx',
    description: 'Structured document creation skill',
    icon: <FileText className="h-3 w-3" />,
  },
  WebSearch: {
    name: 'web-search',
    description: 'Live web research & citation skill',
    icon: <Globe className="h-3 w-3" />,
  },
  WebReader: {
    name: 'web-fetch',
    description: 'Full-page content extraction',
    icon: <Globe className="h-3 w-3" />,
  },
  Bash: {
    name: 'computer-use',
    description: 'Bash command execution in sandbox',
    icon: <BarChart2 className="h-3 w-3" />,
  },
};

interface SkillBadgeProps {
  toolName: string;
  status: 'loading' | 'done';
}

export function SkillBadge({ toolName, status }: SkillBadgeProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const skill = SKILL_MAP[toolName];
  if (!skill) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-mono my-1 ${
          isLight
            ? 'border-black/[0.06] bg-black/[0.02] text-black/40'
            : 'border-white/[0.06] bg-white/[0.02] text-white/30'
        }`}
      >
        {status === 'loading' ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin text-orange-500/60" />
        ) : (
          <Check className="h-2.5 w-2.5 text-emerald-500/60" />
        )}
        <BookOpen className="h-2.5 w-2.5 opacity-50" />
        <span className="opacity-60">skill:</span>
        <span className={isLight ? 'text-black/60' : 'text-white/50'}>{skill.name}</span>
        {status === 'loading' && (
          <span className="animate-thinking-wave opacity-50">reading...</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
