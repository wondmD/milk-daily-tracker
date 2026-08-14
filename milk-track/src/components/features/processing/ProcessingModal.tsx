'use client';

import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { getProducts } from '@/services/processing';
import { showSuccess, showError } from '@/lib/toast';
import { Calendar, Droplets, Factory, Package } from 'lucide-react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';

const ProcessingSchema = Yup.object().shape({
  product: Yup.number().required('Product is required'),
  ethiopian_date: Yup.string().required('Date is required'),
  input_milk_quantity: Yup.number().positive('Must be positive').required('Milk input required'),
  output_quantity: Yup.number().positive('Must be positive').required('Product output required'),
});

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProcessingModal({ isOpen, onClose }: ProcessingModalProps) {
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const [year, month, day] = values.ethiopian_date.split('-').map(Number);
      const payload = { ...values, ethiopian_year: year, ethiopian_month: month, ethiopian_day: day };
      
      return fetchApi('/processing-batches/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-batches'] });
      queryClient.invalidateQueries({ queryKey: ['product-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation'] });
      showSuccess('Processing batch recorded successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to record processing batch.');
    }
  });

  const getTodayEthiopian = () => {
    const now = EthDateTime.now();
    return `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.date).padStart(2, '0')}`;
  };

  const initialValues = {
    product: '',
    ethiopian_date: getTodayEthiopian(),
    input_milk_quantity: '',
    output_quantity: '',
    processing_cost: 0,
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Record Processing Batch"
      description="Convert raw milk into dairy products."
    >
      <Formik
        initialValues={initialValues}
        validationSchema={ProcessingSchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Batch Details</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">Output Product</label>
                <Field 
                  as="select"
                  name="product" 
                  className={`block w-full rounded-[10px] border ${
                    errors.product && touched.product 
                      ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' 
                      : 'border-border focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50'
                  } pl-3 pr-8 py-2.5 text-sm transition-colors duration-200 outline-none`}
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </Field>
                {errors.product && touched.product && (
                  <div className="mt-1.5 text-sm text-danger font-medium">{String(errors.product)}</div>
                )}
              </div>

              <FormInput 
                name="ethiopian_date" 
                label="Date (YYYY-MM-DD)" 
                icon={<Calendar className="h-4 w-4" />}
              />
            </div>

            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Quantities</h4>
              
              <FormInput 
                name="input_milk_quantity" 
                label="Raw Milk Input (Liters)" 
                type="number" 
                icon={<Droplets className="h-4 w-4 text-primary" />}
              />

              <FormInput 
                name="output_quantity" 
                label="Final Product Output (Units)" 
                type="number" 
                icon={<Package className="h-4 w-4 text-info" />}
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
                leftIcon={<Factory className="h-4 w-4" />}
                isLoading={isSubmitting || mutation.isPending}
              >
                Start Batch
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
