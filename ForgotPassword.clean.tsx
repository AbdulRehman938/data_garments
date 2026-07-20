import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';
import { FiMail } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setIsSent(true);
      toast('Password reset link sent to your email!', 'success', 'Success');
    } catch (err: any) {
      toast(err.message || 'Failed to send reset link', 'error', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-6 pb-8 sm:pt-0">
      <div className="w-full space-y-8 md:space-y-12 px-6">
        <div className="flex h-140 w-full flex-col items-center justify-center">
          <img
            className="h-8 w-auto mb-4"
            src="/logo_header.svg"
            alt="Data Garments Logo"
          />
          <p className="text-center text-sm text-logo-black/60">
            Reset Your Password
          </p>
        </div>
        <div className="space-y-6 p-6 bg-white rounded-xl shadow-md">
          <p className="text-center text-lg font-semibold text-logo-black">
            Forgot your password?
          </p>
          <p className="text-center text-sm text-logo-black/60">
            Enter your email and we'll send you a link to reset your password.
          </p>
          
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-logo-black">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-md bg-white px-3 py-2 text-base font-normal text-logo-black shadow-sm placeholder:text-logo-black/40 focus:outline-none focus:ring-2 focus:ring-logo-rose focus:border-logo-rose sm:text-sm"
                />
              </div>
              
              <div className="flex items-center py-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 rounded-md shadow-sm transition-all cursor-pointer text-xs font-medium text-lg leading-tight text-white bg-action-bordeaux hover:bg-action-bordeaux/80 focus:outline-none"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <FiMail className="text-emerald-600" size={24} />
              </div>
              <p className="text-sm text-logo-black/80">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-logo-rose hover:text-action-bordeaux"
              >
                Back to Login
              </button>
            </div>
          )}
          
          <p className="text-center text-sm text-logo-black/50 mt-6">
            Remember your password?{' '}
            <a
              href="/login"
              className="font-medium text-logo-rose hover:text-action-bordeaux"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
