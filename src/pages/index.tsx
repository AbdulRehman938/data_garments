import { Hero, CategoryCards } from '../components';
import { useLenis } from '../hooks/useLenis';

export const HomePage = () => {
  useLenis();

  return (
    <div className="font-sans">
      <Hero />
      <CategoryCards />
    </div>
  );
};

export { default as Login } from './auth/Login';
export { default as Signup } from './auth/Signup';
export { default as VerifyOtp } from './auth/VerifyOtp';
export { default as ForgotPassword } from './auth/ForgotPassword';
export { default as UpdatePassword } from './auth/UpdatePassword';
export { default as ProfileSettings } from './ProfileSettings';
export { default as NotFound } from './NotFound';
export { default as ServerError } from './ServerError';
export { default as Shop } from './Shop';
export { default as ProductDetail } from './ProductDetail';


