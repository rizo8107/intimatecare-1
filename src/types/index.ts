export interface Payment {
  amount: number;
  currency: string;
  status: string;
  razorpay_order_id: string;
  phone: number;
  email: string;
  product: string;
  created_at: string;
  note: string | null;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  successfulPayments: number;
  recentPayments: Payment[];
}

export interface PaymentFilters {
  status: string;
  product: string;
  dateFrom: string;
  dateTo: string;
  searchQuery: string;
  dateRange: 'all' | 'today' | 'yesterday' | 'week' | 'custom';
}
