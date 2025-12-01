import { Payment } from '../types';
import { CheckCircle, XCircle, Clock, Package } from 'lucide-react';

interface PaymentsTableProps {
  payments: Payment[];
  totalCount: number;
}

export function PaymentsTable({ payments, totalCount }: PaymentsTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);

    return istDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    const colors = {
      SUCCESS: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
    };
    return colors[statusUpper as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Recent Payments</h2>
            <p className="text-sm text-gray-500 mt-1">Overview of all payment transactions</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 sm:px-4 py-2 rounded-lg">
            <Package className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">{totalCount} Total</span>
          </div>
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No payments found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((payment, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{formatDate(payment.created_at)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{payment.product}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{payment.email}</div>
                  <div className="text-sm text-gray-500">{payment.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(payment.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-100">
        {payments.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No payments found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          payments.map((payment, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">{payment.product}</div>
                  <div className="text-sm text-gray-500">{formatDate(payment.created_at)}</div>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(payment.status)}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                      payment.status
                    )}`}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">{payment.email}</div>
                    <div className="text-sm text-gray-500">{payment.phone}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-base font-bold text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
