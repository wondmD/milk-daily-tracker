import { fetchApi } from '@/lib/api';
import { Customer } from './customers';

export interface MilkDelivery {
  id?: number;
  customer: number;
  customer_details?: Customer;
  ethiopian_date: string;
  ethiopian_year: number;
  ethiopian_month: number;
  ethiopian_day: number;
  delivered_quantity: number | string;
  returned_quantity: number | string;
  net_quantity?: number | string;
  price_per_liter: number | string;
  notes?: string;
  created_at?: string;
}

export const getDeliveries = async (): Promise<MilkDelivery[]> => {
  return fetchApi('/milk-deliveries/');
};

export const getDeliveriesByCustomer = async (customerId: number): Promise<MilkDelivery[]> => {
  return fetchApi(`/milk-deliveries/?customer=${customerId}`);
};

export const createDelivery = async (data: MilkDelivery): Promise<MilkDelivery> => {
  return fetchApi('/milk-deliveries/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
