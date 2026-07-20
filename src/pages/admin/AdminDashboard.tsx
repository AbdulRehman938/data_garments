/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiShoppingBag, FiDollarSign, FiBox, FiTrendingUp,
  FiLogOut, FiSettings, FiMenu, FiUploadCloud, FiShield,
  FiClipboard, FiAward, FiAlertTriangle, FiCalendar, FiStar,
} from 'react-icons/fi';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { getCache, setCache } from '../../utils/db';
import ScrollToTop from '../../components/common/ScrollToTop';
import { Skeleton, SkeletonCard } from '../../components/common/Skeleton';
import {
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
}

interface OrderStatusData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  name: string;
  revenue: number;
  orders: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFBB28',
  confirmed: '#0088FE',
  shipped: '#8884d8',
  delivered: '#00C49F',
  cancelled: '#FF6B6B',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lowStockThresholds, setLowStockThresholds] = useState<Record<string, number>>({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'year' | 'month' | 'date'>('year');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusData, setStatusData] = useState<OrderStatusData[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'Admin') {
      logout();
      navigate('/login');
    }
  }, [user, navigate, logout]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchStats(),
        fetchLowStockThresholds(),
        fetchChartData(),
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [selectedYear, selectedMonth, selectedDate, filterType]);

  const fetchLowStockThresholds = async () => {
    const cacheKey = 'low-stock-thresholds';
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        setLowStockThresholds(cached);
        fetchLowStock();
        return;
      }
      
      const { data } = await supabase
        .from('categories')
        .select('description')
        .eq('name', '__SYSTEM_SETTINGS__')
        .maybeSingle();

      let thresholds = {};
      if (data?.description) {
        try {
          const parsed = JSON.parse(data.description);
          thresholds = parsed.lowStockThresholds || {};
        } catch {}
      }
      setLowStockThresholds(thresholds);
      await setCache(cacheKey, thresholds);
    } catch (err) {
      console.error('Fetch thresholds error:', err);
    } finally {
      fetchLowStock();
    }
  };

  const fetchStats = async () => {
    const cacheKey = `dashboard-stats-${filterType}-${selectedYear}-${selectedMonth}-${selectedDate}`;
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        setStats(cached);
        return;
      }
      
      let dateFilter: any = {};
      if (filterType === 'year') {
        dateFilter = {
          gte: `${selectedYear}-01-01T00:00:00.000Z`,
          lte: `${selectedYear}-12-31T23:59:59.999Z`,
        };
      } else if (filterType === 'month') {
        const month = selectedMonth !== null ? selectedMonth : new Date().getMonth();
        const year = selectedYear;
        const monthNum = month + 1;
        const lastDay = new Date(year, monthNum, 0).getDate();
        dateFilter = {
          gte: `${year}-${String(monthNum).padStart(2, '0')}-01T00:00:00.000Z`,
          lte: `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}T23:59:59.999Z`,
        };
      } else if (filterType === 'date') {
        const dateToUse = selectedDate || new Date().toISOString().split('T')[0];
        const dateObj = new Date(dateToUse);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999)).toISOString();
        dateFilter = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
      
      const [ordersRes, pendingRes, revenueRes] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte),
        supabase.from('orders').select('total_amount').not('status', 'eq', 'cancelled').gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce(
        (sum: number, o: any) => sum + (o.total_amount || 0), 0
      );

      const newStats = {
        totalUsers: 0,
        totalProducts: 0,
        totalCategories: 0,
        totalRevenue,
        totalOrders: ordersRes.count || 0,
        pendingOrders: pendingRes.count || 0,
      };
      setStats(newStats);
      await setCache(cacheKey, newStats);
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchLowStock = async () => {
    const cacheKey = 'low-stock-products';
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        setLowStock(cached);
        return;
      }
      
      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock, category_id')
        .gt('stock', 0)
        .order('stock', { ascending: true })
        .limit(100); // Limit to 100 for optimization

      // Filter products based on category thresholds
      const filtered = (products || []).filter(product => {
        const threshold = product.category_id 
          ? (lowStockThresholds[product.category_id] ?? 5)
          : 5;
        return product.stock <= threshold;
      }).slice(0, 10);

      setLowStock(filtered);
      await setCache(cacheKey, filtered);
    } catch (err) {
      console.error('Low stock error:', err);
    }
  };

  const fetchChartData = async () => {
    const cacheKey = `dashboard-charts-${filterType}-${selectedYear}-${selectedMonth}-${selectedDate}`;
    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        setMonthlyData(cached.monthlyData);
        setStatusData(cached.statusData);
        setTopSellingProducts(cached.topSellingProducts || []);
        return;
      }
      
      let dateFilter: any = {};
      if (filterType === 'year') {
        dateFilter = {
          gte: `${selectedYear}-01-01T00:00:00.000Z`,
          lte: `${selectedYear}-12-31T23:59:59.999Z`,
        };
      } else if (filterType === 'month') {
        const month = selectedMonth !== null ? selectedMonth : new Date().getMonth();
        const year = selectedYear;
        const monthNum = month + 1;
        const lastDay = new Date(year, monthNum, 0).getDate();
        dateFilter = {
          gte: `${year}-${String(monthNum).padStart(2, '0')}-01T00:00:00.000Z`,
          lte: `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}T23:59:59.999Z`,
        };
      } else if (filterType === 'date') {
        const dateToUse = selectedDate || new Date().toISOString().split('T')[0];
        const dateObj = new Date(dateToUse);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999)).toISOString();
        dateFilter = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }
      
      const [ordersData, statusCount, topProducts] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount, status, created_at')
          .gte('created_at', dateFilter.gte)
          .lte('created_at', dateFilter.lte)
          .not('status', 'eq', 'cancelled'),
          
        supabase.from('orders').select('status').gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte),
        
        supabase
          .from('order_items')
          .select('quantity, product_id, products!inner(name), orders!inner(created_at)')
          .gte('orders.created_at', dateFilter.gte)
          .lte('orders.created_at', dateFilter.lte),
      ]);

      // Process monthly data
      let monthly = MONTHS.map(name => ({ name, revenue: 0, orders: 0 }));
      if (filterType === 'year') {
        (ordersData.data || []).forEach((order: any) => {
          const monthIdx = new Date(order.created_at).getMonth();
          monthly[monthIdx].revenue += order.total_amount || 0;
          monthly[monthIdx].orders += 1;
        });
      } else if (filterType === 'month') {
        const month = selectedMonth !== null ? selectedMonth : new Date().getMonth();
        const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
        monthly = Array.from({ length: daysInMonth }, (_, i) => ({ 
          name: `Day ${i + 1}`, 
          revenue: 0, 
          orders: 0 
        }));
        (ordersData.data || []).forEach((order: any) => {
          const dayIdx = new Date(order.created_at).getDate() - 1;
          if (dayIdx >= 0 && dayIdx < daysInMonth) {
            monthly[dayIdx].revenue += order.total_amount || 0;
            monthly[dayIdx].orders += 1;
          }
        });
      }
      setMonthlyData(monthly);

      // Process order status data
      const statusMap: Record<string, number> = {};
      (statusCount.data || []).forEach((order: any) => {
        statusMap[order.status] = (statusMap[order.status] || 0) + 1;
      });
      const statusArray = Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: STATUS_COLORS[name] || '#8884d8',
      }));
      setStatusData(statusArray);

      // Process top selling products
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      (topProducts.data || []).forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.name || 'Unknown';
        if (!productSales[productId]) {
          productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
        }
        productSales[productId].quantity += item.quantity || 0;
      });
      
      const topSellingArray = Object.values(productSales)
        .map(p => ({ ...p, revenue: p.quantity * 100 })) // Simplified revenue calculation
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
      setTopSellingProducts(topSellingArray);
      
      await setCache(cacheKey, { monthlyData: monthly, statusData: statusArray, topSellingProducts: topSellingArray });
    } catch (err) {
      console.error('Chart data error:', err);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleResetFilters = () => {
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(null);
    setSelectedDate(null);
    setFilterType('year');
  };

  const handleFilterTypeChange = (type: 'year' | 'month' | 'date') => {
    setFilterType(type);
    setSelectedMonth(null);
    setSelectedDate(null);
  };

  const navItems = [
    { name: 'Dashboard',        path: '/admin/dashboard',      icon: FiTrendingUp },
    { name: 'Orders',           path: '/admin/orders',         icon: FiClipboard },
    { name: 'Reviews',          path: '/admin/reviews',        icon: FiStar },
    { name: 'Categories',       path: '/admin/categories',     icon: FiBox },
    { name: 'Products',         path: '/admin/products',       icon: FiShoppingBag },
    { name: 'Best Sellers',     path: '/admin/best-sellers',   icon: FiAward },
    { name: 'Service Badges',   path: '/admin/services',       icon: FiShield },
    { name: 'Bulk Upload',      path: '/admin/bulk-upload',    icon: FiUploadCloud },
    { name: 'Customers',        path: '/admin/users',          icon: FiUsers },
    { name: 'Profile Settings', path: '/admin/profile-settings', icon: FiSettings },
  ];

  const currentYear = new Date().getFullYear();
  const isDashboard = location.pathname === '/admin' || location.pathname === '/admin/dashboard';

  if (user?.role !== 'Admin') return null;

  return (
    <div className="min-h-screen bg-bg-silk-glow flex flex-col md:flex-row relative">
      <ScrollToTop />
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-20"
          onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`bg-white shadow-xl z-30 border-r border-logo-rose/20 w-72 shrink-0 transition-transform duration-300 fixed md:sticky top-0 bottom-0 left-0 h-screen md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-logo-rose/20">
            <img src="/logo_header.avif" alt="Data Garments" className="w-48 h-12 object-contain mx-auto" />
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${
                    isActive ? 'bg-action-bordeaux text-white' : 'text-logo-black hover:bg-logo-rose/10'
                  }`}>
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                  {item.name === 'Orders' && stats.pendingOrders > 0 && (
                    <span className="ml-auto bg-pop-orchid text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {stats.pendingOrders > 9 ? '9+' : stats.pendingOrders}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-logo-rose/20">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-logo-rose hover:bg-logo-rose/10 transition-all">
              <FiLogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-logo-rose/20">
          <div className="flex items-center justify-between px-4 md:px-6 h-16 md:h-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-xl cursor-pointer">
                <FiMenu size={22} />
              </button>
              <h1 className="font-serif text-lg md:text-xl font-bold text-logo-black">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Link to="/" className="flex items-center gap-2 px-3 py-2 bg-bg-silk-glow rounded-xl text-xs text-logo-black hover:text-action-bordeaux hover:bg-action-bordeaux/5 transition-all cursor-pointer font-medium">
                  <span className="hidden sm:inline">View Site</span>
                  <span className="sm:hidden">Home</span>
                </Link>
                <div className="flex items-center gap-3">
                  {user?.profilePicUrl ? (
                    <img src={user.profilePicUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-logo-rose/20" />
                  ) : (
                    <div className="w-10 h-10 bg-action-bordeaux rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {user?.username?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className="font-semibold text-logo-black text-sm">{user?.username}</p>
                    <p className="text-xs text-logo-black/50">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {isDashboard ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filter Controls */}
              <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-logo-black">Filter by:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFilterTypeChange('year')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          filterType === 'year' 
                            ? 'bg-action-bordeaux text-white' 
                            : 'bg-bg-silk-glow text-logo-black hover:bg-logo-rose/10'
                        }`}
                      >
                        Year
                      </button>
                      <button
                        onClick={() => handleFilterTypeChange('month')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          filterType === 'month' 
                            ? 'bg-action-bordeaux text-white' 
                            : 'bg-bg-silk-glow text-logo-black hover:bg-logo-rose/10'
                        }`}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => handleFilterTypeChange('date')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          filterType === 'date' 
                            ? 'bg-action-bordeaux text-white' 
                            : 'bg-bg-silk-glow text-logo-black hover:bg-logo-rose/10'
                        }`}
                      >
                        Date
                      </button>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-logo-rose/20 hidden sm:block"></div>

                  {filterType === 'year' && (
                    <div className="relative inline-block">
                      <div
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-logo-rose/20 rounded-xl cursor-pointer hover:bg-logo-rose/5 transition-all shadow-sm"
                      >
                        <FiCalendar size={18} className="text-logo-rose" />
                        <span className="font-medium text-logo-black">{selectedYear}</span>
                        <motion.svg
                          animate={{ rotate: showYearDropdown ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-4 h-4 text-logo-rose"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </div>

                      <AnimatePresence>
                        {showYearDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 mt-2 w-48 bg-white border border-logo-rose/20 rounded-xl shadow-lg z-50 overflow-hidden"
                          >
                            {[...Array(6)].map((_, index) => {
                              const year = currentYear - index;
                              return (
                                <div
                                  key={year}
                                  onClick={() => {
                                    setSelectedYear(year);
                                    setShowYearDropdown(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-all hover:bg-logo-rose/10 ${selectedYear === year ? 'bg-logo-rose/20 text-action-bordeaux font-semibold' : 'text-logo-black'}`}
                                >
                                  {year}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {filterType === 'month' && (
                    <div className="flex items-center gap-2">
                      <div className="relative inline-block">
                        <div
                          onClick={() => setShowYearDropdown(!showYearDropdown)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-logo-rose/20 rounded-xl cursor-pointer hover:bg-logo-rose/5 transition-all shadow-sm"
                        >
                          <FiCalendar size={18} className="text-logo-rose" />
                          <span className="font-medium text-logo-black">{selectedYear}</span>
                          <motion.svg
                            animate={{ rotate: showYearDropdown ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-4 h-4 text-logo-rose"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </motion.svg>
                        </div>

                        <AnimatePresence>
                          {showYearDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 mt-2 w-48 bg-white border border-logo-rose/20 rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                              {[...Array(6)].map((_, index) => {
                                const year = currentYear - index;
                                return (
                                  <div
                                    key={year}
                                    onClick={() => {
                                      setSelectedYear(year);
                                      setShowYearDropdown(false);
                                    }}
                                    className={`px-4 py-3 cursor-pointer transition-all hover:bg-logo-rose/10 ${selectedYear === year ? 'bg-logo-rose/20 text-action-bordeaux font-semibold' : 'text-logo-black'}`}
                                  >
                                    {year}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="relative inline-block">
                        <div
                          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-logo-rose/20 rounded-xl cursor-pointer hover:bg-logo-rose/5 transition-all shadow-sm"
                        >
                          <FiCalendar size={18} className="text-logo-rose" />
                          <span className="font-medium text-logo-black">{selectedMonth !== null ? MONTHS[selectedMonth] : 'Select Month'}</span>
                          <motion.svg
                            animate={{ rotate: showMonthDropdown ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-4 h-4 text-logo-rose"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </motion.svg>
                        </div>

                        <AnimatePresence>
                          {showMonthDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-full left-0 mt-2 w-48 bg-white border border-logo-rose/20 rounded-xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto"
                            >
                              {MONTHS.map((month, index) => (
                                <div
                                  key={month}
                                  onClick={() => {
                                    setSelectedMonth(index);
                                    setShowMonthDropdown(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-all hover:bg-logo-rose/10 ${selectedMonth === index ? 'bg-logo-rose/20 text-action-bordeaux font-semibold' : 'text-logo-black'}`}
                                >
                                  {month}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {filterType === 'date' && (
                    <div className="relative inline-block">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-logo-rose/20 rounded-xl shadow-sm">
                        <FiCalendar size={18} className="text-logo-rose" />
                        <input
                          type="date"
                          value={selectedDate || ''}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="border-none focus:outline-none text-logo-black font-medium bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  <div className="ml-auto">
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-2 px-4 py-2 bg-logo-rose/10 text-logo-rose rounded-xl hover:bg-logo-rose/20 transition-all font-medium text-sm"
                    >
                      <FiCalendar size={16} />
                      Reset to Current Year
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                ) : stats.totalOrders === 0 && stats.totalRevenue === 0 ? (
                  <div className="col-span-full bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-12 text-center">
                    <FiCalendar size={48} className="text-logo-rose/30 mx-auto mb-4" />
                    <h3 className="font-serif text-lg text-logo-black mb-2">No Data Available</h3>
                    <p className="text-logo-black/50 text-sm">There are no orders or revenue for the selected period.</p>
                  </div>
                ) : (
                  <>
                    <StatCard title="Total Orders"    value={stats.totalOrders}    icon={FiClipboard}   color="bg-action-bordeaux" />
                    <StatCard title="Pending Orders"  value={stats.pendingOrders}  icon={FiAlertTriangle} color="bg-amber-500" highlight={stats.pendingOrders > 0} />
                    <StatCard title="Total Revenue"   value={`PKR ${stats.totalRevenue.toLocaleString()}`} icon={FiDollarSign} color="bg-emerald-600" />
                  </>
                )}
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  <>
                    {/* Monthly Revenue - Area Chart */}
                    <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
                      <h2 className="font-serif text-xl text-logo-black mb-6">Monthly Revenue</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyData}>
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

                    {/* Orders Status - Pie Chart */}
                    <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
                      <h2 className="font-serif text-xl text-logo-black mb-6">Order Status</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [value, 'Orders']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  <>
                    {/* Monthly Orders - Line Chart */}
                    <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
                      <h2 className="font-serif text-xl text-logo-black mb-6">
                        {filterType === 'year' ? 'Monthly Orders' : filterType === 'month' ? 'Daily Orders' : 'Orders'}
                      </h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                          <Tooltip 
                            formatter={(value) => [value, 'Orders']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line type="monotone" dataKey="orders" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Top Selling Products */}
                    <div className="bg-white rounded-2xl border border-logo-rose/20 shadow-sm p-6">
                      <h2 className="font-serif text-xl text-logo-black mb-6">Top Selling Products</h2>
                      {topSellingProducts.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px] text-logo-black/50">
                          <p className="text-sm">No sales data available for this period</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          {topSellingProducts.map((product, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-bg-silk-glow rounded-xl">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-logo-rose/50'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-logo-black truncate">{product.name}</p>
                                <p className="text-xs text-logo-black/50">{product.quantity} sold</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-action-bordeaux text-sm">PKR {product.revenue.toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Low stock alerts */}
              {!isLoading && lowStock.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiAlertTriangle size={18} className="text-amber-500" />
                    <h2 className="font-serif text-lg text-logo-black">Low Stock Alerts</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      Per-category thresholds
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lowStock.map((p) => (
                      <Link key={p.id} to="/admin/products"
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors group">
                        <span className="text-sm font-medium text-logo-black truncate group-hover:text-action-bordeaux transition-colors">
                          {p.name}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent orders */}
              {!isLoading && <RecentOrders />}
            </motion.div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

const RecentOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadOrders = async () => {
      const cacheKey = 'recent-orders';
      try {
        const cached = await getCache(cacheKey);
        if (cached) {
          setOrders(cached);
          setIsLoading(false);
          return;
        }
        
        const { data } = await supabase.from('orders')
          .select('id, customer_name, customer_phone, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        setOrders(data || []);
        await setCache(cacheKey, data || []);
      } catch (e) {
        console.error('Error loading recent orders:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadOrders();
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped:   'bg-purple-100 text-purple-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-logo-rose/20">
      <div className="flex items-center justify-between mb-4">
        {isLoading ? <Skeleton className="h-6 w-40 rounded" /> : (
          <h2 className="font-serif text-xl text-logo-black">Recent Orders</h2>
        )}
        <Link to="/admin/orders" className="text-xs text-logo-rose hover:text-action-bordeaux font-semibold transition-colors">
          View All →
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-logo-black/50 text-sm">No orders yet.</p>
      ) : (
        <div className="divide-y divide-logo-rose/8">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-logo-black truncate">{o.customer_name}</p>
                <p className="text-xs text-logo-black/50">{o.customer_phone}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-sm text-action-bordeaux">PKR {o.total_amount.toLocaleString()}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, highlight }: any) => (
  <motion.div whileHover={{ scale: 1.02 }}
    className={`bg-white rounded-2xl shadow-sm p-4 border ${highlight ? 'border-amber-300' : 'border-logo-rose/20'}`}>
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-logo-black/60 text-xs mb-1 truncate">{title}</p>
        <p className="text-xl font-bold text-logo-black truncate">{value}</p>
      </div>
      <div className={`${color} p-2.5 rounded-xl shrink-0 ml-2`}>
        <Icon className="text-white" size={18} />
      </div>
    </div>
  </motion.div>
);

export default AdminDashboard;
