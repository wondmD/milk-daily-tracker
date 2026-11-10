'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExpensesByPeriod, ExpensePeriodGroup, Expense } from '@/services/expenses';
import {
  Plus,
  Receipt,
  Calendar,
  CreditCard,
  Edit2,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import ExpenseModal from '@/components/features/expenses/ExpenseModal';
import { useTranslation } from '@/hooks/useTranslation';

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  FUEL: 'bg-orange-100 text-orange-700 border-orange-200',
  TRANSPORTATION: 'bg-blue-100 text-blue-700 border-blue-200',
  WORKER_PAYMENT: 'bg-purple-100 text-purple-700 border-purple-200',
  VEHICLE_MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  PACKAGING: 'bg-teal-100 text-teal-700 border-teal-200',
  ELECTRICITY: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  PROCESSING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  RENT: 'bg-pink-100 text-pink-700 border-pink-200',
  OTHER: 'bg-gray-100 text-gray-600 border-gray-200',
};

function categoryBadge(category: string) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {category.replace(/_/g, ' ')}
    </span>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  return (
    <tr className="hover:bg-surface-secondary transition-colors group">
      <td className="whitespace-nowrap py-3.5 pl-6 pr-3 text-sm font-medium text-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted flex-shrink-0" />
          {expense.ethiopian_date}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-sm">
        {categoryBadge(expense.category)}
      </td>
      <td className="px-3 py-3.5 text-sm text-foreground max-w-xs truncate">
        {expense.description}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-sm font-bold text-danger">
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-danger" />
          {Number(expense.amount).toLocaleString()} ETB
        </div>
      </td>
      <td className="relative whitespace-nowrap py-3.5 pl-3 pr-6 text-right text-sm font-medium">
        <button className="text-muted hover:text-danger transition-colors p-1.5 hover:bg-danger-subtle rounded-[8px] opacity-0 group-hover:opacity-100">
          <Edit2 className="h-3.5 w-3.5" />
          <span className="sr-only">Edit</span>
        </button>
      </td>
    </tr>
  );
}

function ExpenseCard({ expense }: { expense: Expense }) {
  return (
    <div className="bg-surface rounded-[12px] border border-border p-4 relative">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-danger-subtle flex items-center justify-center text-danger border border-danger/20">
          <Receipt className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {categoryBadge(expense.category)}
            <span className="font-bold text-danger text-sm">{Number(expense.amount).toLocaleString()} ETB</span>
          </div>
          <p className="text-xs text-muted mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {expense.ethiopian_date}
          </p>
        </div>
      </div>
      <p className="text-sm text-foreground">{expense.description}</p>
    </div>
  );
}

// ─── Collapsible past-period accordion ───────────────────────────────────────
function PastPeriodAccordion({ group }: { group: ExpensePeriodGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface rounded-[16px] border border-border overflow-hidden shadow-[0_1px_4px_rgb(0,0,0,0.04)]">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-secondary/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center border border-border">
            <Clock className="h-4 w-4 text-muted" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{group.period_name}</p>
            {group.period_start && group.period_end && (
              <p className="text-xs text-muted mt-0.5">
                {group.period_start} — {group.period_end}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted">{group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}</p>
            <p className="text-sm font-bold text-danger">{group.total_amount.toLocaleString()} ETB</p>
          </div>
          <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <ChevronDown className="h-4 w-4 text-muted" />
          </div>
        </div>
      </button>

      {/* Mobile total row */}
      <div className="sm:hidden px-5 pb-3 -mt-2 flex justify-between text-xs">
        <span className="text-muted">{group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}</span>
        <span className="font-bold text-danger">{group.total_amount.toLocaleString()} ETB</span>
      </div>

      {/* Collapsible content */}
      {open && (
        <div className="border-t border-border">
          {group.expenses.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No expenses recorded for this period.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-secondary/60">
                    <tr>
                      <th className="py-3 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Category</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Description</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Amount</th>
                      <th className="relative py-3 pl-3 pr-6"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {group.expenses.map((expense) => (
                      <ExpenseRow key={expense.id} expense={expense} />
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden p-4 space-y-3">
                {group.expenses.map((expense) => (
                  <ExpenseCard key={expense.id} expense={expense} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();

  const { data: periodGroups = [], isLoading, isError } = useQuery({
    queryKey: ['expenses-by-period'],
    queryFn: getExpensesByPeriod,
  });

  const currentGroup = periodGroups.find((g) => g.is_current);
  const pastGroups = periodGroups.filter((g) => !g.is_current);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('expenses', 'title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('expenses', 'subtitle')}</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
          variant="danger"
        >
          {t('expenses', 'recordExpense')}
        </Button>
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
          icon={<Receipt />}
          title="Failed to load expenses"
          description="There was an error communicating with the server."
        />
      ) : (
        <>
          {/* ── Current Period ─────────────────────────────── */}
          <div className="bg-surface rounded-[20px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-border overflow-hidden">
            {/* Current period header */}
            <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-danger-subtle flex items-center justify-center text-danger border border-danger/20">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {currentGroup?.period_name ?? 'Current Period'}
                  </h2>
                  {currentGroup?.period_start && currentGroup.period_end && (
                    <p className="text-xs text-muted mt-0.5">
                      {currentGroup.period_start} — {currentGroup.period_end}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted">Total Expenses</p>
                  <p className="text-xl font-bold text-danger">
                    {(currentGroup?.total_amount ?? 0).toLocaleString()} ETB
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted">Entries</p>
                  <p className="text-xl font-bold text-foreground">
                    {currentGroup?.expenses.length ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Current period expenses */}
            {!currentGroup || currentGroup.expenses.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-surface-secondary flex items-center justify-center text-muted border border-border">
                  <Receipt className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">No expenses yet this period</p>
                  <p className="text-sm text-muted mt-1">Record your first expense to track operational costs.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />} variant="danger" >
                  Record First Expense
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface-secondary">
                      <tr>
                        <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          {t('expenses', 'date')}
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          {t('expenses', 'category')}
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          {t('expenses', 'description')}
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          {t('expenses', 'amount')}
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-6">
                          <span className="sr-only">{t('common', 'actions')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {currentGroup.expenses.map((expense) => (
                        <ExpenseRow key={expense.id} expense={expense} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden p-4 space-y-3">
                  {currentGroup.expenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Past Periods ───────────────────────────────── */}
          {pastGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Clock className="h-4 w-4 text-muted" />
                <h3 className="text-sm font-semibold text-muted uppercase tracking-wide">
                  Past Periods
                </h3>
              </div>
              {pastGroups.map((group) => (
                <PastPeriodAccordion key={group.period_id ?? 'unassigned'} group={group} />
              ))}
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
