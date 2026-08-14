import { fetchApi } from '@/lib/api';

export interface Product {
  id?: number;
  name: string;
  category: string;
  unit: string;
  is_active?: boolean;
}

export interface ProductInventory {
  id: number;
  product: number;
  product_details?: Product;
  quantity_available: number | string;
  last_updated: string;
}

export interface ProcessingBatch {
  id?: number;
  ethiopian_date: string;
  ethiopian_year: number;
  ethiopian_month: number;
  ethiopian_day: number;
  product: number;
  product_details?: Product;
  input_milk_quantity: number | string;
  output_quantity: number | string;
  processing_cost: number | string;
  notes?: string;
  created_at?: string;
}

export const getProducts = async (): Promise<Product[]> => {
  return fetchApi('/products/');
};

export const getProductInventory = async (): Promise<ProductInventory[]> => {
  return fetchApi('/product-inventory/');
};

export const getProcessingBatches = async (): Promise<ProcessingBatch[]> => {
  return fetchApi('/processing-batches/');
};

export const createProcessingBatch = async (data: ProcessingBatch): Promise<ProcessingBatch> => {
  return fetchApi('/processing-batches/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
