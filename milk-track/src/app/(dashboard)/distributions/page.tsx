'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomerCurrentPeriodSummary, Customer } from '@/services/customers';
import { Plus, Search, Truck, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import DeliveryModal from '@/components/features/distributions/DeliveryModal';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import { useTranslation } from '@/hooks/useTranslation';

export default function DistributionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();
  
  const { data: customers = [], isLoading, isError } = useQuery({
    queryKey: ['customers_summary'],
    queryFn: getCustomerCurrentPeriodSummary,
  });

  const filteredCustomers = customers.filter(c => 
    c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone_number && c.phone_number.includes(searchTerm))
  );

  let periodDays: number[] = [];
  if (customers.length > 0 && customers[0].period_start && customers[0].period_end) {
    try {
      const startDayStr = customers[0].period_start.split(' ')[1].replace(',', '');
      const endDayStr = customers[0].period_end.split(' ')[1].replace(',', '');
      const start = parseInt(startDayStr);
      const end = parseInt(endDayStr);
      for (let i = start; i <= end; i++) {
        periodDays.push(i);
      }
    } catch (e) {
      periodDays = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    }
  } else {
    periodDays = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('distributions', 'title')}
        subtitle={t('distributions', 'subtitle')}
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            variant="primary"
          >
            {t('distributions', 'addDelivery')}
          </Button>
        }
      />

      <div className="flex items-center max-w-md bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border px-3 py-2">
        <Search className="h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder="Search by customer name or phone..."
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
          icon={<Truck />}
          title="Failed to load deliveries"
          description="There was an error communicating with the server."
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState 
          icon={<Building2 />}
          title="No customers found"
          description={searchTerm ? "Try adjusting your search query." : "You haven't added any active customers yet."}
          action={!searchTerm ? (
            <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Record First Delivery
            </Button>
          ) : undefined}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-secondary">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted sticky left-0 bg-surface-secondary z-10">No.</th>
                  <th scope="col" className="px-2 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted sticky left-12 bg-surface-secondary z-10 border-r border-border">Customer</th>
                  {periodDays.map(day => (
                    <th key={day} scope="col" className="px-2 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap">
                      {day}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted border-l border-border bg-surface-secondary">Total</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted bg-surface-secondary">Payable</th>
                  <th scope="col" className="relative py-3.5 pl-2 pr-4 bg-surface-secondary"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredCustomers.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="whitespace-nowrap py-3 pl-4 pr-2 text-xs font-semibold text-muted sticky left-0 bg-surface z-10 group-hover:bg-surface-secondary">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-sm text-foreground sticky left-12 bg-surface z-10 border-r border-border group-hover:bg-surface-secondary">
                      <div className="flex items-center font-medium">
                        <span className="truncate max-w-[120px]" title={customer.business_name}>{customer.business_name}</span>
                      </div>
                    </td>
                    {periodDays.map(day => {
                      const qty = customer.daily_records?.[day] || 0;
                      return (
                        <td key={day} className={`whitespace-nowrap px-2 py-3 text-xs text-center font-medium ${qty > 0 ? 'text-primary' : 'text-muted/40'}`}>
                          {qty > 0 ? qty : '-'}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-foreground text-right border-l border-border bg-surface-secondary/30">
                      {customer.current_period_milk || 0} L
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-foreground text-right bg-surface-secondary/30">
                      {(customer.current_period_price || 0).toLocaleString()} 
                    </td>
                    <td className="relative whitespace-nowrap py-3 pl-2 pr-4 text-right text-sm font-medium bg-surface-secondary/30">
                      <Link href={`/distributions/${customer.id}`} className="inline-flex items-center text-primary hover:text-primary-hover transition-colors p-1.5 hover:bg-primary-light/10 rounded-md">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden flex flex-col gap-4">
            {filteredCustomers.map((customer, index) => (
              <div key={customer.id} className="bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4 relative">
                <Link href={`/distributions/${customer.id}`} className="absolute top-4 right-4 p-2 text-primary hover:bg-primary-light/10 rounded-[10px] transition-colors flex items-center text-xs font-semibold">
                  {t('distributions', 'details')} <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold border border-primary-light/50 mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{customer.business_name}</h3>
                    <p className="text-xs text-muted flex items-center mt-0.5">
                      {customer.phone_number || t('distributions', 'noPhone')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
                  <div className="text-muted font-medium">{t('distributions', 'currentPeriodMilk')}</div>
                  <div className="font-bold text-primary text-right text-lg">{customer.current_period_milk || 0} L</div>
                  
                  <div className="text-muted font-medium">{t('distributions', 'expectedPrice')}</div>
                  <div className="font-bold text-foreground text-right">{customer.current_period_price || 0} ETB</div>
                  
                  <div className="text-muted font-medium">Today's Record</div>
                  <div className="text-right">
                    {customer.has_record_today ? (
                      <span className="inline-flex items-center rounded-full bg-success-subtle px-2 py-0.5 text-[10px] font-semibold text-success border border-success/20">
                        Recorded
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-warning-subtle px-2 py-0.5 text-[10px] font-semibold text-warning border border-warning/20">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <DeliveryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
