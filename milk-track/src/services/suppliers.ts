import { fetchApi } from '@/lib/api';

export interface Supplier {
  id?: number;
  name: string;
  supplier_type: string;
  contact_person?: string;
  phone_number?: string;
  address?: string;
  status: string;
  default_milk_price: number | string;
  payment_information?: string;
  notes?: string;
  created_date?: string;
  current_period_milk?: number;
  current_period_price?: number;
  period_name?: string;
  period_start?: string;
  period_end?: string;
  has_record_today?: boolean;
}

export interface SupplierSettlementHistory {
  id: number;
  period_id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  total_milk: number;
  unit_price_avg: number;
  gross_amount: number;
  adjustments: number;
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  payment_status: string;
  status: string;
}

export const getSuppliers = async (): Promise<Supplier[]> => {
  return fetchApi('/suppliers/');
};

export const createSupplier = async (data: Supplier): Promise<Supplier> => {
  return fetchApi('/suppliers/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateSupplier = async (id: number, data: Supplier): Promise<Supplier> => {
  return fetchApi(`/suppliers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getSupplierCurrentPeriodSummary = async (): Promise<Supplier[]> => {
  return fetchApi('/suppliers/current_period_summary/');
};

export const getSupplier = async (id: number): Promise<Supplier> => {
  return fetchApi(`/suppliers/${id}/`);
};

export const getSupplierSettlementsHistory = async (id: number): Promise<SupplierSettlementHistory[]> => {
  return fetchApi(`/suppliers/${id}/settlements_history/`);
};
