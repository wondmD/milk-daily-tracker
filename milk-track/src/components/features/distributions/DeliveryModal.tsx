'use client';

import { useMemo } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { getCustomers } from '@/services/customers';
import { getDeliveries } from '@/services/distributions';
import { showSuccess, showError } from '@/lib/toast';
import { Calendar, DollarSign, Truck, Lock } from 'lucide-react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { useTranslation } from '@/hooks/useTranslation';

const DeliverySchema = Yup.object().shape({
  customer: Yup.number().required('Customer is required'),
  ethiopian_date: Yup.string().required('Date is required'),
  delivered_quantity: Yup.number().min(0, 'Cannot be negative').required('Required'),
  price_per_liter: Yup.number().positive('Must be positive').required('Required'),
});

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery?: any;
}

export default function DeliveryModal({ isOpen, onClose, delivery }: DeliveryModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(delivery);
  const { t } = useTranslation();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: isOpen,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['distributions'],
    queryFn: getDeliveries,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const [year, month, day] = values.ethiopian_date.split('-').map(Number);
      const payload = { ...values, ethiopian_year: year, ethiopian_month: month, ethiopian_day: day };
      
      if (isEdit) {
        return fetchApi(`/milk-deliveries/${delivery.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return fetchApi('/milk-deliveries/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['customers_summary'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showSuccess(isEdit ? 'Delivery updated successfully!' : 'Delivery recorded successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to save delivery record.');
    }
  });

  const getTodayEthiopian = () => {
    const now = EthDateTime.now();
    return `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.date).padStart(2, '0')}`;
  };

  const initialValues = useMemo(() => {
    if (delivery) {
      return {
        ...delivery,
        ethiopian_date: `${delivery.ethiopian_year}-${String(delivery.ethiopian_month).padStart(2, '0')}-${String(delivery.ethiopian_day).padStart(2, '0')}`,
        customer: delivery.customer,
        delivered_quantity: delivery.delivered_quantity,
        price_per_liter: delivery.price_per_liter,
        admin_password: '',
      };
    }
    return {
      customer: '',
      ethiopian_date: getTodayEthiopian(),
      delivered_quantity: '',
      price_per_liter: '',
      admin_password: '',
    };
  }, [delivery]);

  const isPastRecord = (dateStr: string) => {
    return dateStr !== getTodayEthiopian();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? t('deliveryModal', 'editTitle') : t('deliveryModal', 'recordTitle')}
      description={isEdit ? t('deliveryModal', 'editDesc') : t('deliveryModal', 'recordDesc')}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={DeliverySchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting, setFieldValue, values, errors, touched }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">{t('deliveryModal', 'deliveryDetails')}</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('deliveryModal', 'customer')}</label>
                <Field 
                  as="select"
                  name="customer" 
                  className={`block w-full rounded-[10px] border ${
                    errors.customer && touched.customer 
                      ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' 
                      : 'border-border focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50'
                  } pl-3 pr-8 py-2.5 text-sm transition-colors duration-200 outline-none`}
                  onChange={(e: any) => {
                    setFieldValue('customer', e.target.value);
                    const selectedCustomer = customers.find(c => c.id === Number(e.target.value));
                    if (selectedCustomer) {
                      setFieldValue('price_per_liter', selectedCustomer.default_milk_price);
                    }
                  }}
                >
                  <option value="">{t('deliveryModal', 'selectCustomer')}</option>
                  {customers.filter(c => {
                    const hasRecordToday = deliveries.some(
                      (d: any) => d.ethiopian_date === values.ethiopian_date && d.customer === c.id && (!isEdit || d.id !== delivery?.id)
                    );
                    return !hasRecordToday;
                  }).map(c => (
                    <option key={c.id} value={c.id}>{c.business_name}</option>
                  ))}
                </Field>
                {errors.customer && touched.customer && (
                  <div className="mt-1.5 text-sm text-danger font-medium">{String(errors.customer)}</div>
                )}
              </div>

              <FormInput 
                name="ethiopian_date" 
                label={t('deliveryModal', 'date')} 
                icon={<Calendar className="h-4 w-4" />}
                placeholder="2017-01-05" 
              />
            </div>

            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">{t('deliveryModal', 'volumeAndPrice')}</h4>
              <FormInput 
                name="delivered_quantity" 
                label={t('deliveryModal', 'deliveredLiters')}
                type="number" 
                icon={<Truck className="h-4 w-4" />}
              />
              <FormInput 
                name="price_per_liter" 
                label={t('deliveryModal', 'pricePerLiter')}
                type="number" 
                icon={<DollarSign className="h-4 w-4" />}
              />
            </div>
            
            {isEdit && isPastRecord(values.ethiopian_date) && (
              <div className="bg-danger-subtle/50 p-4 rounded-[14px] border border-danger/20 space-y-4">
                <h4 className="text-xs font-bold text-danger uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Lock className="h-3 w-3" /> Admin Password Required
                </h4>
                <p className="text-xs text-danger/80 mb-2">You are editing a past record. Please enter your password to authorize this change.</p>
                <FormInput 
                  name="admin_password" 
                  label="Password" 
                  type="password" 
                  icon={<Lock className="h-4 w-4" />}
                  placeholder="Enter your password"
                />
              </div>
            )}
            
            <div className="pt-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || mutation.isPending}
              >
                {t('deliveryModal', 'cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting || mutation.isPending}
              >
                {isEdit ? t('deliveryModal', 'updateRecord') : t('deliveryModal', 'saveDelivery')}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
