'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/agent/sidebar';
import { ChatInterface } from '@/components/agent/chat-interface';
import { AuthScreen } from '@/components/agent/auth-screen';

const AUTH_KEY = '01-11-ai-auth';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    // Check if already authenticated in this session
    const authStatus = sessionStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleAuthenticated = () => {
    sessionStorage.setItem(AUTH_KEY, 'true');
    setIsAuthenticated(true);
    // Small delay for transition
    setTimeout(() => {
      setShowApp(true);
    }, 100);
  };

  // Show nothing while checking auth
  if (isChecking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ backgroundColor: '#1a1714' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-400" />
      </div>
    );
  }

  return (
    <>
      {/* Auth Screen */}
      <AnimatePresence>
        {!isAuthenticated && (
          <AuthScreen onAuthenticated={handleAuthenticated} />
        )}
      </AnimatePresence>

      {/* Main App */}
      <AnimatePresence>
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showApp ? 1 : 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="agent-dark flex h-screen w-screen overflow-hidden"
            style={{ backgroundColor: 'hsl(60, 2.7%, 14.5%)' }}
          >
            <Sidebar />
            <ChatInterface />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
