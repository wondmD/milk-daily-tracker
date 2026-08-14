import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Trash2, Calendar, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

interface WastageFormData {
  quantity: number;
  reason: 'SPOILED' | 'SPILLED' | 'CONTAMINATED' | 'OTHER';
  notes: string;
}

export default function WastageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<WastageFormData>({
    quantity: 0,
    reason: 'SPOILED',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: WastageFormData) => {
      const now = EthDateTime.now();
      return fetchApi('/milk-wastage/', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          ethiopian_date: `${now.year}-${now.month}-${now.date}`,
          ethiopian_year: now.year,
          ethiopian_month: now.month,
          ethiopian_day: now.date
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
      showSuccess('Wastage logged successfully');
      setFormData({ quantity: 0, reason: 'SPOILED', notes: '' });
      onClose();
    },
    onError: () => {
      showError('Failed to log wastage. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.quantity || formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    mutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-surface rounded-[24px] shadow-[0_8px_40px_rgb(0,0,0,0.08)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-danger-subtle border border-danger/20 flex items-center justify-center shadow-sm">
              <Trash2 className="h-5 w-5 text-danger" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">Log Milk Wastage</h2>
              <p className="text-xs text-muted font-medium">Record spoiled, spilled, or contaminated milk.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-2 rounded-full hover:bg-surface-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="bg-warning-subtle/50 border border-warning/20 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning font-medium">Logging wastage will permanently deduct the quantity from your available inventory for today.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">Quantity Wasted (Liters)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
              placeholder="e.g. 5.5"
              className="w-full bg-surface border border-border rounded-[12px] px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground"
              required
            />
            {error && <p className="text-sm text-danger mt-1">{error}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">Reason</label>
            <select 
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value as any })}
              className="w-full bg-surface border border-border rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground"
              required
            >
              <option value="SPOILED">Spoiled / Sour</option>
              <option value="SPILLED">Spilled / Leaked</option>
              <option value="CONTAMINATED">Contaminated</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">Additional Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-surface border border-border rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground resize-none"
              rows={3}
              placeholder="Provide more context..."
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="danger" 
              className="flex-1 shadow-sm"
              isLoading={isSubmitting}
            >
              Log Wastage
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
