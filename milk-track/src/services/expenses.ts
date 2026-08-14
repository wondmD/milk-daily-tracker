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

export const getExpenses = async (): Promise<Expense[]> => {
  return fetchApi('/expenses/');
};

export const createExpense = async (data: Expense): Promise<Expense> => {
  return fetchApi('/expenses/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
