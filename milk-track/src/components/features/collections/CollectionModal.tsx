'use client';

import { useMemo } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { getSuppliers } from '@/services/suppliers';
import { getCollections } from '@/services/collections';
import { showSuccess, showError } from '@/lib/toast';
import { Calendar, DollarSign, Droplets, Lock } from 'lucide-react';
import { EthDateTime } from 'ethiopian-calendar-date-converter';
import { useTranslation } from '@/hooks/useTranslation';

const CollectionSchema = Yup.object().shape({
  supplier: Yup.number().required('Supplier is required'),
  ethiopian_date: Yup.string().required('Date is required'),
  morning_quantity: Yup.number().min(0, 'Cannot be negative').required('Required'),
  evening_quantity: Yup.number().min(0, 'Cannot be negative').required('Required'),
});

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: any;
}

export default function CollectionModal({ isOpen, onClose, collection }: CollectionModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(collection);
  const { t } = useTranslation();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    enabled: isOpen,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const [year, month, day] = values.ethiopian_date.split('-').map(Number);
      const payload = { ...values, ethiopian_year: year, ethiopian_month: month, ethiopian_day: day };
      
      if (isEdit) {
        return fetchApi(`/milk-collections/${collection.id}/`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return fetchApi('/milk-collections/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['daily-reconciliation'] });
      showSuccess(isEdit ? 'Collection updated successfully!' : 'Collection recorded successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to save collection record.');
    }
  });

  const getTodayEthiopian = () => {
    const now = EthDateTime.now();
    return `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.date).padStart(2, '0')}`;
  };

  const initialValues = useMemo(() => {
    if (collection) {
      return {
        ...collection,
        ethiopian_date: `${collection.ethiopian_year}-${String(collection.ethiopian_month).padStart(2, '0')}-${String(collection.ethiopian_day).padStart(2, '0')}`,
        supplier: collection.supplier,
        morning_quantity: collection.morning_quantity,
        evening_quantity: collection.evening_quantity,
        admin_password: '',
      };
    }
    return {
      supplier: '',
      ethiopian_date: getTodayEthiopian(),
      morning_quantity: 0,
      evening_quantity: 0,
      admin_password: '',
    };
  }, [collection]);

  const isPastRecord = (dateStr: string) => {
    return dateStr !== getTodayEthiopian();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? t('collectionModal', 'editTitle') : t('collectionModal', 'recordTitle')}
      description={isEdit ? t('collectionModal', 'editDesc') : t('collectionModal', 'recordDesc')}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={CollectionSchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting, setFieldValue, values, errors, touched }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">{t('collectionModal', 'collectionDetails')}</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">{t('collectionModal', 'supplier')}</label>
                <Field 
                  as="select"
                  name="supplier" 
                  className={`block w-full rounded-[10px] border ${
                    errors.supplier && touched.supplier 
                      ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger' 
                      : 'border-border focus:border-primary focus:ring-1 focus:ring-primary hover:border-primary/50'
                  } pl-3 pr-8 py-2.5 text-sm transition-colors duration-200 outline-none`}
                  onChange={(e: any) => {
                    setFieldValue('supplier', e.target.value);
                  }}
                >
                  <option value="">{t('collectionModal', 'selectSupplier')}</option>
                  {suppliers.filter(s => {
                    const hasRecordToday = collections.some(
                      (c: any) => c.ethiopian_date === values.ethiopian_date && c.supplier === s.id && (!isEdit || c.id !== collection?.id)
                    );
                    return !hasRecordToday;
                  }).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Field>
                {errors.supplier && touched.supplier && (
                  <div className="mt-1.5 text-sm text-danger font-medium">{String(errors.supplier)}</div>
                )}
              </div>

              <FormInput 
                name="ethiopian_date" 
                label={t('collectionModal', 'date')} 
                icon={<Calendar className="h-4 w-4" />}
                placeholder="2017-01-05" 
              />
            </div>

            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">{t('collectionModal', 'volumeAndPrice')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormInput 
                  name="morning_quantity" 
                  label={t('collectionModal', 'morning')}
                  type="number" 
                  icon={<Droplets className="h-4 w-4" />}
                />
                <FormInput 
                  name="evening_quantity" 
                  label={t('collectionModal', 'evening')}
                  type="number" 
                  icon={<Droplets className="h-4 w-4" />}
                />
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center text-sm p-3 bg-info-subtle rounded-lg border border-info/20">
                  <span className="font-semibold text-info">{t('collectionModal', 'totalDailyVolume')}</span>
                  <span className="font-bold text-info text-lg">
                    {Number(values.morning_quantity || 0) + Number(values.evening_quantity || 0)} L
                  </span>
                </div>
              </div>
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
                {t('collectionModal', 'cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting || mutation.isPending}
              >
                {isEdit ? t('collectionModal', 'updateRecord') : t('collectionModal', 'saveCollection')}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
