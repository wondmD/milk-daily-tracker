import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  settlementId?: number; // If provided, it's a payment. If null, it's an advance.
  type: 'PAYMENT' | 'ADVANCE';
  maxAmount?: number;
}

export default function PaymentModal({ isOpen, onClose, supplierId, settlementId, type, maxAmount }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const now = EthDateTime.now();
      const dateStr = `${now.date}/${now.month}/${now.year}`;
      
      if (type === 'PAYMENT') {
        return fetchApi('/payments/', {
          method: 'POST',
          body: JSON.stringify({
            payment_type: 'SUPPLIER_PAYMENT',
            related_settlement_id: settlementId,
            amount,
            payment_method: method,
            ethiopian_payment_date: dateStr,
            notes,
          }),
        });
      } else {
        return fetchApi('/supplier-advances/', {
          method: 'POST',
          body: JSON.stringify({
            supplier: supplierId,
            amount,
            ethiopian_date: dateStr,
            notes,
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_history', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onClose();
      setAmount('');
      setNotes('');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-md rounded-[20px] shadow-xl border border-border p-6 relative">
        <h2 className="text-xl font-bold text-foreground mb-6">
          {type === 'PAYMENT' ? 'Record Settlement Payment' : 'Record Supplier Advance (Loan)'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Amount (ETB)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={maxAmount ? `Max: ${maxAmount}` : "0.00"}
              max={maxAmount}
            />
          </div>
          
          {type === 'PAYMENT' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="TELEBIRR">Telebirr</option>
                <option value="CBE_BIRR">CBE Birr</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={() => mutation.mutate()} 
            isLoading={mutation.isPending}
            disabled={!amount || Number(amount) <= 0 || (maxAmount !== undefined ? Number(amount) > maxAmount : false)}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
