'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, Supplier, updateSupplierStatus } from '@/services/suppliers';
import { getSystemSettings } from '@/services/settings';
import { Plus, Search, Edit2, MapPin, Phone, Users, UserCheck, UserX, Info } from 'lucide-react';
import SupplierModal from '@/components/features/suppliers/SupplierModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import { showError, showSuccess } from '@/lib/toast';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);
  const [statusTarget, setStatusTarget] = useState<Supplier | undefined>(undefined);

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

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: getSystemSettings,
  });

  const globalPrice = systemSettings?.default_supplier_milk_price;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateSupplierStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers_summary'] });
      showSuccess(variables.status === 'ACTIVE' ? 'Supplier activated.' : 'Supplier deactivated.');
      setStatusTarget(undefined);
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to update supplier status.');
    },
  });

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const requestStatusChange = (supplier: Supplier) => {
    if (supplier.status === 'ACTIVE') {
      setStatusTarget(supplier);
      return;
    }
    if (supplier.id) {
      statusMutation.mutate({ id: supplier.id, status: 'ACTIVE' });
    }
  };

  const confirmDeactivate = () => {
    if (statusTarget?.id) {
      statusMutation.mutate({ id: statusTarget.id, status: 'INACTIVE' });
    }
  };

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

      {/* Global price banner */}
      {globalPrice !== undefined && (
        <div className="flex items-center gap-3 bg-info-subtle/40 border border-info/20 rounded-[14px] px-4 py-3">
          <Info className="h-4 w-4 text-info-hover flex-shrink-0" />
          <p className="text-sm text-info-hover">
            Global milk purchase price: <strong>{globalPrice} ETB / L</strong> — applied to all suppliers. Change it in{' '}
            <a href="/settings" className="underline font-semibold hover:text-primary transition-colors">Settings</a>.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center flex-1 max-w-md bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border px-3 py-2">
          <Search className="h-5 w-5 text-muted" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full border-0 py-1 pl-3 text-foreground placeholder:text-muted focus:ring-0 sm:text-sm outline-none bg-transparent"
          />
        </div>
        <div className="flex bg-surface border border-border rounded-[14px] p-1">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[10px] transition-colors ${
                statusFilter === filter ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              }`}
            >
              {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
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
          description={searchTerm || statusFilter !== 'ALL' ? "Try adjusting your search or status filter." : "You haven't added any suppliers yet."}
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
                    Price (ETB/L)
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
                  <tr key={supplier.id} className={`hover:bg-surface-secondary transition-colors ${supplier.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
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
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className="font-bold text-foreground">{globalPrice ?? supplier.default_milk_price}</span>
                      {globalPrice && (
                        <span className="ml-1.5 text-xs text-muted font-normal">ETB/L</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <StatusBadge 
                        status={supplier.status} 
                        variant={supplier.status === 'ACTIVE' ? 'success' : 'neutral'} 
                      />
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button
                        onClick={() => requestStatusChange(supplier)}
                        className="text-muted hover:text-primary transition-colors p-2 hover:bg-primary-light/10 rounded-[10px]"
                        title={supplier.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {supplier.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        <span className="sr-only">
                          {supplier.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} {supplier.name}
                        </span>
                      </button>
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
              <div key={supplier.id} className={`bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4 relative ${supplier.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
                <div className="absolute top-4 right-4 flex">
                  <button
                    onClick={() => requestStatusChange(supplier)}
                    className="p-2 text-muted hover:text-primary hover:bg-primary-light/10 rounded-[10px] transition-colors"
                    title={supplier.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  >
                    {supplier.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => handleEdit(supplier)}
                    className="p-2 text-muted hover:text-primary hover:bg-primary-light/10 rounded-[10px] transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
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
                  <div className="font-bold text-foreground text-right">{globalPrice ?? supplier.default_milk_price} ETB/L</div>
                  
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
      <ConfirmDialog
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(undefined)}
        onConfirm={confirmDeactivate}
        title="Deactivate supplier?"
        message={`${statusTarget?.name || 'This supplier'} will no longer appear when recording collections. Past records stay in history.`}
        confirmText="Deactivate"
        isLoading={statusMutation.isPending}
      />
    </div>
  );
}
