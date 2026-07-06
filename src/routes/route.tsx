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
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-bg-silk-glow">
      <Header />
      <div className="w-full flex-grow flex items-center justify-center px-4 py-8 md:py-5 lg:py-10">
        {children}
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'shop',
        element: <Shop />,
      },
      {
        path: 'product/:id',
        element: <ProductDetail />,
      },
    ],
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <Login />
      </AuthLayout>
    ),
  },
  {
    path: '/signup',
    element: (
      <AuthLayout>
        <Signup />
      </AuthLayout>
    ),
  },
  {
    path: '/verify-otp',
    element: (
      <AuthLayout>
        <VerifyOtp />
      </AuthLayout>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AuthLayout>
        <ForgotPassword />
      </AuthLayout>
    ),
  },
  {
    path: '/update-password',
    element: (
      <AuthLayout>
        <UpdatePassword />
      </AuthLayout>
    ),
  },
  {
    path: '/profile-settings',
    element: (
      <AuthLayout>
        <ProfileSettings />
      </AuthLayout>
    ),
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'categories',
        element: <AdminCategories />,
      },
      {
        path: 'products',
        element: <AdminProducts />,
      },
      {
        path: 'products/add',
        element: <AdminAddProduct />,
      },
      {
        path: 'users',
        element: <AdminUsers />,
      },
      {
        path: 'sales',
        element: <AdminSales />,
      },
      {
        path: 'profile-settings',
        element: <ProfileSettings />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
