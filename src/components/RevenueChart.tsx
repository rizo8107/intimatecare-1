import { Payment } from '../types';

interface RevenueChartProps {
  payments: Payment[];
}

export function RevenueChart({ payments }: RevenueChartProps) {
  const revenueByProduct = payments.reduce((acc, payment) => {
    if (payment.status === 'SUCCESS') {
      const product = payment.product;
      if (!acc[product]) {
        acc[product] = 0;
      }
      acc[product] += payment.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalRevenue = Object.values(revenueByProduct).reduce((sum, val) => sum + val, 0);

  const productData = Object.entries(revenueByProduct).map(([product, revenue]) => ({
    product,
    revenue,
    percentage: ((revenue / totalRevenue) * 100).toFixed(1),
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
                <p className="text-sm text-gray-500">{item.percentage}%</p>
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
