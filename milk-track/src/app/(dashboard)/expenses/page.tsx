'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExpenses } from '@/services/expenses';
import { Plus, Search, Receipt, Calendar, CreditCard, Edit2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import ExpenseModal from '@/components/features/expenses/ExpenseModal';
import { useTranslation } from '@/hooks/useTranslation';

export default function ExpensesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();
  
  const { data: expenses = [], isLoading, isError } = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
  });

  const filteredExpenses = expenses.filter(e => 
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

      <div className="flex items-center max-w-md bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border px-3 py-2">
        <Search className="h-5 w-5 text-muted" />
        <input
          type="text"
          placeholder={t('expenses', 'searchPlaceholder')}
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
          icon={<Receipt />}
          title="Failed to load expenses"
          description="There was an error communicating with the server."
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState 
          icon={<Receipt />}
          title="No expenses found"
          description={searchTerm ? "Try adjusting your search query." : "You haven't recorded any expenses yet."}
          action={!searchTerm ? (
            <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />} variant="danger">
              Record First Expense
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
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('expenses', 'date')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('expenses', 'category')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('expenses', 'description')}</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">{t('expenses', 'amount')}</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6"><span className="sr-only">{t('common', 'actions')}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-muted" />
                        {expense.ethiopian_date}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                      <span className="inline-flex items-center rounded-full bg-surface-secondary border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                        {expense.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-foreground">
                      {expense.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-danger">
                      <div className="flex items-center">
                        <CreditCard className="mr-1.5 h-4 w-4 text-danger" />
                        {expense.amount} ETB
                      </div>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button className="text-muted hover:text-danger transition-colors p-2 hover:bg-danger-subtle rounded-[10px]">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit Record</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="sm:hidden flex flex-col gap-4">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="bg-surface rounded-[14px] shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] border border-border p-4 relative">
                <button className="absolute top-4 right-4 p-2 text-muted hover:text-danger hover:bg-danger-subtle rounded-[10px] transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-danger-subtle flex items-center justify-center text-danger font-bold border border-danger/20 mr-3">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{expense.category.replace('_', ' ')}</h3>
                    <p className="text-xs text-muted flex items-center mt-0.5">
                      <Calendar className="h-3 w-3 mr-1" /> {expense.ethiopian_date}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-foreground mb-4">{expense.description}</p>

                <div className="flex justify-between items-center border-t border-border pt-3">
                  <span className="text-sm text-muted font-medium">{t('expenses', 'totalCost')}</span>
                  <span className="font-bold text-danger text-lg">{expense.amount} ETB</span>
                </div>
              </div>
            ))}
          </div>
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
