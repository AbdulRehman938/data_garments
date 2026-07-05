import { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp, FiShoppingBag, FiUsers, FiCalendar } from 'react-icons/fi';

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  monthlyRevenue: number[];
  topProducts: Array<{ name: string; revenue: number; orders: number }>;
}

const AdminSales = () => {
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    monthlyRevenue: [],
    topProducts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchSalesData();
  }, [selectedPeriod]);

  const fetchSalesData = async () => {
    try {
      // Note: Sales/revenue data requires an orders table
      // TODO: Connect to orders table when available
      setSalesData({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        monthlyRevenue: [0, 0, 0, 0, 0, 0],
        topProducts: [],
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const periodOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6  h-16">
        <h1 className="font-serif text-3xl text-logo-black">Sales & Revenue</h1>
        <div className="flex items-center gap-2">
          <FiCalendar className="text-logo-black/40" size={20} />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-logo-black/60">Loading sales data...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Revenue"
              value={`$${salesData.totalRevenue.toLocaleString()}`}
              icon={FiDollarSign}
              color="bg-pop-orchid"
              trend="+12.5%"
            />
            <StatCard
              title="Total Orders"
              value={salesData.totalOrders}
              icon={FiShoppingBag}
              color="bg-energy-apricot"
              trend="+8.2%"
            />
            <StatCard
              title="Avg Order Value"
              value={`$${salesData.averageOrderValue.toFixed(2)}`}
              icon={FiTrendingUp}
              color="bg-logo-rose"
              trend="+5.1%"
            />
            <StatCard
              title="Active Customers"
              value="89"
              icon={FiUsers}
              color="bg-action-bordeaux"
              trend="+15.3%"
            />
          </div>

          {/* Revenue Chart Placeholder */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-logo-rose/20">
            <h2 className="font-serif text-xl text-logo-black mb-4">Revenue Trend</h2>
            <div className="h-64 flex items-end justify-between gap-2">
              {salesData.monthlyRevenue.map((revenue, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-action-bordeaux rounded-t-lg transition-all hover:bg-logo-black"
                    style={{
                      height: `${(revenue / Math.max(...salesData.monthlyRevenue)) * 100}%`,
                    }}
                  />
                  <span className="text-xs text-logo-black/60 mt-2">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-logo-rose/20">
            <h2 className="font-serif text-xl text-logo-black mb-4">Top Selling Products</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-logo-rose/10">
                  <th className="text-left py-3 text-sm font-semibold text-logo-black">Product</th>
                  <th className="text-right py-3 text-sm font-semibold text-logo-black">Orders</th>
                  <th className="text-right py-3 text-sm font-semibold text-logo-black">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {salesData.topProducts.map((product, index) => (
                  <tr key={index} className="border-b border-logo-rose/10">
                    <td className="py-3 text-logo-black">{product.name}</td>
                    <td className="py-3 text-right text-logo-black/60">{product.orders}</td>
                    <td className="py-3 text-right font-medium text-logo-black">
                      ${product.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <div className="bg-white rounded-2xl shadow-sm p-6 border border-logo-rose/20">
    <div className="flex items-center justify-between mb-4">
      <div className={`${color} p-3 rounded-xl`}>
        <Icon className="text-white" size={24} />
      </div>
      <span className="text-energy-apricot text-sm font-medium">{trend}</span>
    </div>
    <p className="text-logo-black/60 text-sm mb-1">{title}</p>
    <p className="text-2xl font-bold text-logo-black">{value}</p>
  </div>
);

export default AdminSales;
