import { fetchApi } from '@/lib/api';

export interface DashboardSummary {
  year: number;
  month: number;
  sales: number;
  walk_in_sales: number;
  milk_cost: number;
  revenue: number;
  supplier_payments: number;
  operational_expenses: number;
  total_expenses: number;
  receivable: number;
  payable: number;
  profit: number;
  net_margin: number;
}

export interface OperationsDashboard {
  date: { year: number; month: number; day: number };
  period: {
    id: number;
    year: number;
    month: number;
    period_number: number;
    start: string;
    end: string;
  };
  milk: {
    collected: number;
    delivered: number;
    returned: number;
    processed: number;
    wasted: number;
    on_hand: number;
  };
  finance: {
    sales: number;
    walk_in_sales: number;
    milk_cost: number;
    operational_expenses: number;
    receivable: number;
    payable: number;
    profit: number;
  };
}

export const getOperationsDashboard = async (): Promise<OperationsDashboard> => {
  return fetchApi('/reports/operations-dashboard/');
};

export const getDashboardSummary = async (year?: number, month?: number): Promise<DashboardSummary> => {
  let url = '/reports/dashboard-summary/';
  if (year && month) {
    url += `?year=${year}&month=${month}`;
  }
  return fetchApi(url);
};

export interface TrendSummary {
  date: string;
  day: number;
  month: number;
  collected: number;
  delivered: number;
}

export const getTrendSummary = async (days: number = 14): Promise<TrendSummary[]> => {
  return fetchApi(`/reports/trend-summary/?days=${days}`);
};

export interface TopSupplier {
  name: string;
  volume: number;
}

export const getTopSuppliers = async (limit: number = 5, year?: number, month?: number): Promise<TopSupplier[]> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  return fetchApi(`/reports/top-suppliers/?${params.toString()}`);
};
