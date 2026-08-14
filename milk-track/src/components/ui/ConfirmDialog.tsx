'use client';

import { AlertTriangle, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}: ConfirmDialogProps) {
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onClose : undefined}
      />
      
      <div className="relative z-50 w-full max-w-sm rounded-[20px] bg-surface shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 p-3 rounded-full ${isDestructive ? 'bg-danger-subtle' : 'bg-primary-light/30'}`}>
              <AlertTriangle className={`h-6 w-6 ${isDestructive ? 'text-danger' : 'text-primary'}`} />
            </div>
            
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-secondary px-6 py-4 flex items-center justify-end gap-3 border-t border-border">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
