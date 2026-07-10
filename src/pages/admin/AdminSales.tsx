import { useState, useEffect } from 'react';
import { FiDollarSign, FiTrendingUp, FiShoppingBag, FiCalendar, FiClock } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';

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
  monthlyRevenue: number[];
  topProducts: TopProduct[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AdminSales = () => {
  const [salesData, setSalesData] = useState<SalesData>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    pendingOrders: 0,
    monthlyRevenue: new Array(12).fill(0),
    topProducts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => { fetchSalesData(); }, [selectedYear]);

  const fetchSalesData = async () => {
    setIsLoading(true);
    try {
      // Fetch all non-cancelled orders for the selected year
      const yearStart = `${selectedYear}-01-01T00:00:00.000Z`;
      const yearEnd   = `${selectedYear}-12-31T23:59:59.999Z`;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount, status, created_at, items')
        .gte('created_at', yearStart)
        .lte('created_at', yearEnd)
        .not('status', 'eq', 'cancelled');

      if (error) throw error;

      const allOrders = orders || [];

      // Overall stats
      const totalRevenue = allOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const totalOrders  = allOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Pending orders count (all time)
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Monthly revenue breakdown
      const monthlyRevenue = new Array(12).fill(0);
      allOrders.forEach((o) => {
        const month = new Date(o.created_at).getMonth(); // 0-indexed
        monthlyRevenue[month] += o.total_amount || 0;
      });

      // Top products by revenue
      const productMap: Record<string, { name: string; revenue: number; orders: number }> = {};
      allOrders.forEach((o) => {
        const items: any[] = o.items || [];
        items.forEach((item) => {
          const key = item.product_id || item.name;
          if (!productMap[key]) {
            productMap[key] = { name: item.name || 'Unknown', revenue: 0, orders: 0 };
          }
          productMap[key].revenue += (item.price || 0) * (item.quantity || 1);
          productMap[key].orders  += item.quantity || 1;
        });
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setSalesData({ totalRevenue, totalOrders, averageOrderValue, pendingOrders: pendingCount || 0, monthlyRevenue, topProducts });
    } catch (err) {
      console.error('Sales data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const maxMonthly = Math.max(...salesData.monthlyRevenue, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Sales &amp; Revenue</h1>
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

          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
            <h2 className="font-serif text-xl text-logo-black mb-6">Monthly Revenue — {selectedYear}</h2>
            {salesData.totalOrders === 0 ? (
              <div className="h-48 flex items-center justify-center text-logo-black/40 text-sm">
                No orders recorded for {selectedYear}.
              </div>
            ) : (
              <div className="flex items-end justify-between gap-1 h-52">
                {salesData.monthlyRevenue.map((revenue, index) => {
                  const heightPct = maxMonthly > 0 ? (revenue / maxMonthly) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="relative w-full flex flex-col justify-end" style={{ height: '180px' }}>
                        {revenue > 0 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-logo-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            PKR {revenue.toLocaleString()}
                          </div>
                        )}
                        <div
                          className="w-full bg-action-bordeaux/80 hover:bg-action-bordeaux rounded-t-lg transition-all duration-300 cursor-default min-h-[2px]"
                          style={{ height: `${Math.max(heightPct, revenue > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                      <span className="text-[9px] md:text-[10px] text-logo-black/50 font-medium">
                        {MONTHS[index]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
