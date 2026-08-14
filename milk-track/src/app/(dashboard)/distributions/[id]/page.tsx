'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomer, getCustomerSettlementsHistory } from '@/services/customers';
import { getDeliveriesByCustomer, MilkDelivery } from '@/services/distributions';
import { ArrowLeft, Building2, Calendar, Truck, Droplets, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import DeliveryModal from '@/components/features/distributions/DeliveryModal';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MilkDelivery | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['customer_history', id],
    queryFn: () => getCustomerSettlementsHistory(id),
  });

  const { data: deliveries = [], isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['customer_deliveries', id],
    queryFn: () => getDeliveriesByCustomer(id),
  });

  const periods = useMemo(() => {
    if (!deliveries.length && !history.length) return [];

    const grouped: Record<string, any> = {};

    // Group deliveries by period
    deliveries.forEach(del => {
      const periodNum = del.ethiopian_day <= 15 ? 1 : 2;
      const periodName = `Period ${periodNum} - Month ${del.ethiopian_month}, Year ${del.ethiopian_year}`;
      
      if (!grouped[periodName]) {
        grouped[periodName] = {
          periodName,
          startDate: '', // Overwritten by history if exists
          endDate: '',
          totalMilk: 0,
          totalAmount: 0,
          paymentStatus: 'ONGOING',
          records: [],
          ethiopianYear: del.ethiopian_year,
          ethiopianMonth: del.ethiopian_month,
          periodNum
        };
      }
      
      grouped[periodName].records.push(del);
      grouped[periodName].totalMilk += Number(del.net_quantity || 0);
      grouped[periodName].totalAmount += Number(del.net_quantity || 0) * Number(del.price_per_liter || 0);
    });

    // Merge with finalized settlement history
    history.forEach(hist => {
      if (!grouped[hist.period_name]) {
        grouped[hist.period_name] = {
          periodName: hist.period_name,
          startDate: hist.start_date,
          endDate: hist.end_date,
          totalMilk: 0,
          totalAmount: 0,
          paymentStatus: hist.payment_status,
          records: [],
          ethiopianYear: parseInt(hist.period_name.match(/Year (\d+)/)?.[1] || '0'),
          ethiopianMonth: parseInt(hist.period_name.match(/Month (\d+)/)?.[1] || '0'),
          periodNum: parseInt(hist.period_name.match(/Period (\d)/)?.[1] || '0'),
        };
      }
      
      const p = grouped[hist.period_name];
      p.totalMilk = hist.total_milk;
      p.totalAmount = hist.total_amount;
      p.paymentStatus = hist.payment_status;
      p.startDate = hist.start_date;
      p.endDate = hist.end_date;
    });

    // Sort periods newest to oldest
    const sortedPeriods = Object.values(grouped).sort((a, b) => {
      if (a.ethiopianYear !== b.ethiopianYear) return b.ethiopianYear - a.ethiopianYear;
      if (a.ethiopianMonth !== b.ethiopianMonth) return b.ethiopianMonth - a.ethiopianMonth;
      return b.periodNum - a.periodNum;
    });

    // Sort daily records inside each period
    sortedPeriods.forEach(p => {
      p.records.sort((a: MilkDelivery, b: MilkDelivery) => b.ethiopian_day - a.ethiopian_day);
    });

    return sortedPeriods;
  }, [deliveries, history]);

  const togglePeriod = (periodName: string) => {
    setExpandedPeriod(expandedPeriod === periodName ? null : periodName);
  };

  const isLoading = isLoadingCustomer || isLoadingHistory || isLoadingDeliveries;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/distributions" className="p-2 bg-surface rounded-[10px] border border-border text-muted hover:text-foreground transition-colors shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Details</h1>
          <p className="mt-1 text-sm text-muted">View historical distribution records and settlements.</p>
        </div>
      </div>

      {isLoadingCustomer ? (
        <SkeletonCard />
      ) : customer ? (
        <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-surface-secondary border border-border flex items-center justify-center text-muted flex-shrink-0">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{customer.business_name}</h2>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="text-muted">
                  <span className="font-semibold text-foreground/80">Phone:</span> {customer.phone_number || '-'}
                </div>
                <div className="text-muted">
                  <span className="font-semibold text-foreground/80">Location:</span> {customer.location || '-'}
                </div>
                <div className="text-muted">
                  <span className="font-semibold text-foreground/80">Status:</span> 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    customer.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                  }`}>
                    {customer.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Settlement Periods</h3>
        
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : periods.length === 0 ? (
          <EmptyState 
            icon={<Calendar />}
            title="No records found"
            description="This customer has no delivery history."
          />
        ) : (
          <div className="space-y-4">
            {periods.map((period) => (
              <div key={period.periodName} className="bg-surface rounded-[16px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border overflow-hidden">
                <button 
                  onClick={() => togglePeriod(period.periodName)}
                  className="w-full flex items-center justify-between p-5 hover:bg-surface-secondary transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-foreground">{period.periodName}</h4>
                      <StatusBadge 
                        status={period.paymentStatus}
                        variant={
                          period.paymentStatus === 'PAID' ? 'success' : 
                          period.paymentStatus === 'ONGOING' ? 'info' :
                          period.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'
                        }
                      />
                    </div>
                    {period.startDate && period.endDate && (
                      <p className="text-xs text-muted flex items-center">
                        <Calendar className="h-3 w-3 mr-1" /> {period.startDate} - {period.endDate}
                      </p>
                    )}
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-8 mr-6">
                    <div>
                      <div className="text-xs text-muted mb-0.5 font-medium">Total Net Milk</div>
                      <div className="font-bold text-primary">{period.totalMilk} L</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted mb-0.5 font-medium">Total Amount</div>
                      <div className="font-bold text-foreground">{period.totalAmount} ETB</div>
                    </div>
                  </div>
                  
                  <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center text-muted border border-border">
                    {expandedPeriod === period.periodName ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                
                {expandedPeriod === period.periodName && (
                  <div className="border-t border-border bg-surface-secondary/50">
                    {period.records.length === 0 ? (
                      <div className="p-8 text-center text-muted text-sm flex flex-col items-center">
                        <Truck className="h-8 w-8 mb-2 opacity-50" />
                        No daily delivery records found for this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-surface">
                            <tr>
                              <th scope="col" className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Delivered</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Returned</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Net Sold</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Price</th>
                              <th scope="col" className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50 bg-transparent">
                            {period.records.map((record: MilkDelivery) => (
                              <tr key={record.id} className="hover:bg-surface transition-colors">
                                <td className="whitespace-nowrap py-3 pl-6 pr-3 text-sm font-medium text-foreground">
                                  {record.ethiopian_date}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm text-muted">
                                  {record.delivered_quantity} L
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm text-warning">
                                  {Number(record.returned_quantity) > 0 ? `${record.returned_quantity} L` : '-'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-primary">
                                  {record.net_quantity} L
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-foreground">
                                  {record.price_per_liter} ETB
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingRecord(record);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="text-primary hover:text-primary-hover p-1.5 bg-primary/10 rounded-md transition-colors inline-flex items-center"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DeliveryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        delivery={editingRecord}
      />
    </div>
  );
}
