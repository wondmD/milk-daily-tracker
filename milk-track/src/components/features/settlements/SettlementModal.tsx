'use client';

import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { createSettlementPeriod } from '@/services/settlements';
import { showSuccess, showError } from '@/lib/toast';
import { Calendar, Hash } from 'lucide-react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

const PeriodSchema = Yup.object().shape({
  ethiopian_year: Yup.number().required('Required'),
  ethiopian_month: Yup.number().min(1).max(13).required('Required'),
  period_number: Yup.number().oneOf([1, 2], 'Must be 1 or 2').required('Required'),
  start_date_ethiopian: Yup.string().required('Required'),
  end_date_ethiopian: Yup.string().required('Required'),
});

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettlementModal({ isOpen, onClose }: SettlementModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        status: 'OPEN'
      };
      return createSettlementPeriod(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement-periods'] });
      showSuccess('Settlement period created successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to create settlement period.');
    }
  });

  const now = EthDateTime.now();

  const initialValues = {
    ethiopian_year: now.year,
    ethiopian_month: now.month,
    period_number: now.date <= 15 ? 1 : 2,
    start_date_ethiopian: `${now.year}-${String(now.month).padStart(2, '0')}-${now.date <= 15 ? '01' : '16'}`,
    end_date_ethiopian: `${now.year}-${String(now.month).padStart(2, '0')}-${now.date <= 15 ? '15' : '30'}`,
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create Settlement Period"
      description="Open a new 15-day period for billing and payouts."
    >
      <Formik
        initialValues={initialValues}
        validationSchema={PeriodSchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Period Identifier</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormInput 
                  name="ethiopian_year" 
                  label="Year" 
                  type="number" 
                  icon={<Calendar className="h-4 w-4 text-muted" />}
                />
                <FormInput 
                  name="ethiopian_month" 
                  label="Month (1-13)" 
                  type="number" 
                  icon={<Calendar className="h-4 w-4 text-muted" />}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">Period Segment</label>
                <Field 
                  as="select"
                  name="period_number" 
                  className={`block w-full rounded-[10px] border ${
                    errors.period_number && touched.period_number 
                      ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' 
                      : 'border-border focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50'
                  } pl-3 pr-8 py-2.5 text-sm transition-colors duration-200 outline-none`}
                >
                  <option value={1}>First Half (Days 1-15)</option>
                  <option value={2}>Second Half (Days 16-30)</option>
                </Field>
                {errors.period_number && touched.period_number && (
                  <div className="mt-1.5 text-sm text-danger font-medium">{String(errors.period_number)}</div>
                )}
              </div>
            </div>

            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Date Range</h4>
              
              <FormInput 
                name="start_date_ethiopian" 
                label="Start Date (YYYY-MM-DD)" 
                icon={<Calendar className="h-4 w-4 text-primary" />}
              />

              <FormInput 
                name="end_date_ethiopian" 
                label="End Date (YYYY-MM-DD)" 
                icon={<Calendar className="h-4 w-4 text-info" />}
              />
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
                leftIcon={<Hash className="h-4 w-4" />}
                isLoading={isSubmitting || mutation.isPending}
              >
                Create Period
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
