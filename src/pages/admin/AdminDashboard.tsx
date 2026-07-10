import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiUsers, FiShoppingBag, FiDollarSign, FiBox, FiTrendingUp,
  FiLogOut, FiSettings, FiMenu, FiUploadCloud, FiShield,
  FiClipboard, FiAward, FiAlertTriangle,
} from 'react-icons/fi';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

const LOW_STOCK_THRESHOLD = 5;

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'Admin') navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    fetchStats();
    fetchLowStock();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, productsRes, categoriesRes, ordersRes, pendingRes, revenueRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }).not('name', 'ilike', '__SYSTEM_%'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('total_amount').not('status', 'eq', 'cancelled'),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce(
        (sum: number, o: any) => sum + (o.total_amount || 0), 0
      );

      setStats({
        totalUsers: usersRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalRevenue,
        totalOrders: ordersRes.count || 0,
        pendingOrders: pendingRes.count || 0,
      });
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchLowStock = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock')
        .lte('stock', LOW_STOCK_THRESHOLD)
        .gt('stock', 0)
        .order('stock', { ascending: true })
        .limit(10);
      setLowStock(data || []);
    } catch (err) {
      console.error('Low stock error:', err);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { name: 'Dashboard',        path: '/admin/dashboard',      icon: FiTrendingUp },
    { name: 'Orders',           path: '/admin/orders',         icon: FiClipboard },
    { name: 'Categories',       path: '/admin/categories',     icon: FiBox },
    { name: 'Products',         path: '/admin/products',       icon: FiShoppingBag },
    { name: 'Best Sellers',     path: '/admin/best-sellers',   icon: FiAward },
    { name: 'Service Badges',   path: '/admin/services',       icon: FiShield },
    { name: 'Bulk Upload',      path: '/admin/bulk-upload',    icon: FiUploadCloud },
    { name: 'Users',            path: '/admin/users',          icon: FiUsers },
    { name: 'Sales & Revenue',  path: '/admin/sales',          icon: FiDollarSign },
    { name: 'Profile Settings', path: '/admin/profile-settings', icon: FiSettings },
  ];

  const isDashboard = location.pathname === '/admin' || location.pathname === '/admin/dashboard';

  if (user?.role !== 'Admin') return null;

  return (
    <div className="min-h-screen bg-bg-silk-glow flex flex-col md:flex-row relative">
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-20"
          onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`bg-white shadow-xl z-30 border-r border-logo-rose/20 w-72 flex-shrink-0 transition-transform duration-300 fixed md:sticky top-0 bottom-0 left-0 h-screen md:translate-x-0 ${
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
              <Link to="/" className="text-xs md:text-sm text-logo-black/60 hover:text-logo-rose transition-colors">View Site</Link>
              <div className="text-right hidden sm:block">
                <p className="font-medium text-logo-black text-sm">{user?.username}</p>
                <p className="text-xs text-logo-black/60">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {isDashboard ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-6">Dashboard Overview</h1>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <StatCard title="Total Users"     value={stats.totalUsers}     icon={FiUsers}       color="bg-pop-orchid" />
                <StatCard title="Products"        value={stats.totalProducts}  icon={FiShoppingBag} color="bg-energy-apricot" />
                <StatCard title="Categories"      value={stats.totalCategories} icon={FiBox}         color="bg-logo-rose" />
                <StatCard title="Total Orders"    value={stats.totalOrders}    icon={FiClipboard}   color="bg-action-bordeaux" />
                <StatCard title="Pending Orders"  value={stats.pendingOrders}  icon={FiAlertTriangle} color="bg-amber-500" highlight={stats.pendingOrders > 0} />
                <StatCard title="Total Revenue"   value={`PKR ${stats.totalRevenue.toLocaleString()}`} icon={FiDollarSign} color="bg-emerald-600" />
              </div>

              {/* Low stock alerts */}
              {lowStock.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FiAlertTriangle size={18} className="text-amber-500" />
                    <h2 className="font-serif text-lg text-logo-black">Low Stock Alerts</h2>
                    <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      ≤ {LOW_STOCK_THRESHOLD} units
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
              <RecentOrders />
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
  useEffect(() => {
    supabase.from('orders').select('id, customer_name, customer_phone, total_amount, status, created_at')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setOrders(data || []));
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
        <h2 className="font-serif text-xl text-logo-black">Recent Orders</h2>
        <Link to="/admin/orders" className="text-xs text-logo-rose hover:text-action-bordeaux font-semibold transition-colors">
          View All →
        </Link>
      </div>
      {orders.length === 0 ? (
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
