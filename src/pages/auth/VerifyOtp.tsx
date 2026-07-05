import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { sendOtpEmail } from '../../utils/email';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const isPasswordReset = location.state?.isPasswordReset || false;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(() => {
    // Load timer from localStorage on mount
    const storedTimer = localStorage.getItem('otpTimer');
    const storedTimestamp = localStorage.getItem('otpTimestamp');
    
    if (storedTimer && storedTimestamp) {
      const elapsed = Math.floor((Date.now() - parseInt(storedTimestamp)) / 1000);
      const remaining = parseInt(storedTimer) - elapsed;
      return remaining > 0 ? remaining : 0;
    }
    return 120; // Default 2 minutes
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTimer = prev - 1;
          localStorage.setItem('otpTimer', newTimer.toString());
          localStorage.setItem('otpTimestamp', Date.now().toString());
          return newTimer;
        });
      }, 1000);
    } else {
      // Clear localStorage when timer reaches 0
      localStorage.removeItem('otpTimer');
      localStorage.removeItem('otpTimestamp');
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (!isNaN(Number(char)) && index < 6) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { error: dbError } = await supabase
        .from('users')
        .update({
          otp: newOtp,
          otp_created_at: new Date().toISOString(),
        })
        .eq('email', email);

      if (dbError) throw dbError;

      await sendOtpEmail(email, newOtp);
      setTimer(120);
      setSuccess('A new verification code has been sent to your email.');
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Fetch user to verify OTP
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !user) {
        throw new Error('User not found.');
      }

      if (user.otp !== enteredOtp) {
        throw new Error('Invalid verification code.');
      }

      // Check expiration (10 minutes)
      const otpCreatedAt = new Date(user.otp_created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - otpCreatedAt) / (1000 * 60);

      if (diffMinutes > 10) {
        throw new Error('Verification code has expired. Please request a new one.');
      }

      // Update user as verified (only for signup flow)
      if (!isPasswordReset) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_verified: true, otp: null })
          .eq('email', email);

        if (updateError) throw updateError;
      } else {
        // For password reset, just clear the OTP
        const { error: updateError } = await supabase
          .from('users')
          .update({ otp: null })
          .eq('email', email);

        if (updateError) throw updateError;
      }

      // Show success modal
      setShowSuccessModal(true);
      
      // Redirect based on flow type after 3 seconds
      setTimeout(() => {
        if (isPasswordReset) {
          navigate('/update-password', { state: { email } });
        } else {
          navigate('/login');
        }
      }, 3000);
    } catch (err: any) {
      console.error('OTP Verification error:', err);
      setError(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!email) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-action-bordeaux/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FiCheckCircle className="text-3xl text-action-bordeaux" />
        </div>
        <h2 className="font-playfair text-3xl md:text-4xl font-bold text-logo-black mb-3">
          Check your email
        </h2>
        <p className="font-sans text-sm text-logo-black/60">
          We've sent a 6-digit verification code to
          <br />
          <span className="font-medium text-logo-black">{email}</span>
        </p>
      </div>

      <div className="bg-white/50 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 md:gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-10 h-12 md:w-12 md:h-14 text-center text-xl md:text-2xl font-sans font-semibold bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl text-logo-black focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
              />
            ))}
          </div>

          {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}
          {success && <div className="text-green-500 text-sm text-center mb-4">{success}</div>}

          <motion.button
            type="submit"
            disabled={isLoading || otp.join('').length < 6}
            whileHover={!isLoading && otp.join('').length === 6 ? { scale: 1.02 } : {}}
            whileTap={!isLoading && otp.join('').length === 6 ? { scale: 0.98 } : {}}
            className={`w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold tracking-wide shadow-md transition-all duration-300 mb-6 ${
              isLoading || otp.join('').length < 6 ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </motion.button>

          <div className="text-center font-sans text-sm text-logo-black/60">
            Didn't receive the code?{' '}
            {timer > 0 ? (
              <span className="text-action-bordeaux font-medium">
                Resend in {formatTime(timer)}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-action-bordeaux font-semibold hover:underline focus:outline-none"
              >
                Resend Now
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 text-sm font-sans font-medium text-logo-black/60 hover:text-action-bordeaux transition-colors"
        >
          <FiArrowLeft /> Back to Signup
        </Link>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 md:p-10 max-w-md mx-4 shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle className="text-4xl text-green-500" />
              </div>
              <h2 className="font-serif text-2xl md:text-3xl text-logo-black mb-3">
                {isPasswordReset ? 'Email Verified!' : 'Account Verified!'}
              </h2>
              <p className="font-sans text-sm text-logo-black/60 mb-6">
                {isPasswordReset 
                  ? 'Your email has been verified. You can now reset your password.'
                  : 'Your account has been successfully verified. You can now log in with your credentials.'}
              </p>
              <div className="font-sans text-xs text-logo-black/40">
                {isPasswordReset ? 'Redirecting to password reset...' : 'Redirecting to login page...'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerifyOtp;
