'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Sidebar } from '@/components/agent/sidebar';
import { ChatInterface } from '@/components/agent/chat-interface';
import { AuthScreen } from '@/components/agent/auth-screen';

const AUTH_KEY = '01-11-ai-auth';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showApp, setShowApp] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const authStatus = sessionStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleAuthenticated = () => {
    sessionStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
    setTimeout(() => {
      setShowApp(true);
    }, 100);
  };

  const isLight = resolvedTheme === 'light';
  const agentClass = isLight ? 'agent-light' : 'agent-dark';

  if (isChecking) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center ${agentClass}`} style={{ backgroundColor: isLight ? '#faf9f7' : '#1a1714' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-400" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {!isAuthenticated && (
          <AuthScreen onAuthenticated={handleAuthenticated} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showApp ? 1 : 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`${agentClass} flex h-screen w-screen overflow-hidden`}
            style={{ backgroundColor: 'var(--agent-bg-100)' }}
          >
            <Sidebar />
            <ChatInterface />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
