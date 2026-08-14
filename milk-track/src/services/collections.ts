import { fetchApi } from '@/lib/api';
import { Supplier } from './suppliers';

export interface MilkCollection {
  id?: number;
  supplier: number;
  supplier_details?: Supplier;
  ethiopian_date: string;
  ethiopian_year: number;
  ethiopian_month: number;
  ethiopian_day: number;
  morning_quantity: number | string;
  evening_quantity: number | string;
  total_quantity?: number | string;
  price_per_liter: number | string;
  notes?: string;
  created_at?: string;
}

export const getCollections = async (): Promise<MilkCollection[]> => {
  return fetchApi('/milk-collections/');
};

export const getCollectionsBySupplier = async (supplierId: number): Promise<MilkCollection[]> => {
  return fetchApi(`/milk-collections/?supplier=${supplierId}`);
};

export const createCollection = async (data: MilkCollection): Promise<MilkCollection> => {
  return fetchApi('/milk-collections/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCollection = async (id: number, data: MilkCollection): Promise<MilkCollection> => {
  return fetchApi(`/milk-collections/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
