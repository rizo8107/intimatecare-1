import { Payment } from '../types';

interface RevenueChartProps {
  payments: Payment[];
}

export function RevenueChart({ payments }: RevenueChartProps) {
  const revenueByProduct = payments.reduce((acc, payment) => {
    if (payment.status === 'SUCCESS') {
      const product = payment.product;
      if (!acc[product]) {
        acc[product] = { revenue: 0, count: 0 };
      }
      acc[product].revenue += payment.amount;
      acc[product].count += 1;
    }
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  const totals = Object.values(revenueByProduct).reduce(
    (sum, val) => {
      sum.revenue += val.revenue;
      sum.count += val.count;
      return sum;
    },
    { revenue: 0, count: 0 }
  );

  const totalRevenue = totals.revenue;
  const totalSales = totals.count;

  const productData = Object.entries(revenueByProduct).map(([product, value]) => ({
    product,
    revenue: value.revenue,
    count: value.count,
    percentage: totalRevenue > 0 ? ((value.revenue / totalRevenue) * 100).toFixed(1) : '0.0',
  }));

  const colors = [
    { bg: 'bg-blue-500', text: 'text-blue-500' },
    { bg: 'bg-green-500', text: 'text-green-500' },
    { bg: 'bg-amber-500', text: 'text-amber-500' },
    { bg: 'bg-rose-500', text: 'text-rose-500' },
    { bg: 'bg-cyan-500', text: 'text-cyan-500' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Revenue by Product</h2>
      <p className="text-sm text-gray-500 mb-4">
        Total revenue: <span className="font-semibold text-gray-800">₹{totalRevenue.toLocaleString('en-IN')}</span>
        {totalSales > 0 && (
          <>
            {' '}
            · Total sales:{' '}
            <span className="font-semibold text-gray-800">{totalSales}</span>
          </>
        )}
      </p>
      <div className="space-y-4">
        {productData.map((item, index) => (
          <div key={item.product} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors[index % colors.length].bg}`} />
                <span className="font-medium text-gray-700 capitalize">{item.product}</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">
                  ₹{item.revenue.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-gray-500">
                  {item.percentage}%
                  {item.count > 0 && (
                    <span className="ml-1">
                      · {item.count} sale{item.count === 1 ? '' : 's'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${colors[index % colors.length].bg} transition-all duration-500`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
