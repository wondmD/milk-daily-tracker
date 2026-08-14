'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { getSystemSettings, updateSystemSettings, SystemSettings } from '@/services/settings';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';
import { showSuccess, showError } from '@/lib/toast';
import { Settings, DollarSign, Save } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

const SettingsSchema = Yup.object().shape({
  default_supplier_milk_price: Yup.number().positive('Must be positive').required('Required'),
});

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['system-settings'],
    queryFn: getSystemSettings,
  });

  const mutation = useMutation({
    mutationFn: updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      showSuccess('Settings updated successfully!');
    },
    onError: (error) => {
      console.error(error);
      showError('Failed to update settings.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader title="System Settings" subtitle="Configure global application settings" />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader title="System Settings" subtitle="Configure global application settings" />
        <EmptyState 
          icon={<Settings />}
          title="Failed to load settings"
          description="There was an error communicating with the server."
        />
      </div>
    );
  }

  const initialValues: SystemSettings = {
    default_supplier_milk_price: settings?.default_supplier_milk_price || 0,
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader 
        title="System Settings" 
        subtitle="Configure global application settings" 
      />

      <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="h-10 w-10 bg-primary-light/30 rounded-xl flex items-center justify-center text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Global Pricing</h2>
            <p className="text-sm text-muted">Set the default milk price used for all supplier collections.</p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={SettingsSchema}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            mutation.mutate(values, {
              onSettled: () => setSubmitting(false),
            });
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormInput 
                  name="default_supplier_milk_price" 
                  label="Default Supplier Milk Price (ETB)" 
                  type="number"
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </div>
              
              <div className="bg-info-subtle/50 p-4 rounded-[14px] border border-info/20">
                <p className="text-sm text-info-hover">
                  <strong>Note:</strong> Updating this value will change the default price applied to all new milk collections. Past collections will retain their recorded prices.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="h-4 w-4" />}
                  isLoading={isSubmitting || mutation.isPending}
                >
                  Save Settings
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
