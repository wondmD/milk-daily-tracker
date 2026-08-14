import { fetchApi } from '@/lib/api';

export interface Customer {
  id?: number;
  business_name: string;
  contact_person?: string;
  phone_number?: string;
  location?: string;
  address?: string;
  default_milk_price: number | string;
  status: string;
  notes?: string;
  created_date?: string;
  current_period_milk?: number;
  current_period_price?: number;
  period_name?: string;
  period_start?: string;
  period_end?: string;
  has_record_today?: boolean;
}

export interface CustomerSettlementHistory {
  id: number;
  period_id: number;
  period_name: string;
  start_date: string;
  end_date: string;
  total_milk: number;
  unit_price_avg: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  status: string;
}

export const getCustomers = async (): Promise<Customer[]> => {
  return fetchApi('/customers/');
};

export const createCustomer = async (data: Customer): Promise<Customer> => {
  return fetchApi('/customers/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCustomer = async (id: number, data: Customer): Promise<Customer> => {
  return fetchApi(`/customers/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const getCustomerCurrentPeriodSummary = async (): Promise<Customer[]> => {
  return fetchApi('/customers/current_period_summary/');
};

export const getCustomer = async (id: number): Promise<Customer> => {
  return fetchApi(`/customers/${id}/`);
};

export const getCustomerSettlementsHistory = async (id: number): Promise<CustomerSettlementHistory[]> => {
  return fetchApi(`/customers/${id}/settlements_history/`);
};
