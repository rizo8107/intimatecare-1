import { useState } from 'react';
import { usePayments } from './hooks/usePayments';
import { useAllPayments } from './hooks/useAllPayments';
import { StatCard } from './components/StatCard';
import { PaymentsTable } from './components/PaymentsTable';
import { RevenueChart } from './components/RevenueChart';
import { Sidebar } from './components/Sidebar';
import { FilterPanel } from './components/FilterPanel';
import { Pagination } from './components/Pagination';
import TelegramSubscriptionsPage from './components/TelegramSubscriptionsPage';
import { DollarSign, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { PaymentFilters } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    product: 'all',
    dateFrom: '',
    dateTo: '',
    searchQuery: '',
    dateRange: 'all',
  });

  const { payments: allPayments } = useAllPayments(filters);
  const {
    payments,
    loading,
    error,
    totalCount,
    totalPages,
    itemsPerPage,
  } = usePayments(filters, currentPage);

  const handleFiltersChange = (newFilters: PaymentFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const successfulPayments = allPayments.filter((p) => p.status === 'SUCCESS');
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalOrders = allPayments.length;
  const uniqueCustomers = new Set(allPayments.map((p) => p.email)).size;

  const uniqueProducts = Array.from(new Set(allPayments.map((p) => p.product)));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-auto lg:max-w-[calc(100vw-256px)]">
        <div className="max-w-8xl mx-auto px-4 sm:px-2 lg:px-4 pt-16 lg:pt-8">
          {activeTab === 'telegram-subscriptions' ? (
            <TelegramSubscriptionsPage />
          ) : (
            <>
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Track your Intimate talks and revenue insights</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <StatCard
                  title="Total Revenue"
                  value={`₹${totalRevenue.toLocaleString('en-IN')}`}
                  icon={DollarSign}
                  bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
                  iconColor="text-blue-500"
                />
                <StatCard
                  title="Total Orders"
                  value={totalOrders}
                  icon={ShoppingBag}
                  bgColor="bg-gradient-to-br from-green-500 to-green-600"
                  iconColor="text-green-500"
                />
                <StatCard
                  title="Successful"
                  value={successfulPayments.length}
                  icon={TrendingUp}
                  bgColor="bg-gradient-to-br from-amber-500 to-amber-600"
                  iconColor="text-amber-500"
                />
                <StatCard
                  title="Customers"
                  value={uniqueCustomers}
                  icon={Users}
                  bgColor="bg-gradient-to-br from-rose-500 to-rose-600"
                  iconColor="text-rose-500"
                />
              </div>

              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                products={uniqueProducts}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                  {loading ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                      <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading Intimate talks...</p>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                      <p className="text-red-600 font-medium">Error: {error}</p>
                    </div>
                  ) : (
                    <>
                      <PaymentsTable payments={payments} totalCount={totalCount} />
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={totalCount}
                        itemsPerPage={itemsPerPage}
                      />
                    </>
                  )}
                </div>
                <div className="lg:col-span-1">
                  <RevenueChart payments={successfulPayments} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
