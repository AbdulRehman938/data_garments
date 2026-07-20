/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { 
  HomePage, 
  Login, 
  Signup, 
  VerifyOtp, 
  ForgotPassword, 
  UpdatePassword,
  ProfileSettings, 
  NotFound, 
  Shop, 
  ProductDetail 
} from '../pages';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminAddProduct from '../pages/admin/AdminAddProduct';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminSales from '../pages/admin/AdminSales';
import AdminBulkUpload from '../pages/admin/AdminBulkUpload';
import AdminServices from '../pages/admin/AdminServices';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminBestSellers from '../pages/admin/AdminBestSellers';
import AdminReviews from '../pages/admin/AdminReviews';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollToTop from '../components/common/ScrollToTop';
import Checkout from '../pages/Checkout';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Privacy from '../pages/Privacy';
import Terms from '../pages/Terms';

const MainLayout = () => (
  <div className="flex flex-col min-h-screen">
    <ScrollToTop />
    <Header />
    <main className="grow"><Outlet /></main>
    <Footer />
  </div>
);

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-bg-silk-glow">
    <ScrollToTop />
    <Header />
    <div className="w-full grow flex items-start justify-center px-0 py-8 md:py-5 lg:py-10">
      {children}
    </div>
  </div>
);

export const router = createBrowserRouter([
  /* ── Public routes with Header + Footer ── */
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <Shop /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'checkout', element: <Checkout /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      { path: 'lookbook', element: <Shop /> },
    ],
  },

  /* ── Auth routes (Header only, centered content) ── */
  {
    path: '/login',
    element: <AuthLayout><Login /></AuthLayout>,
  },
  {
    path: '/signup',
    element: <AuthLayout><Signup /></AuthLayout>,
  },
  {
    path: '/verify-otp',
    element: <AuthLayout><VerifyOtp /></AuthLayout>,
  },
  {
    path: '/forgot-password',
    element: <AuthLayout><ForgotPassword /></AuthLayout>,
  },
  {
    path: '/update-password',
    element: <AuthLayout><UpdatePassword /></AuthLayout>,
  },
  {
    path: '/profile-settings',
    element: <AuthLayout><ProfileSettings /></AuthLayout>,
  },
  {
    path: '/wishlist',
    element: <AuthLayout><ProfileSettings /></AuthLayout>,
  },
  {
    path: '/order-history',
    element: <AuthLayout><ProfileSettings /></AuthLayout>,
  },

  /* ── Admin routes ── */
  {
    path: '/admin',
    element: <AdminDashboard />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'categories', element: <AdminCategories /> },
      { path: 'products', element: <AdminProducts /> },
      { path: 'products/add', element: <AdminAddProduct /> },
      { path: 'bulk-upload', element: <AdminBulkUpload /> },
      { path: 'services', element: <AdminServices /> },
      { path: 'orders', element: <AdminOrders /> },
      { path: 'reviews', element: <AdminReviews /> },
      { path: 'best-sellers', element: <AdminBestSellers /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'sales', element: <AdminSales /> },
      { path: 'profile-settings', element: <ProfileSettings /> },
    ],
  },

  { path: '*', element: <NotFound /> },
]);