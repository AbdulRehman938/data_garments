import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '../pages';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <HomePage />
      </main>
      <Footer />
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
  },
]);
