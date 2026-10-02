import type { QueryClient } from '@tanstack/react-query';

const OPERATIONAL_QUERY_KEYS = [
  'collections',
  'distributions',
  'processing-batches',
  'product-inventory',
  'reconciliation',
  'daily-reconciliation',
  'operations-dashboard',
  'supplier-settlements',
  'customer-settlements',
  'settlement-periods',
  'suppliers',
  'customers',
  'suppliers_summary',
  'customers_summary',
  'dashboard-summary',
  'trend-summary',
  'top-suppliers',
  'supplier_history',
  'customer_history',
  'supplier_collections',
  'customer_deliveries',
  'supplier_advances',
] as const;

export function invalidateOperationalData(queryClient: QueryClient) {
  for (const key of OPERATIONAL_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}
