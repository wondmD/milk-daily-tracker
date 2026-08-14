'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupplier, getSupplierSettlementsHistory } from '@/services/suppliers';
import { getCollectionsBySupplier, MilkCollection } from '@/services/collections';
import { ArrowLeft, User, Calendar, Droplets, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import PaymentModal from '@/components/features/payments/PaymentModal';
import CollectionModal from '@/components/features/collections/CollectionModal';
import Button from '@/components/ui/Button';

export default function SupplierDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    type: 'PAYMENT' | 'ADVANCE';
    settlementId?: number;
    maxAmount?: number;
  }>({ isOpen: false, type: 'ADVANCE' });
  const [editingRecord, setEditingRecord] = useState<MilkCollection | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: supplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['supplier_history', id],
    queryFn: () => getSupplierSettlementsHistory(id),
  });

  const { data: collections = [], isLoading: isLoadingCollections } = useQuery({
    queryKey: ['supplier_collections', id],
    queryFn: () => getCollectionsBySupplier(id),
  });

  const periods = useMemo(() => {
    if (!collections.length && !history.length) return [];

    const grouped: Record<string, any> = {};

    // Group collections by period
    collections.forEach(col => {
      const periodNum = col.ethiopian_day <= 15 ? 1 : 2;
      const periodName = `Period ${periodNum} - Month ${col.ethiopian_month}, Year ${col.ethiopian_year}`;
      
      if (!grouped[periodName]) {
        grouped[periodName] = {
          periodName,
          startDate: '', // Overwritten by history if exists
          endDate: '',
          totalMilk: 0,
          grossAmount: 0,
          adjustments: 0,
          totalAmount: 0,
          amountPaid: 0,
          remainingBalance: 0,
          paymentStatus: 'ONGOING',
          records: [],
          ethiopianYear: col.ethiopian_year,
          ethiopianMonth: col.ethiopian_month,
          periodNum
        };
      }
      
      grouped[periodName].records.push(col);
      grouped[periodName].totalMilk += Number(col.total_quantity || 0);
      grouped[periodName].grossAmount += Number(col.total_quantity || 0) * Number(col.price_per_liter || 0);
      grouped[periodName].totalAmount = grouped[periodName].grossAmount; // For ongoing, they are the same initially
    });

    // Merge with finalized settlement history
    history.forEach(hist => {
      if (!grouped[hist.period_name]) {
        grouped[hist.period_name] = {
          periodName: hist.period_name,
          startDate: hist.start_date,
          endDate: hist.end_date,
          totalMilk: 0,
          grossAmount: 0,
          adjustments: 0,
          totalAmount: 0,
          amountPaid: 0,
          remainingBalance: 0,
          paymentStatus: hist.payment_status,
          records: [],
          ethiopianYear: parseInt(hist.period_name.match(/Year (\d+)/)?.[1] || '0'),
          ethiopianMonth: parseInt(hist.period_name.match(/Month (\d+)/)?.[1] || '0'),
          periodNum: parseInt(hist.period_name.match(/Period (\d)/)?.[1] || '0'),
        };
      }
      
      const p = grouped[hist.period_name];
      p.periodId = hist.period_id;
      p.settlementId = hist.id;
      p.totalMilk = hist.total_milk;
      p.grossAmount = hist.gross_amount;
      p.adjustments = hist.adjustments;
      p.totalAmount = hist.total_amount;
      p.amountPaid = hist.amount_paid;
      p.remainingBalance = hist.remaining_balance;
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
      p.records.sort((a: MilkCollection, b: MilkCollection) => b.ethiopian_day - a.ethiopian_day);
    });

    return sortedPeriods;
  }, [collections, history]);

  const togglePeriod = (periodName: string) => {
    setExpandedPeriod(expandedPeriod === periodName ? null : periodName);
  };

  const isLoading = isLoadingSupplier || isLoadingHistory || isLoadingCollections;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/collections" className="p-2 bg-surface rounded-[10px] border border-border text-muted hover:text-foreground transition-colors shadow-sm">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Supplier Details</h1>
          <p className="mt-1 text-sm text-muted">View historical collection records and settlements.</p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={() => setPaymentModalState({ isOpen: true, type: 'ADVANCE' })}
          variant="outline"
          className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
        >
          Record Advance (Loan)
        </Button>
      </div>

      {isLoadingSupplier ? (
        <SkeletonCard />
      ) : supplier ? (
        <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-surface-secondary border border-border flex items-center justify-center text-muted flex-shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{supplier.name}</h2>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="text-muted">
                  <span className="font-semibold text-foreground/80">Phone:</span> {supplier.phone_number || '-'}
                </div>
                <div className="text-muted">
                  <span className="font-semibold text-foreground/80">Type:</span> {supplier.supplier_type}
                </div>
                <div className="text-muted">
                  <span className="font-semibold text-foreground/80">Status:</span> 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    supplier.status === 'ACTIVE' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                  }`}>
                    {supplier.status}
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
            description="This supplier has no collection history."
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
                  
                  <div className="hidden sm:flex items-center gap-6 mr-6">
                    <div>
                      <div className="text-[11px] text-muted mb-0.5 font-medium uppercase tracking-wider">Milk</div>
                      <div className="font-bold text-foreground text-sm">{period.totalMilk} L</div>
                    </div>
                    {period.adjustments !== 0 && (
                      <div>
                        <div className="text-[11px] text-muted mb-0.5 font-medium uppercase tracking-wider">Adjustments</div>
                        <div className="font-bold text-danger text-sm">{period.adjustments} ETB</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] text-muted mb-0.5 font-medium uppercase tracking-wider">Final Payable</div>
                      <div className="font-bold text-primary text-sm">{period.totalAmount} ETB</div>
                    </div>
                    {period.paymentStatus !== 'ONGOING' && (
                      <div className="flex flex-col items-end">
                        <div className="text-[11px] text-muted mb-0.5 font-medium uppercase tracking-wider">Balance</div>
                        <div className={`font-bold text-sm ${period.remainingBalance > 0 ? 'text-warning' : 'text-success'}`}>
                          {period.remainingBalance} ETB
                        </div>
                        {period.remainingBalance > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentModalState({
                                isOpen: true,
                                type: 'PAYMENT',
                                settlementId: period.settlementId,
                                maxAmount: period.remainingBalance
                              });
                            }}
                            className="mt-1 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full hover:bg-primary-hover transition-colors"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center text-muted border border-border">
                    {expandedPeriod === period.periodName ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                
                {expandedPeriod === period.periodName && (
                  <div className="border-t border-border bg-surface-secondary/50">
                    {period.records.length === 0 ? (
                      <div className="p-8 text-center text-muted text-sm flex flex-col items-center">
                        <Droplets className="h-8 w-8 mb-2 opacity-50" />
                        No daily collection records found for this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-surface">
                            <tr>
                              <th scope="col" className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Morning</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Evening</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Total</th>
                              <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Price</th>
                              <th scope="col" className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50 bg-transparent">
                            {period.records.map((record: MilkCollection) => (
                              <tr key={record.id} className="hover:bg-surface transition-colors">
                                <td className="whitespace-nowrap py-3 pl-6 pr-3 text-sm font-medium text-foreground">
                                  {record.ethiopian_date}
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm text-muted">
                                  {record.morning_quantity} L
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm text-muted">
                                  {record.evening_quantity} L
                                </td>
                                <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-primary">
                                  {record.total_quantity} L
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

      <PaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState({ ...paymentModalState, isOpen: false })}
        supplierId={id}
        settlementId={paymentModalState.settlementId}
        type={paymentModalState.type}
        maxAmount={paymentModalState.maxAmount}
      />

      <CollectionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        collection={editingRecord}
      />
    </div>
  );
}
