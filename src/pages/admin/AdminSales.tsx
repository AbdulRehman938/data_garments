/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { useState, useEffect, useCallback } from 'react';
import { FiDollarSign, FiTrendingUp, FiShoppingBag, FiCalendar, FiClock } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface TopProduct {
  name: string;
  revenue: number;
  orders: number;
}

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  pendingOrders: number;
  monthlyData: Array<{ name: string; revenue: number; orders: number }>;
  topProducts: TopProduct[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AdminSales = () => {
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    monthlyData: MONTHS.map(name => ({ name, revenue: 0, orders: 0 })),
    topProducts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const fetchSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all non-cancelled orders for the selected year
      const yearStart = `${selectedYear}-01-01T00:00:00.000Z`;
      const yearEnd = `${selectedYear}-12-31T23:59:59.999Z`;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .gte('created_at', yearStart)
        .lte('created_at', yearEnd)
        .not('status', 'eq', 'cancelled');

      if (error) throw error;

      const allOrders = orders || [];

      // Overall stats
      const totalRevenue = allOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const totalOrders = allOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Pending orders count (all time)
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Monthly revenue breakdown
      const monthlyData = MONTHS.map(name => ({ name, revenue: 0, orders: 0 }));
      allOrders.forEach((o) => {
        const month = new Date(o.created_at).getMonth(); // 0-indexed
        monthlyData[month].revenue += o.total_amount || 0;
        monthlyData[month].orders += 1;
      });

      // Top products by revenue (we'll skip this for now if items column isn't available)
      const productMap: Record<string, { name: string; revenue: number; orders: number }> = {};

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setSalesData({ totalRevenue, totalOrders, averageOrderValue, pendingOrders: pendingCount || 0, monthlyData, topProducts });
    } catch (err) {
      console.error('Sales data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchSalesData(); }, [fetchSalesData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Sales & Revenue</h1>
        <div className="flex items-center gap-2">
          <FiCalendar className="text-logo-black/40" size={18} />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-logo-black/50 font-sans">Loading sales data...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue"    value={`PKR ${salesData.totalRevenue.toLocaleString()}`}      icon={FiDollarSign}  color="bg-action-bordeaux" />
            <StatCard title="Total Orders"     value={salesData.totalOrders}                                 icon={FiShoppingBag} color="bg-energy-apricot" />
            <StatCard title="Avg Order Value"  value={`PKR ${Math.round(salesData.averageOrderValue).toLocaleString()}`} icon={FiTrendingUp} color="bg-logo-rose" />
            <StatCard title="Pending Orders"   value={salesData.pendingOrders}                               icon={FiClock}       color="bg-amber-500" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue - Area Chart */}
            <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
              <h2 className="font-serif text-xl text-logo-black mb-6">Monthly Revenue</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesData.monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip 
                    formatter={(value) => [`PKR ${(value as number).toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Orders - Bar Chart */}
            <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
              <h2 className="font-serif text-xl text-logo-black mb-6">Monthly Orders</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip 
                    formatter={(value) => [value, 'Orders']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
            <h2 className="font-serif text-xl text-logo-black mb-4">Top Selling Products</h2>
            {salesData.topProducts.length === 0 ? (
              <p className="text-logo-black/40 text-sm">No product sales data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-logo-rose/10">
                      <th className="text-left py-3 text-xs font-bold text-logo-black/50 uppercase tracking-wider">#</th>
                      <th className="text-left py-3 text-xs font-bold text-logo-black/50 uppercase tracking-wider">Product</th>
                      <th className="text-right py-3 text-xs font-bold text-logo-black/50 uppercase tracking-wider">Units Sold</th>
                      <th className="text-right py-3 text-xs font-bold text-logo-black/50 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-logo-rose/8">
                    {salesData.topProducts.map((product, index) => (
                      <tr key={index} className="hover:bg-logo-rose/3 transition-colors">
                        <td className="py-3 text-sm text-logo-black/40 font-bold w-8">{index + 1}</td>
                        <td className="py-3 text-sm font-medium text-logo-black">{product.name}</td>
                        <td className="py-3 text-right text-sm text-logo-black/60">{product.orders}</td>
                        <td className="py-3 text-right font-bold text-sm text-action-bordeaux">
                          PKR {product.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ElementType; color: string }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 border border-logo-rose/20">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-logo-black/60 text-xs mb-1 truncate">{title}</p>
        <p className="text-xl font-bold text-logo-black truncate">{value}</p>
      </div>
      <div className={`${color} p-2.5 rounded-xl shrink-0`}>
        <Icon className="text-white" size={20} />
      </div>
    </div>
  </div>
);

export default AdminSales;