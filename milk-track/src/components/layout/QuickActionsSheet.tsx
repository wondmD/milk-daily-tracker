'use client';

import { 
  Droplets, 
  Truck, 
  Receipt,
  Wallet,
  X
} from 'lucide-react';
import Link from 'next/link';

interface QuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickActionsSheet({ isOpen, onClose }: QuickActionsSheetProps) {
  
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out p-6 pb-safe">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-surface-secondary text-muted hover:bg-border hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link 
            href="/collections" 
            onClick={onClose}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-info-subtle text-info hover:opacity-80 transition-opacity"
          >
            <Droplets className="h-8 w-8 mb-2" />
            <span className="text-sm font-semibold">Record Collection</span>
          </Link>

          <Link 
            href="/distributions" 
            onClick={onClose}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-success-subtle text-success hover:opacity-80 transition-opacity"
          >
            <Truck className="h-8 w-8 mb-2" />
            <span className="text-sm font-semibold">Record Delivery</span>
          </Link>

          <Link 
            href="/expenses" 
            onClick={onClose}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-danger-subtle text-danger hover:opacity-80 transition-opacity"
          >
            <Receipt className="h-8 w-8 mb-2" />
            <span className="text-sm font-semibold">Log Expense</span>
          </Link>

          <Link 
            href="/settlements" 
            onClick={onClose}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-warning-subtle text-warning hover:opacity-80 transition-opacity"
          >
            <Wallet className="h-8 w-8 mb-2" />
            <span className="text-sm font-semibold">Settle Period</span>
          </Link>
        </div>
      </div>
    </>
  );
}
