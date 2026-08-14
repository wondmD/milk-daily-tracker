'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProcessingBatches, getProductInventory } from '@/services/processing';
import { Plus, Search, Factory, Calendar, Package } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import ProcessingModal from '@/components/features/processing/ProcessingModal';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProcessingPage() {
  const [activeTab, setActiveTab] = useState<'batches' | 'inventory'>('batches');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();
  
  const { data: batches = [], isLoading: loadingBatches, isError: errorBatches } = useQuery({
    queryKey: ['processing-batches'],
    queryFn: getProcessingBatches,
  });

  const { data: inventory = [], isLoading: loadingInventory, isError: errorInventory } = useQuery({
    queryKey: ['product-inventory'],
    queryFn: getProductInventory,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('processing', 'title')}
        subtitle={t('processing', 'subtitle')}
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            variant="primary"
          >
            {t('processing', 'newBatch')}
          </Button>
        }
      />

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('batches')}
            className={`${
              activeTab === 'batches'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-foreground'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors flex items-center`}
          >
            <Factory className="mr-2 h-4 w-4" />
            {t('processing', 'history')}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`${
              activeTab === 'inventory'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-foreground'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors flex items-center`}
          >
            <Package className="mr-2 h-4 w-4" />
            {t('processing', 'inventory')}
          </button>
        </nav>
      </div>

      {activeTab === 'batches' && (
        <div className="space-y-4">
          {loadingBatches ? (
            <>
              <div className="hidden sm:block"><SkeletonTable rows={5} /></div>
              <div className="sm:hidden space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </>
          ) : errorBatches ? (
            <EmptyState 
              icon={<Factory />}
              title="Failed to load batches"
              description="There was an error communicating with the server."
            />
          ) : batches.length === 0 ? (
            <EmptyState 
              icon={<Factory />}
              title="No processing records found"
              description="You haven't recorded any milk processing batches yet."
              action={
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
                  Record First Batch
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('processing', 'date')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('processing', 'product')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('processing', 'milkInput')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('processing', 'productOutput')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-surface-secondary transition-colors">
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-foreground">
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-muted" />
                            {batch.ethiopian_date}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-primary">
                          {batch.product_details?.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                          {batch.input_milk_quantity} L
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-foreground">
                          {batch.output_quantity} {batch.product_details?.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List View */}
              <div className="sm:hidden flex flex-col gap-4">
                {batches.map((batch) => (
                  <div key={batch.id} className="bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4 relative">
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold border border-primary-light/50 mr-3">
                        <Factory className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{batch.product_details?.name}</h3>
                        <p className="text-xs text-muted flex items-center mt-0.5">
                          <Calendar className="h-3 w-3 mr-1" /> {batch.ethiopian_date}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm border-t border-border pt-3">
                      <div className="text-muted">{t('processing', 'milkInput')}</div>
                      <div className="font-medium text-foreground text-right">{batch.input_milk_quantity} L</div>
                      
                      <div className="text-muted font-medium">{t('processing', 'productOutput')}</div>
                      <div className="font-bold text-primary text-right">{batch.output_quantity} {batch.product_details?.unit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {loadingInventory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               <SkeletonCard />
               <SkeletonCard />
               <SkeletonCard />
            </div>
          ) : errorInventory ? (
            <EmptyState 
              icon={<Package />}
              title="Failed to load inventory"
              description="There was an error communicating with the server."
            />
          ) : inventory.length === 0 ? (
            <EmptyState 
              icon={<Package />}
              title="No products available"
              description="Inventory is empty. Start a processing batch to create products."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-[20px] bg-surface shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted">{item.product_details?.name}</h3>
                    <div className="rounded-full bg-primary-light/30 p-2 text-primary border border-primary-light/50">
                      <Package className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-foreground">
                    {item.quantity_available} <span className="text-lg text-muted font-medium">{item.product_details?.unit}</span>
                  </p>
                  <div className="mt-4 flex items-center text-sm text-primary font-medium">
                    {item.product_details?.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <ProcessingModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}
