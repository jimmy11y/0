'use client';

import { ReactNode, useState, useCallback } from 'react';
import { X, Minus, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MacWindowProps {
  title: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  visible?: boolean;
}

export function MacWindow({
  title,
  children,
  className,
  onClose,
  onMinimize,
  onMaximize,
  visible = true,
}: MacWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleMaximize = useCallback(() => {
    setIsMaximized(!isMaximized);
    onMaximize?.();
  }, [isMaximized, onMaximize]);

  if (!visible) return null;

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 shadow-2xl transition-all duration-200',
        isMaximized ? 'w-full' : '',
        className
      )}
      style={{ backgroundColor: '#1e1e1e' }}
    >
      {/* Title bar */}
      <div className="flex items-center border-b border-white/10 px-4 py-2.5 select-none">
        {/* Traffic light buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="group/btn flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f56] transition-all hover:brightness-110 active:brightness-90"
            title="Close"
          >
            <X className={`h-[7px] w-[7px] text-black/60 transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          <button
            onClick={onMinimize}
            className="group/btn flex h-3 w-3 items-center justify-center rounded-full bg-[#ffbd2e] transition-all hover:brightness-110 active:brightness-90"
            title="Minimize"
          >
            <Minus className={`h-[7px] w-[7px] text-black/60 transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          <button
            onClick={handleMaximize}
            className="group/btn flex h-3 w-3 items-center justify-center rounded-full bg-[#27c93f] transition-all hover:brightness-110 active:brightness-90"
            title="Maximize"
          >
            <Maximize2 className={`h-[7px] w-[7px] text-black/60 transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 text-center">
          <span className="text-xs font-medium text-white/50">{title}</span>
        </div>

        {/* Spacer to balance the traffic lights */}
        <div className="w-14" />
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
