import { fetchApi } from '@/lib/api';

export interface SystemSettings {
  default_supplier_milk_price: number | string;
  updated_at?: string;
}

export const getSystemSettings = async (): Promise<SystemSettings> => {
  return fetchApi('/settings/');
};

export const updateSystemSettings = async (data: SystemSettings): Promise<SystemSettings> => {
  return fetchApi('/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
