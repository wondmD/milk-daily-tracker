import { fetchApi } from '@/lib/api';

export interface DashboardSummary {
  year: number;
  month: number;
  revenue: number;
  supplier_payments: number;
  operational_expenses: number;
  total_expenses: number;
  net_margin: number;
}

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

export const getTopSuppliers = async (limit: number = 5): Promise<TopSupplier[]> => {
  return fetchApi(`/reports/top-suppliers/?limit=${limit}`);
};
