/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { HomePage, Login, Signup, VerifyOtp, ProfileSettings, NotFound, Shop, ProductDetail } from '../pages';
import ForgotPassword from '../pages/auth/ForgotPassword';
import UpdatePassword from '../pages/auth/UpdatePassword';
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
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ScrollToTop from '../components/common/ScrollToTop';
import Wishlist from '../pages/Wishlist';
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
    <div className="w-full grow flex items-center justify-center px-4 py-8 md:py-5 lg:py-10">
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
      { path: 'lookbook', element: <Shop /> }, // redirect lookbook → shop
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
    element: <AuthLayout><Wishlist /></AuthLayout>,
  },

  /* ── Admin routes ── */
  {
    path: '/admin',
    element: <AdminDashboard />,
    children: [
      { index: true,                  element: null },            // dashboard renders inline
      { path: 'dashboard',            element: null },
      { path: 'categories',           element: <AdminCategories /> },
      { path: 'products',             element: <AdminProducts /> },
      { path: 'products/add',         element: <AdminAddProduct /> },
      { path: 'bulk-upload',          element: <AdminBulkUpload /> },
      { path: 'services',             element: <AdminServices /> },
      { path: 'orders',               element: <AdminOrders /> },
      { path: 'best-sellers',         element: <AdminBestSellers /> },
      { path: 'users',                element: <AdminUsers /> },
      { path: 'sales',                element: <AdminSales /> },
      { path: 'profile-settings',     element: <ProfileSettings /> },
    ],
  },

  { path: '*', element: <NotFound /> },
]);
