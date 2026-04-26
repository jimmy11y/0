'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Lock, ShieldCheck } from 'lucide-react';

// Secure password verification using Web Crypto API
// Password hash: SHA-256("2099" + "01_11_salt_x7k") computed at build time
const EXPECTED_HASH = 'b263bcf0051adda629352bb7c36e0f799ab05ec8efc4e3acd235ca1dc9884233';
const SALT = '01_11_salt_x7k';

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const array = Array.from(new Uint8Array(buffer));
  return array.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(input: string): Promise<boolean> {
  if (!input || input.length === 0) return false;
  try {
    const hash = await computeHash(input + SALT);
    return hash === EXPECTED_HASH;
  } catch {
    return false;
  }
}

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if already authenticated
  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem('0111_auth');
      if (isAuth === 'true') {
        onAuthenticated();
      }
    } catch {}
  }, [onAuthenticated]);

  const handleSubmit = useCallback(async () => {
    if (isVerifying) return;
    setIsVerifying(true);

    try {
      const result = await verifyPassword(password);

      if (result) {
        setIsSuccess(true);
        setError('');
        try {
          sessionStorage.setItem('0111_auth', 'true');
        } catch {}
        setTimeout(() => {
          onAuthenticated();
        }, 800);
      } else {
        setError('Authentication failed. Please try again.');
        setIsShaking(true);
        setAttempts(prev => prev + 1);
        setTimeout(() => {
          setIsShaking(false);
          setPassword('');
        }, 600);
      }
    } catch {
      setError('Verification error occurred.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPassword('');
      }, 600);
    } finally {
      setIsVerifying(false);
    }
  }, [password, onAuthenticated, isVerifying]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="auth-screen fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1714] via-[#1c1917] to-[#0f0d0b]" />

      {/* Animated gradient orbs - Claude style */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] px-6"
      >
        {/* Logo + Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-10 flex flex-col items-center"
        >
          <div className="auth-logo-container mb-5">
            <div className="auth-logo-inner">
              <span className="text-lg font-bold text-white tracking-tight">01</span>
            </div>
            <div className="auth-logo-glow" />
          </div>

          <h1 className="text-2xl font-semibold text-white/90 tracking-tight mb-2">
            01 11 AI
          </h1>

          <p className="text-sm text-white/40 text-center leading-relaxed">
            Enter password to access
          </p>
        </motion.div>

        {/* Password card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className={`
            auth-card
            ${isShaking ? 'auth-shake' : ''}
            ${isSuccess ? 'auth-success' : ''}
          `}
        >
          {/* Lock icon */}
          <div className="mb-5 flex justify-center">
            <motion.div
              animate={isSuccess ? { scale: [1, 1.3, 1], rotate: [0, 0, 0] } : {}}
              transition={{ duration: 0.5 }}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-500 ${
                isSuccess
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : error
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-orange-500/10 text-orange-400/70'
              }`}
            >
              {isSuccess ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-4.5 w-4.5" />}
            </motion.div>
          </div>

          {/* Input field */}
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter password"
              disabled={isSuccess || isVerifying}
              autoComplete="off"
              className="auth-input"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-eye-btn"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 overflow-hidden"
              >
                <p className="text-xs text-red-400/80 text-center">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!password || isSuccess || isVerifying}
            className="auth-submit-btn"
          >
            <span className="flex items-center justify-center gap-2">
              {isVerifying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Verifying...</span>
                </>
              ) : isSuccess ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Authenticated</span>
                </>
              ) : (
                <>
                  <span>Unlock</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </span>
          </button>
        </motion.div>

        {/* Footer hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-[11px] text-white/20">
            Protected by 01 11 AI Security
          </p>
          {attempts > 2 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1.5 text-[11px] text-amber-400/40"
            >
              Multiple failed attempts detected
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
