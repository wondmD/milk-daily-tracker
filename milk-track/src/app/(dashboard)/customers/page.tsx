'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers, Customer } from '@/services/customers';
import { Plus, Search, Edit2, MapPin, Phone, Building2 } from 'lucide-react';
import CustomerModal from '@/components/features/customers/CustomerModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: customers = [], isLoading, isError } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const filteredCustomers = customers.filter(c => 
    c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle="Manage all milk buyers and distribution points."
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Customer
          </Button>
        }
      />

      <div className="flex items-center max-w-md bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border px-3 py-2">
        <Search className="h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full border-0 py-1 pl-3 text-foreground placeholder:text-muted focus:ring-0 sm:text-sm outline-none bg-transparent"
        />
      </div>

      {isLoading ? (
        <>
          <div className="hidden sm:block"><SkeletonTable rows={5} /></div>
          <div className="sm:hidden space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      ) : isError ? (
        <EmptyState 
          icon={<Building2 />}
          title="Failed to load customers"
          description="There was an error communicating with the server."
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState 
          icon={<Building2 />}
          title="No customers found"
          description={searchTerm ? "Try adjusting your search query." : "You haven't added any customers yet."}
          action={!searchTerm ? (
            <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add Your First Customer
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-secondary">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Customer Details
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Contact Info
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Default Price
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold border border-primary-light/50">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="font-semibold text-foreground">{customer.business_name}</div>
                          <div className="text-muted text-xs mt-0.5">{customer.contact_person || 'No contact person'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <div className="text-sm text-foreground flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-muted" />
                        {customer.phone_number || 'N/A'}
                      </div>
                      <div className="text-sm text-muted flex items-center mt-1">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted" />
                        {customer.location || 'No location'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground font-bold">
                      {customer.default_milk_price} ETB
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge 
                        status={customer.status} 
                        variant={customer.status === 'ACTIVE' ? 'success' : 'neutral'} 
                      />
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button className="text-muted hover:text-primary transition-colors p-2 hover:bg-primary-light/10 rounded-[10px]">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit {customer.business_name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden flex flex-col gap-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4 relative">
                <button className="absolute top-4 right-4 p-2 text-muted hover:text-primary hover:bg-primary-light/10 rounded-[10px] transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold border border-primary-light/50 mr-3">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{customer.business_name}</h3>
                    <p className="text-xs text-muted">{customer.contact_person || 'No contact person'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
                  <div className="text-muted">Price</div>
                  <div className="font-bold text-foreground text-right">{customer.default_milk_price} ETB</div>
                  
                  <div className="text-muted">Phone</div>
                  <div className="text-foreground text-right font-medium">{customer.phone_number || 'N/A'}</div>
                  
                  <div className="text-muted">Status</div>
                  <div className="text-right">
                    <StatusBadge 
                      status={customer.status} 
                      variant={customer.status === 'ACTIVE' ? 'success' : 'neutral'} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
