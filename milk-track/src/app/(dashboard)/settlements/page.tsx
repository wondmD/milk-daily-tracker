'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSettlementPeriods, 
  getSupplierSettlements, 
  getCustomerSettlements
} from '@/services/settlements';
import { Wallet, Users, Building2, Calculator, ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import SettlementModal from '@/components/features/settlements/SettlementModal';
import PaymentModal from '@/components/features/payments/PaymentModal';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettlementsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'periods' | 'suppliers' | 'customers'>('periods');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<number, boolean>>({});
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    supplierId?: number;
    settlementId?: number;
    maxAmount?: number;
  }>({ isOpen: false });
  
  const { data: periods = [], isLoading: loadingPeriods, isError: errorPeriods } = useQuery({
    queryKey: ['settlement-periods'],
    queryFn: getSettlementPeriods,
  });

  const { data: supplierSettlements = [], isLoading: loadingSuppliers, isError: errorSuppliers } = useQuery({
    queryKey: ['supplier-settlements'],
    queryFn: getSupplierSettlements,
  });

  const { data: customerSettlements = [], isLoading: loadingCustomers, isError: errorCustomers } = useQuery({
    queryKey: ['customer-settlements'],
    queryFn: getCustomerSettlements,
  });

  const groupedSupplierSettlements = useMemo(() => {
    const groups: Record<number, { period: any; settlements: any[] }> = {};
    supplierSettlements.forEach((ss) => {
      if (!ss.settlement_period_details || ss.settlement_period_details.id === undefined) return;
      const periodId = ss.settlement_period_details.id;
      if (!groups[periodId]) {
        groups[periodId] = { period: ss.settlement_period_details, settlements: [] };
      }
      groups[periodId].settlements.push(ss);
    });
    return Object.values(groups).sort((a, b) => b.period.id - a.period.id);
  }, [supplierSettlements]);

  const togglePeriod = (periodId: number) => {
    setExpandedPeriods(prev => ({ ...prev, [periodId]: !prev[periodId] }));
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t('settlements', 'title')}
        subtitle={t('settlements', 'subtitle')}
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            variant="primary"
          >
            New Period
          </Button>
        }
      />

      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('periods')}
            className={`${
              activeTab === 'periods'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-foreground'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors flex items-center`}
          >
            <Wallet className="mr-2 h-4 w-4" />
            {t('settlements', 'periods')}
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`${
              activeTab === 'suppliers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-foreground'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors flex items-center`}
          >
            <Users className="mr-2 h-4 w-4" />
            {t('settlements', 'supplierPayables')}
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`${
              activeTab === 'customers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:border-border hover:text-foreground'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors flex items-center`}
          >
            <Building2 className="mr-2 h-4 w-4" />
            {t('settlements', 'customerReceivables')}
          </button>
        </nav>
      </div>

      {activeTab === 'periods' && (
        <div className="space-y-4">
          {loadingPeriods ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : errorPeriods ? (
            <EmptyState 
              icon={<Wallet />}
              title="Failed to load periods"
              description="There was an error communicating with the server."
            />
          ) : periods.length === 0 ? (
            <EmptyState 
              icon={<Wallet />}
              title="No settlement periods found"
              description="Settlement periods are generated by the system automatically."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {periods.map((period) => (
                <div key={period.id} className="overflow-hidden rounded-[20px] bg-surface shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        period.status === 'OPEN' ? 'bg-info-subtle text-info border border-info/20' :
                        period.status === 'CALCULATED' ? 'bg-warning-subtle text-warning border border-warning/20' :
                        'bg-success-subtle text-success border border-success/20'
                      }`}>
                        {period.status}
                      </span>
                      <span className="text-sm font-medium text-muted">
                        {t('settlements', 'year')} {period.ethiopian_year} - {t('settlements', 'month')} {period.ethiopian_month}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {t('settlements', 'period')} {period.period_number}
                    </h3>
                    <p className="mt-1 text-sm text-muted flex items-center">
                      {period.start_date_ethiopian} <ArrowRight className="h-3 w-3 mx-1.5" /> {period.end_date_ethiopian}
                    </p>
                    
                    {period.supplier_summary && (
                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted">Total Due:</div>
                        <div className="font-medium text-right text-foreground">{period.supplier_summary.total_due} ETB</div>
                        
                        <div className="text-muted">Total Paid:</div>
                        <div className="font-medium text-right text-success">{period.supplier_summary.total_paid} ETB</div>
                        
                        <div className="text-muted font-bold">Remaining:</div>
                        <div className="font-bold text-right text-danger">{period.supplier_summary.total_remaining} ETB</div>
                        
                        <div className="col-span-2 mt-2 bg-surface-secondary h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-success h-full transition-all" 
                            style={{ width: `${period.supplier_summary.total_due > 0 ? (period.supplier_summary.total_paid / period.supplier_summary.total_due) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    {period.status === 'OPEN' ? (
                       <div className="flex items-center justify-center text-sm font-medium text-info py-2">
                         <Calculator className="h-4 w-4 mr-2" /> {t('settlements', 'liveCalculationActive')}
                       </div>
                    ) : (
                       <div className="flex items-center justify-center text-sm font-medium text-muted py-2">
                         <CheckCircle2 className="h-4 w-4 mr-2 text-success" /> {t('settlements', 'finalized')}
                       </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {loadingSuppliers ? (
            <>
              <div className="hidden sm:block"><SkeletonTable rows={5} /></div>
              <div className="sm:hidden space-y-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </>
          ) : errorSuppliers ? (
            <EmptyState 
              icon={<Users />}
              title="Failed to load payables"
              description="There was an error communicating with the server."
            />
          ) : supplierSettlements.length === 0 ? (
             <EmptyState 
              icon={<Users />}
              title="No supplier settlements"
              description="Calculate a period to generate settlements."
            />
          ) : (
            <div className="space-y-6">
              {groupedSupplierSettlements.map((group, index) => {
                const isExpanded = expandedPeriods[group.period.id] ?? index === 0; // First one expanded by default
                return (
                  <div key={group.period.id} className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-hidden">
                    <div 
                      className="bg-surface-secondary px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-surface-secondary/80 transition-colors"
                      onClick={() => togglePeriod(group.period.id)}
                    >
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {t('settlements', 'year')} {group.period.ethiopian_year} - {t('settlements', 'month')} {group.period.ethiopian_month} (Period {group.period.period_number})
                        </h3>
                        <p className="text-xs text-muted mt-1">{group.period.start_date_ethiopian} - {group.period.end_date_ethiopian}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          group.period.status === 'OPEN' ? 'bg-info-subtle text-info' :
                          group.period.status === 'CALCULATED' ? 'bg-warning-subtle text-warning' :
                          'bg-success-subtle text-success'
                        }`}>
                          {group.period.status}
                        </span>
                        <div className="text-muted">
                          {isExpanded ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t border-border">
                        <div className="hidden sm:block">
                          <table className="min-w-full divide-y divide-border">
                            <thead className="bg-surface">
                              <tr>
                                <th scope="col" className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'supplier')}</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'totalMilk')}</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'amountDue')}</th>
                                <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'status')}</th>
                                <th scope="col" className="py-3 pl-3 pr-6 text-right text-xs font-semibold uppercase tracking-wide text-muted">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 bg-surface">
                              {group.settlements.map((ss) => (
                                <tr key={ss.id} className="hover:bg-surface-secondary/50 transition-colors">
                                  <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-foreground">
                                    {ss.supplier_details?.name}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground font-medium">
                                    {ss.total_milk_collected} L
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-foreground">
                                    {ss.remaining_balance} ETB
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      ss.payment_status === 'PAID' ? 'bg-success-subtle text-success border border-success/20' :
                                      ss.payment_status === 'UNPAID' ? 'bg-danger-subtle text-danger border border-danger/20' :
                                      'bg-warning-subtle text-warning border border-warning/20'
                                    }`}>
                                      {ss.payment_status}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm">
                                    {ss.payment_status !== 'PAID' && ss.remaining_balance > 0 ? (
                                      <Button 
                                        size="sm" 
                                        onClick={() => setPaymentModalState({
                                          isOpen: true,
                                          supplierId: ss.supplier,
                                          settlementId: ss.id,
                                          maxAmount: Number(ss.remaining_balance)
                                        })}
                                      >
                                        Pay
                                      </Button>
                                    ) : (
                                      <span className="text-muted text-xs italic">Settled</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Mobile View inside Accordion */}
                        <div className="sm:hidden flex flex-col divide-y divide-border/50">
                          {group.settlements.map((ss) => (
                            <div key={ss.id} className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-foreground">{ss.supplier_details?.name}</h3>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  ss.payment_status === 'PAID' ? 'bg-success-subtle text-success' :
                                  ss.payment_status === 'UNPAID' ? 'bg-danger-subtle text-danger' :
                                  'bg-warning-subtle text-warning'
                                }`}>
                                  {ss.payment_status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm">
                                <div className="text-muted">Total Milk</div>
                                <div className="font-medium text-foreground text-right">{ss.total_milk_collected} L</div>
                                <div className="text-muted font-medium">Amount Due</div>
                                <div className="font-bold text-foreground text-right">{ss.remaining_balance} ETB</div>
                              </div>
                              
                              {ss.payment_status !== 'PAID' && ss.remaining_balance > 0 && (
                                <div className="mt-4 pt-4 border-t border-border/50">
                                  <Button 
                                    className="w-full"
                                    onClick={() => setPaymentModalState({
                                      isOpen: true,
                                      supplierId: ss.supplier,
                                      settlementId: ss.id,
                                      maxAmount: Number(ss.remaining_balance)
                                    })}
                                  >
                                    Record Payment
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-4">
          {loadingCustomers ? (
            <>
               <div className="hidden sm:block"><SkeletonTable rows={5} /></div>
               <div className="sm:hidden space-y-4">
                 <SkeletonCard />
                 <SkeletonCard />
               </div>
             </>
          ) : errorCustomers ? (
             <EmptyState 
               icon={<Building2 />}
               title="Failed to load receivables"
               description="There was an error communicating with the server."
             />
          ) : customerSettlements.length === 0 ? (
             <EmptyState 
               icon={<Building2 />}
               title="No customer settlements"
               description="Calculate a period to generate settlements."
             />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'customer')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'period')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'netDelivered')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'amountDue')}</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('settlements', 'status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {customerSettlements.map((cs) => (
                      <tr key={cs.id} className="hover:bg-surface-secondary transition-colors">
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-foreground">
                          {cs.customer_details?.business_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-muted">
                          M{cs.settlement_period_details?.ethiopian_month} P{cs.settlement_period_details?.period_number}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground font-medium">
                          {cs.net_quantity} L
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-foreground">
                          {cs.remaining_balance} ETB
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            cs.payment_status === 'PAID' ? 'bg-success-subtle text-success border border-success/20' :
                            cs.payment_status === 'UNPAID' ? 'bg-danger-subtle text-danger border border-danger/20' :
                            'bg-warning-subtle text-warning border border-warning/20'
                          }`}>
                            {cs.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden flex flex-col gap-4">
                {customerSettlements.map((cs) => (
                  <div key={cs.id} className="bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-foreground">{cs.customer_details?.business_name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        cs.payment_status === 'PAID' ? 'bg-success-subtle text-success' :
                        cs.payment_status === 'UNPAID' ? 'bg-danger-subtle text-danger' :
                        'bg-warning-subtle text-warning'
                      }`}>
                        {cs.payment_status}
                      </span>
                    </div>
                    <div className="text-xs text-muted mb-4">Period: M{cs.settlement_period_details?.ethiopian_month} P{cs.settlement_period_details?.period_number}</div>
                    
                    <div className="grid grid-cols-2 gap-y-2 mt-4 text-sm border-t border-border pt-3">
                      <div className="text-muted">Net Delivered</div>
                      <div className="font-medium text-foreground text-right">{cs.net_quantity} L</div>
                      <div className="text-muted font-medium">Amount Due</div>
                      <div className="font-bold text-foreground text-right">{cs.remaining_balance} ETB</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {isModalOpen && (
        <SettlementModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {paymentModalState.supplierId && (
        <PaymentModal
          isOpen={paymentModalState.isOpen}
          onClose={() => setPaymentModalState({ isOpen: false })}
          supplierId={paymentModalState.supplierId}
          settlementId={paymentModalState.settlementId}
          type="PAYMENT"
          maxAmount={paymentModalState.maxAmount}
        />
      )}
    </div>
  );
}
