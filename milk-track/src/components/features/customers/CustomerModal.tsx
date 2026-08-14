'use client';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import { Building2, User, Phone, MapPin, DollarSign } from 'lucide-react';

const CustomerSchema = Yup.object().shape({
  business_name: Yup.string().required('Business name is required'),
  contact_person: Yup.string(),
  phone_number: Yup.string(),
  location: Yup.string(),
  address: Yup.string(),
  default_milk_price: Yup.number().positive('Must be positive').required('Price is required'),
});

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: any;
}

export default function CustomerModal({ isOpen, onClose, customer }: CustomerModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(customer);

  const mutation = useMutation({
    mutationFn: (values: any) => {
      if (isEdit) {
        return fetchApi(`/customers/${customer.id}/`, {
          method: 'PUT',
          body: JSON.stringify(values),
        });
      }
      return fetchApi('/customers/', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showSuccess(isEdit ? 'Customer updated successfully!' : 'Customer added successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to save customer. Please check your inputs.');
    }
  });

  const initialValues = customer || {
    business_name: '',
    contact_person: '',
    phone_number: '',
    location: '',
    address: '',
    default_milk_price: '',
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? 'Edit Customer' : 'Add New Customer'}
      description={isEdit ? 'Update details for this customer.' : 'Register a new milk buyer or distribution point.'}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={CustomerSchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Business Info</h4>
              <FormInput 
                name="business_name" 
                label="Business Name / Customer Name" 
                icon={<Building2 className="h-4 w-4" />}
                placeholder="e.g. Addis Cafe"
              />
              <FormInput 
                name="contact_person" 
                label="Contact Person (Optional)" 
                icon={<User className="h-4 w-4" />}
                placeholder="e.g. Abebe"
              />
            </div>

            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Contact & Pricing</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput 
                  name="phone_number" 
                  label="Phone Number" 
                  icon={<Phone className="h-4 w-4" />}
                  placeholder="09..."
                />
                <FormInput 
                  name="default_milk_price" 
                  label="Selling Price (ETB)" 
                  type="number" 
                  icon={<DollarSign className="h-4 w-4" />}
                  placeholder="0.00"
                />
              </div>
              <FormInput 
                name="location" 
                label="City / Area" 
                icon={<MapPin className="h-4 w-4" />}
                placeholder="e.g. Bole"
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
                isLoading={isSubmitting || mutation.isPending}
              >
                {isEdit ? 'Update Customer' : 'Save Customer'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
