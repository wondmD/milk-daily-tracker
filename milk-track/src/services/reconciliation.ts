import { fetchApi } from '@/lib/api';

export interface DailyReconciliation {
  date: string;
  collected: number;
  returned: number;
  total_available: number;
  delivered: number;
  processed: number;
  stored: number;
  wasted: number;
  sale_other: number;
  adjusted: number;
  total_accounted_out: number;
  net_balance: number;
  is_reconciled: boolean;
}

export const getDailyReconciliation = async (year: number, month: number, day: number): Promise<DailyReconciliation> => {
  return fetchApi(`/daily-reconciliation/${year}/${month}/${day}/`);
};
