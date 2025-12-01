import { Filter, X, Search } from 'lucide-react';
import { PaymentFilters } from '../types';

interface FilterPanelProps {
  filters: PaymentFilters;
  onFiltersChange: (filters: PaymentFilters) => void;
  products: string[];
}

export function FilterPanel({ filters, onFiltersChange, products }: FilterPanelProps) {
  const handleReset = () => {
    onFiltersChange({
      status: 'all',
      product: 'all',
      dateFrom: '',
      dateTo: '',
      searchQuery: '',
      dateRange: 'all',
    });
  };

  const handleDateRangeChange = (range: 'all' | 'today' | 'yesterday' | 'week' | 'custom') => {
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(today.getTime() + istOffset);

    let dateFrom = '';
    let dateTo = '';

    if (range === 'today') {
      const year = istDate.getUTCFullYear();
      const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      dateFrom = todayStr;
      dateTo = todayStr;
    } else if (range === 'yesterday') {
      const yesterday = new Date(istDate.getTime() - 24 * 60 * 60 * 1000);
      const year = yesterday.getUTCFullYear();
      const month = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getUTCDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;
      dateFrom = yesterdayStr;
      dateTo = yesterdayStr;
    } else if (range === 'week') {
      const weekAgo = new Date(istDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const yearFrom = weekAgo.getUTCFullYear();
      const monthFrom = String(weekAgo.getUTCMonth() + 1).padStart(2, '0');
      const dayFrom = String(weekAgo.getUTCDate()).padStart(2, '0');
      dateFrom = `${yearFrom}-${monthFrom}-${dayFrom}`;

      const yearTo = istDate.getUTCFullYear();
      const monthTo = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const dayTo = String(istDate.getUTCDate()).padStart(2, '0');
      dateTo = `${yearTo}-${monthTo}-${dayTo}`;
    }

    onFiltersChange({
      ...filters,
      dateRange: range,
      dateFrom: range === 'custom' ? filters.dateFrom : dateFrom,
      dateTo: range === 'custom' ? filters.dateTo : dateTo,
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.product !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.searchQuery;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or order ID..."
                value={filters.searchQuery}
                onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              value={filters.product}
              onChange={(e) => onFiltersChange({ ...filters, product: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              <option value="all">All Products</option>
              {products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => handleDateRangeChange('all')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                filters.dateRange === 'all'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDateRangeChange('today')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                filters.dateRange === 'today'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateRangeChange('yesterday')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                filters.dateRange === 'yesterday'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => handleDateRangeChange('week')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                filters.dateRange === 'week'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDateRangeChange('custom')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                filters.dateRange === 'custom'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
          </div>

          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
