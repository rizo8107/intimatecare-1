import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Payment, PaymentFilters } from '../types';

export function useAllPayments(filters?: PaymentFilters) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        let query = supabase
          .from('payments_kb_all')
          .select('*');

        if (filters) {
          if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status.toUpperCase());
          }

          if (filters.product && filters.product !== 'all') {
            query = query.eq('product', filters.product);
          }

          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            query = query.gte('created_at', fromDate.toISOString());
          }

          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('created_at', toDate.toISOString());
          }

          if (filters.searchQuery) {
            query = query.or(`email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%,razorpay_order_id.ilike.%${filters.searchQuery}%`);
          }
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;
        setPayments(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [filters]);

  return { payments, loading, error };
}
