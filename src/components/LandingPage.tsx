import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, Zap, Shield, Cpu } from 'lucide-react';

export default function LandingPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAppStore((state) => state.login);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length < 1) {
      setError('Enter access key');
      return;
    }
    const success = login(password);
    if (!success) {
      setError('Invalid access key');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold text-lg tracking-tighter">
              01
            </div>
            <div className="w-10 h-10 border border-white/20 text-white flex items-center justify-center font-bold text-lg tracking-tighter">
              11
            </div>
          </div>
          <h1 className="text-2xl font-medium text-white tracking-tight">0111</h1>
          <p className="text-white/40 text-sm mt-2 tracking-wide">Multi-Model AI Interface</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              type="password"
              placeholder="Enter access key"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="h-12 pl-11 pr-4 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25
                focus:border-white/30 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0
                rounded-none text-sm tracking-wide"
            />
          </div>
          {error && (
            <p className="text-red-400/80 text-xs tracking-wide">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full h-12 bg-white text-black hover:bg-white/90 rounded-none font-medium text-sm tracking-wide
              transition-all duration-200"
          >
            Access Interface
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 border border-white/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white/50" />
            </div>
            <p className="text-white/30 text-[10px] tracking-wider uppercase">5 Models</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 border border-white/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white/50" />
            </div>
            <p className="text-white/30 text-[10px] tracking-wider uppercase">Streaming</p>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-2 border border-white/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white/50" />
            </div>
            <p className="text-white/30 text-[10px] tracking-wider uppercase">Secure</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-white/15 text-[10px] tracking-widest uppercase">Powered by Together AI</p>
      </div>
    </div>
  );
}
