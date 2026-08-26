'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSuppliers, Supplier } from '@/services/suppliers';
import { Plus, Search, Edit2, MapPin, Phone, Users } from 'lucide-react';
import SupplierModal from '@/components/features/suppliers/SupplierModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedSupplier(undefined);
    setIsModalOpen(false);
  };

  const { data: suppliers = [], isLoading, isError } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplier_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Suppliers"
        subtitle="Manage all milk suppliers and dairy farms."
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Supplier
          </Button>
        }
      />

      <div className="flex items-center max-w-md bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border px-3 py-2">
        <Search className="h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="Search suppliers..."
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
          icon={<Users />}
          title="Failed to load suppliers"
          description="There was an error communicating with the server."
        />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState 
          icon={<Users />}
          title="No suppliers found"
          description={searchTerm ? "Try adjusting your search query." : "You haven't added any suppliers yet."}
          action={!searchTerm ? (
            <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add Your First Supplier
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
                    Supplier Details
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Contact
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
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold border border-primary-light/50">
                          {supplier.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="font-semibold text-foreground">{supplier.name}</div>
                          <div className="text-muted text-xs mt-0.5">{supplier.supplier_type.replace('_', ' ')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      <div className="text-sm text-foreground flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-1.5 text-muted" />
                        {supplier.phone_number || 'N/A'}
                      </div>
                      <div className="text-sm text-muted flex items-center mt-1">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted" />
                        {supplier.address ? (supplier.address.length > 20 ? supplier.address.substring(0, 20) + '...' : supplier.address) : 'No address'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground font-bold">
                      {supplier.default_milk_price} ETB
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge 
                        status={supplier.status} 
                        variant={supplier.status === 'ACTIVE' ? 'success' : 'neutral'} 
                      />
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEdit(supplier)}
                        className="text-muted hover:text-primary transition-colors p-2 hover:bg-primary-light/10 rounded-[10px]"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit {supplier.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden flex flex-col gap-4">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4 relative">
                <button 
                  onClick={() => handleEdit(supplier)}
                  className="absolute top-4 right-4 p-2 text-muted hover:text-primary hover:bg-primary-light/10 rounded-[10px] transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold border border-primary-light/50 mr-3">
                    {supplier.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{supplier.name}</h3>
                    <p className="text-xs text-muted">{supplier.supplier_type.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
                  <div className="text-muted">Price</div>
                  <div className="font-bold text-foreground text-right">{supplier.default_milk_price} ETB</div>
                  
                  <div className="text-muted">Phone</div>
                  <div className="text-foreground text-right font-medium">{supplier.phone_number || 'N/A'}</div>
                  
                  <div className="text-muted">Status</div>
                  <div className="text-right">
                    <StatusBadge 
                      status={supplier.status} 
                      variant={supplier.status === 'ACTIVE' ? 'success' : 'neutral'} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <SupplierModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        supplier={selectedSupplier}
      />
    </div>
  );
}
