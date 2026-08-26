'use client';

import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import { getCustomerCurrentPeriodSummary, Customer } from '@/services/customers';
import { Plus, Search, Truck, Building2, ArrowRight, Printer } from 'lucide-react';
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
  ).sort((a, b) => a.business_name.localeCompare(b.business_name));

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

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Distributions_Report_${customers[0]?.period_name || 'Period'}`,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('distributions', 'title')}
        subtitle={t('distributions', 'subtitle')}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Export PDF
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
              variant="primary"
            >
              {t('distributions', 'addDelivery')}
            </Button>
          </div>
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
          {/* Desktop & Mobile Table View */}
          <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
            <div ref={printRef} className="print:p-8">
              {/* Print Header (Only visible when printing) */}
              <div className="hidden print:block mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Distributions Report</h1>
                <p className="text-muted">Settlement Period: {customers[0]?.period_name || 'N/A'}</p>
                <p className="text-muted">Dates: {customers[0]?.period_start || 'N/A'} - {customers[0]?.period_end || 'N/A'}</p>
                <div className="border-b border-border my-6"></div>
              </div>

              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-secondary sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted sticky left-0 bg-surface-secondary z-30 border-r border-border">No.</th>
                    <th scope="col" className="px-2 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted sticky left-10 bg-surface-secondary z-30 border-r border-border min-w-[120px]">Customer</th>
                    {periodDays.map(day => (
                      <th key={day} scope="col" className="px-2 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap border-r border-border">
                        {day}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted border-r border-border bg-surface-secondary z-20">Total</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted border-r border-border bg-surface-secondary z-20">Payable</th>
                    <th scope="col" className="relative py-3.5 pl-2 pr-4 bg-surface-secondary z-20 print:hidden"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {filteredCustomers.map((customer, index) => (
                    <tr key={customer.id} className="hover:bg-surface-secondary transition-colors group">
                      <td className="whitespace-nowrap py-3 pl-4 pr-2 text-xs font-semibold text-muted sticky left-0 bg-surface z-10 border-r border-border group-hover:bg-surface-secondary">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm text-foreground sticky left-10 bg-surface z-10 border-r border-border group-hover:bg-surface-secondary">
                        <div className="flex items-center font-medium">
                          <span className="truncate max-w-[120px]" title={customer.business_name}>{customer.business_name}</span>
                        </div>
                      </td>
                      {periodDays.map(day => {
                        const qty = customer.daily_records?.[day] || 0;
                        return (
                          <td key={day} className={`whitespace-nowrap px-2 py-3 text-xs text-center font-medium border-r border-border ${qty > 0 ? 'text-primary' : 'text-muted/40'}`}>
                            {qty > 0 ? qty : '-'}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-foreground text-right border-r border-border bg-surface-secondary/30">
                        {customer.current_period_milk || 0} L
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-foreground text-right border-r border-border bg-surface-secondary/30">
                        {(customer.current_period_price || 0).toLocaleString()} 
                      </td>
                      <td className="relative whitespace-nowrap py-3 pl-2 pr-4 text-right text-sm font-medium bg-surface-secondary/30 print:hidden">
                        <Link href={`/distributions/${customer.id}`} className="inline-flex items-center text-primary hover:text-primary-hover transition-colors p-1.5 hover:bg-primary-light/10 rounded-md">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
