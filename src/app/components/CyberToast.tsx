"use client";

import { useEffect, useState } from 'react';
import { CheckCircle2, XOctagon, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

const updateListeners = () => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  const id = crypto.randomUUID();
  toasts.push({ id, message, type });
  updateListeners();
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    updateListeners();
  }, 5000);
};

const dismissToast = (id: string) => {
  toasts = toasts.filter(t => t.id !== id);
  updateListeners();
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const isSuccess = toast.type === 'success';
  
  return (
    <div 
      className={`
        relative overflow-hidden transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Main toast container */}
      <div className={`
        relative bg-black/90 backdrop-blur-sm border-l-2 p-4 min-w-[320px] max-w-[400px]
        ${isSuccess ? 'border-[#00f0ff]' : 'border-[#ff003c]'}
      `}>
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 crt-lines" />
        
        {/* Corner accents */}
        <div className={`absolute top-0 right-0 w-3 h-3 border-t border-r ${isSuccess ? 'border-[#00f0ff]/70' : 'border-[#ff003c]/70'}`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b border-l ${isSuccess ? 'border-[#00f0ff]/70' : 'border-[#ff003c]/70'}`} />
        
        {/* Status label */}
        <div className={`
          absolute top-0 left-0 px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase font-mono
          ${isSuccess ? 'bg-[#00f0ff]/20 text-[#00f0ff] border-b border-r border-[#00f0ff]/30' : 'bg-[#ff003c]/20 text-[#ff003c] border-b border-r border-[#ff003c]/30'}
        `}>
          {isSuccess ? 'SYS.OK' : 'SYS.ERR'}
        </div>
        
        <div className="flex items-start gap-3 pt-4">
          {/* Icon */}
          <div className={`
            p-2 border flex-shrink-0
            ${isSuccess 
              ? 'border-[#00f0ff]/50 bg-[#00f0ff]/10' 
              : 'border-[#ff003c]/50 bg-[#ff003c]/10'}
          `}>
            {isSuccess 
              ? <CheckCircle2 className="w-5 h-5 text-[#00f0ff]" />
              : <XOctagon className="w-5 h-5 text-[#ff003c]" />
            }
          </div>
          
          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className={`
              text-sm font-mono leading-relaxed
              ${isSuccess ? 'text-[#00f0ff]/90' : 'text-[#ff003c]/90'}
            `}>
              {toast.message}
            </p>
          </div>
          
          {/* Dismiss button */}
          <button 
            onClick={onDismiss}
            className={`
              p-1 transition-all opacity-50 hover:opacity-100 flex-shrink-0
              ${isSuccess ? 'text-[#00f0ff] hover:bg-[#00f0ff]/20' : 'text-[#ff003c] hover:bg-[#ff003c]/20'}
            `}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div 
            className={`
              h-full animate-[shrink_5s_linear_forwards]
              ${isSuccess ? 'bg-[#00f0ff]' : 'bg-[#ff003c]'}
            `}
          />
        </div>
        
        {/* Decorative stripes */}
        <div className="absolute bottom-1 right-2 flex gap-0.5 opacity-30">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-0.5 transform -skew-x-[45deg] ${isSuccess ? 'bg-[#00f0ff]' : 'bg-[#ff003c]'}`}
            />
          ))}
        </div>
      </div>
      
      {/* Glow effect */}
      <div className={`
        absolute inset-0 pointer-events-none opacity-30 blur-xl -z-10
        ${isSuccess ? 'bg-[#00f0ff]/20' : 'bg-[#ff003c]/20'}
      `} />
    </div>
  );
}

export function CyberToastContainer() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setActiveToasts(newToasts);
    };
    toastListeners.push(listener);
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
      {activeToasts.map(toast => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onDismiss={() => dismissToast(toast.id)} 
        />
      ))}
    </div>
  );
}
