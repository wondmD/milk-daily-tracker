'use client';

import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import FormInput from '@/components/ui/FormInput';
import Button from '@/components/ui/Button';
import { fetchApi } from '@/lib/api';
import { showSuccess, showError } from '@/lib/toast';
import { User, Phone, MapPin, DollarSign } from 'lucide-react';

const SupplierSchema = Yup.object().shape({
  name: Yup.string().required('Supplier name is required'),
  phone_number: Yup.string(),
  address: Yup.string(),
  supplier_type: Yup.string().required('Supplier type is required'),
  default_milk_price: Yup.number().positive('Must be a positive number').required('Price is required'),
});

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: any; // If editing
}

export default function SupplierModal({ isOpen, onClose, supplier }: SupplierModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(supplier);

  const mutation = useMutation({
    mutationFn: (values: any) => {
      if (isEdit) {
        return fetchApi(`/suppliers/${supplier.id}/`, {
          method: 'PUT',
          body: JSON.stringify(values),
        });
      }
      return fetchApi('/suppliers/', {
        method: 'POST',
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      showSuccess(isEdit ? 'Supplier updated successfully!' : 'Supplier added successfully!');
      onClose();
    },
    onError: (error: any) => {
      console.error(error);
      showError('Failed to save supplier. Please check your inputs.');
    }
  });

  const initialValues = supplier || {
    name: '',
    phone_number: '',
    address: '',
    supplier_type: 'INDIVIDUAL_FARMER',
    default_milk_price: '',
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEdit ? 'Edit Supplier' : 'Add New Supplier'}
      description={isEdit ? 'Update details for this supplier.' : 'Register a new milk supplier to your network.'}
    >
      <Formik
        initialValues={initialValues}
        validationSchema={SupplierSchema}
        onSubmit={(values, { setSubmitting }) => {
          mutation.mutate(values, {
            onSettled: () => setSubmitting(false),
          });
        }}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-5 mt-2">
            
            <div className="bg-surface-secondary p-4 rounded-[14px] border border-border space-y-4">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Basic Info</h4>
              <FormInput 
                name="name" 
                label="Full Name / Farm Name" 
                icon={<User className="h-4 w-4" />}
                placeholder="e.g. Abebe Farm"
              />
              
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-1.5">Supplier Type</label>
                <Field 
                  as="select"
                  name="supplier_type" 
                  className={`block w-full rounded-[10px] border ${
                    errors.supplier_type && touched.supplier_type 
                      ? 'border-danger focus:border-danger focus:ring-danger' 
                      : 'border-border focus:border-primary focus:ring-primary hover:border-muted'
                  } pl-3 pr-8 py-2.5 text-sm shadow-sm transition-colors duration-200 outline-none`}
                >
                  <option value="INDIVIDUAL_FARMER">Individual Farmer</option>
                  <option value="DAIRY_FARM">Dairy Farm</option>
                  <option value="COOPERATIVE">Cooperative</option>
                  <option value="COLLECTION_CENTER">Collection Center</option>
                  <option value="OTHER">Other</option>
                </Field>
                {errors.supplier_type && touched.supplier_type && (
                  <div className="mt-1.5 text-sm text-danger font-medium">{String(errors.supplier_type)}</div>
                )}
              </div>
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
                  label="Default Price (ETB)" 
                  type="number" 
                  icon={<DollarSign className="h-4 w-4" />}
                  placeholder="0.00"
                />
              </div>
              <FormInput 
                name="address" 
                label="Address / Location" 
                icon={<MapPin className="h-4 w-4" />}
                placeholder="City, Woreda, Kebele..."
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
                {isEdit ? 'Update Supplier' : 'Save Supplier'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
