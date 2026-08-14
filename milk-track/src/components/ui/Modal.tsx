'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  description?: string;
}

export default function Modal({ isOpen, onClose, title, children, description }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 p-0">
      <div 
        className="fixed inset-0 bg-primary/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div 
        ref={modalRef}
        className="relative z-50 w-full sm:max-w-lg sm:rounded-[20px] bg-surface sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-border transition-all flex flex-col max-h-[100dvh] sm:max-h-[90vh]"
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 -mr-2 text-muted hover:bg-surface-secondary hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-border"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
