import { fetchApi } from '@/lib/api';
import { Supplier } from './suppliers';
import { Customer } from './customers';

export interface SettlementPeriod {
  id?: number;
  ethiopian_year: number;
  ethiopian_month: number;
  period_number: number;
  start_date_ethiopian: string;
  end_date_ethiopian: string;
  status: string;
  created_at?: string;
  supplier_summary?: {
    total_due: number;
    total_paid: number;
    total_remaining: number;
  };
  customer_summary?: {
    total_due: number;
    total_paid: number;
    total_remaining: number;
  };
}

export interface SupplierSettlement {
  id: number;
  supplier: number;
  supplier_details?: Supplier;
  settlement_period: number;
  settlement_period_details?: SettlementPeriod;
  total_milk_collected: number | string;
  gross_amount: number | string;
  adjustments: number | string;
  final_amount: number | string;
  amount_paid: number | string;
  remaining_balance: number | string;
  payment_status: string;
}

export interface CustomerSettlement {
  id: number;
  customer: number;
  customer_details?: Customer;
  settlement_period: number;
  settlement_period_details?: SettlementPeriod;
  total_delivered: number | string;
  total_returned: number | string;
  net_quantity: number | string;
  gross_amount: number | string;
  adjustments: number | string;
  final_amount: number | string;
  amount_paid: number | string;
  remaining_balance: number | string;
  payment_status: string;
}

export const getSettlementPeriods = async (): Promise<SettlementPeriod[]> => {
  return fetchApi('/settlement-periods/');
};

export const createSettlementPeriod = async (data: SettlementPeriod): Promise<SettlementPeriod> => {
  return fetchApi('/settlement-periods/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const generateSettlements = async (periodId: number): Promise<any> => {
  return fetchApi(`/settlement-periods/${periodId}/calculate_settlements/`, {
    method: 'POST',
  });
};

export const getSupplierSettlements = async (): Promise<SupplierSettlement[]> => {
  return fetchApi('/supplier-settlements/');
};

export const getCustomerSettlements = async (): Promise<CustomerSettlement[]> => {
  return fetchApi('/customer-settlements/');
};
