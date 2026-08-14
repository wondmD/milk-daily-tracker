'use client';

import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import { Calendar, DollarSign, Text } from 'lucide-react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

const ExpenseSchema = Yup.object().shape({
  category: Yup.string().required('Category is required'),
  amount: Yup.number().positive('Must be positive').required('Amount is required'),
  ethiopian_date: Yup.string().required('Date is required'),
  description: Yup.string().required('Description is required'),
});

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: any;
}

export default function ExpenseModal({ isOpen, onClose, expense }: ExpenseModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(expense);

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const [year, month, day] = values.ethiopian_date.split('-').map(Number);
      const payload = { ...values, ethiopian_year: year, ethiopian_month: month, ethiopian_day: day };
      
      if (isEdit) {
        return fetchApi(`/expenses/${expense.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return fetchApi('/expenses/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      showSuccess(isEdit ? 'Expense updated successfully!' : 'Expense recorded successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to save expense record.');
    }
  });

  const getTodayEthiopian = () => {
    const now = EthDateTime.now();
    return `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.date).padStart(2, '0')}`;
  };

  const initialValues = expense || {
    category: 'FUEL',
    amount: '',
    ethiopian_date: getTodayEthiopian(),
    description: '',
    payment_method: 'CASH',
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? 'Edit Expense' : 'Record Expense'}
      description={isEdit ? 'Update details for this expense.' : 'Log operational costs to keep financials accurate.'}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={ExpenseSchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Expense Details</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                <Field 
                  as="select"
                  name="category" 
                  className={`block w-full rounded-[10px] border ${
                    errors.category && touched.category 
                      ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' 
                      : 'border-border focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50'
                  } pl-3 pr-8 py-2.5 text-sm transition-colors duration-200 outline-none`}
                >
                  <option value="FUEL">Fuel</option>
                  <option value="TRANSPORTATION">Transportation</option>
                  <option value="WORKER_PAYMENT">Worker Payment</option>
                  <option value="VEHICLE_MAINTENANCE">Vehicle Maintenance</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="RENT">Rent</option>
                  <option value="OTHER">Other</option>
                </Field>
                {errors.category && touched.category && (
                  <div className="mt-1.5 text-sm text-danger font-medium">{String(errors.category)}</div>
                )}
              </div>

              <FormInput 
                name="amount" 
                label="Amount (ETB)" 
                type="number" 
                icon={<DollarSign className="h-4 w-4" />}
              />

              <FormInput 
                name="ethiopian_date" 
                label="Date (YYYY-MM-DD)" 
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>

            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Description</h4>
              <FormInput 
                name="description" 
                label="What was this expense for?" 
                icon={<Text className="h-4 w-4" />}
                placeholder="e.g., Bought 20L diesel for truck..."
              />
              
              <div className="mb-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
                <Field 
                  as="select"
                  name="payment_method" 
                  className="block w-full rounded-[10px] border border-border focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50 pl-3 pr-8 py-2.5 text-sm transition-colors duration-200 outline-none bg-surface"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money (Telebirr, etc.)</option>
                </Field>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting || mutation.isPending}
              >
                {isEdit ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
