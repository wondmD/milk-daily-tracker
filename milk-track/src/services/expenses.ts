import { fetchApi } from '@/lib/api';
import { SettlementPeriod } from './settlements';

export interface Expense {
  id?: number;
  category: string;
  amount: number | string;
  ethiopian_date: string;
  ethiopian_year: number;
  ethiopian_month: number;
  ethiopian_day: number;
  description: string;
  payment_method?: string;
  related_activity?: string;
  receipt_reference?: string;
  settlement_period?: number;
  settlement_period_details?: SettlementPeriod;
  created_at?: string;
}

export interface ExpensePeriodGroup {
  period_id: number | null;
  period_name: string;
  period_start: string | null;
  period_end: string | null;
  is_current: boolean;
  total_amount: number;
  expenses: Expense[];
}

export const getExpenses = async (): Promise<Expense[]> => {
  return fetchApi('/expenses/');
};

export const getExpensesByPeriod = async (): Promise<ExpensePeriodGroup[]> => {
  return fetchApi('/expenses/by_period/');
};

export const createExpense = async (data: Expense): Promise<Expense> => {
  return fetchApi('/expenses/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

