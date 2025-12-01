import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Payment, PaymentFilters } from '../types';

const ITEMS_PER_PAGE = 10;

export function usePayments(filters: PaymentFilters, currentPage: number) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);

        let query = supabase
          .from('payments_kb_all')
          .select('*', { count: 'exact' });

        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
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
          query = query.or(`email.ilike.%${filters.searchQuery}%,razorpay_order_id.ilike.%${filters.searchQuery}%`);
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        setPayments(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [filters, currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return { payments, loading, error, totalCount, totalPages, itemsPerPage: ITEMS_PER_PAGE };
}
