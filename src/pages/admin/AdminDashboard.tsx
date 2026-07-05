import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiShoppingBag, FiDollarSign, FiBox, FiTrendingUp, FiLogOut, FiSettings } from 'react-icons/fi';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalRevenue: 0,
    totalOrders: 0,
  });

  useEffect(() => {
    // Check if user is authenticated and has admin role
    if (!user) {
      // User not loaded yet, wait
      return;
    }
    
    if (user.role !== 'Admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch stats from Supabase
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersCount, productsCount, categoriesCount] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('categories').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: usersCount.count || 0,
          totalProducts: productsCount.count || 0,
          totalCategories: categoriesCount.count || 0,
          totalRevenue: 0, // TODO: Connect to orders table when available
          totalOrders: 0, // TODO: Connect to orders table when available
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: FiTrendingUp },
    { name: 'Categories', path: '/admin/categories', icon: FiBox },
    { name: 'Products', path: '/admin/products', icon: FiShoppingBag },
    { name: 'Users', path: '/admin/users', icon: FiUsers },
    { name: 'Sales & Revenue', path: '/admin/sales', icon: FiDollarSign },
    { name: 'Profile Settings', path: '/admin/profile-settings', icon: FiSettings },
  ];

  if (user?.role !== 'Admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-silk-glow flex">
      {/* Sidebar */}
      <aside className="bg-white shadow-xl h-full z-30 overflow-hidden border-r border-logo-rose/20 w-72 flex-shrink-0">
        <div className="h-full flex flex-col">
          {/* Logo/Brand */}
          <div className="p-4 border-b border-logo-rose/20">
            <div className="flex items-center gap-3">
              <img 
                src="/logo_header.avif" 
                alt="Data Garments" 
                className="w-16 h-10 md:w-80 md:h-20 object-contain"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-action-bordeaux text-white'
                      : 'text-logo-black hover:bg-logo-rose/10'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-logo-rose/20">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-logo-rose hover:bg-logo-rose/10 transition-all duration-200"
            >
              <FiLogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-logo-rose/20">
          <div className="flex items-center justify-between px-4 md:px-6 py-0 h-16 md:h-20">
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-lg md:text-xl font-bold text-logo-black">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Link
                to="/"
                className="text-xs md:text-sm text-logo-black/60 hover:text-logo-rose transition-colors"
              >
                View Site
              </Link>
              <div className="text-right hidden sm:block">
                <p className="font-medium text-logo-black text-sm">{user?.username}</p>
                <p className="text-xs text-logo-black/60">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {location.pathname === '/admin/dashboard' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-4 md:mb-6">Dashboard Overview</h1>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  icon={FiUsers}
                  color="bg-pop-orchid"
                />
                <StatCard
                  title="Total Products"
                  value={stats.totalProducts}
                  icon={FiShoppingBag}
                  color="bg-energy-apricot"
                />
                <StatCard
                  title="Total Categories"
                  value={stats.totalCategories}
                  icon={FiBox}
                  color="bg-logo-rose"
                />
                <StatCard
                  title="Total Revenue"
                  value={`$${stats.totalRevenue}`}
                  icon={FiDollarSign}
                  color="bg-action-bordeaux"
                />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-logo-rose/20">
                <h2 className="font-serif text-xl text-logo-black mb-4">Recent Activity</h2>
                <p className="text-logo-black/60">No recent activity to display.</p>
              </div>
            </motion.div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white rounded-2xl shadow-sm p-6 border border-logo-rose/20"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-logo-black/60 text-sm mb-1">{title}</p>
        <p className="text-2xl font-bold text-logo-black">{value}</p>
      </div>
      <div className={`${color} p-3 rounded-xl`}>
        <Icon className="text-white" size={24} />
      </div>
    </div>
  </motion.div>
);

export default AdminDashboard;
