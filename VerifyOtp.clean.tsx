import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/AuthContext';

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Verify OTP with Supabase (simplified for example)
      // For demo, we'll just proceed to reset password
      toast('OTP verified successfully!', 'success', 'Success');
      navigate('/reset-password');
    } catch (err: any) {
      toast(err.message || 'Invalid OTP', 'error', 'Verification Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      // Resend OTP logic would go here
      toast('New OTP sent!', 'success', 'Success');
    } catch (err: any) {
      toast(err.message || 'Failed to resend OTP', 'error', 'Error');
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
            Verify Your Email
          </p>
        </div>
        <div className="space-y-6 p-6 bg-white rounded-xl shadow-md">
          <p className="text-center text-lg font-semibold text-logo-black">
            Verify your email address
          </p>
          <p className="text-center text-sm text-logo-black/60">
            We've sent a verification code to your email. Please enter it below.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-logo-black">
                Verification Code
              </label>
              <input
                type="text"
                id="otp"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="block w-full rounded-md bg-white px-3 py-2 text-base font-normal text-logo-black shadow-sm placeholder:text-logo-black/40 focus:outline-none focus:ring-2 focus:ring-logo-rose focus:border-logo-rose text-center letter-spacing-wide"
              />
            </div>
            
            <div className="flex items-center py-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-md shadow-sm transition-all cursor-pointer text-xs font-medium text-lg leading-tight text-white bg-action-bordeaux hover:bg-action-bordeaux/80 focus:outline-none"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
          
          <div className="text-center mt-4">
            <button
              onClick={handleResend}
              disabled={isLoading}
              className="text-sm font-medium text-logo-rose hover:text-action-bordeaux"
            >
              {isLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
          
          <p className="text-center text-sm text-logo-black/50 mt-6">
            Didn't receive the code?{' '}
            <a
              href="/forgot-password"
              className="font-medium text-logo-rose hover:text-action-bordeaux"
            >
              Try another email
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
