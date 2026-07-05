import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { hashPassword } from '../../utils/password';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Passwords must match')
      .required('Confirm password is required'),
  });

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        if (!email) {
          setError('Email is required. Please start the password reset process again.');
          navigate('/forgot-password');
          return;
        }

        // Hash password before storing
        const hashedPassword = await hashPassword(values.password);

        // Update password in database
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('email', email);

        if (updateError) throw updateError;

        setSuccess('Password updated successfully!');

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (error: any) {
        console.error('Password update error:', error);
        setError(error.message || 'Failed to update password. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
  });

  if (!email) {
    return (
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-6 md:p-8 text-center"
        >
          <h1 className="font-serif text-2xl text-logo-black mb-4">Email Required</h1>
          <p className="font-sans text-sm text-logo-black/60 mb-6">
            Please start the password reset process from the beginning.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block py-2.5 px-6 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans text-sm font-medium transition-all duration-300"
          >
            Start Password Reset
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-6 md:p-8"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-action-bordeaux/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiLock className="text-3xl text-action-bordeaux" />
          </div>
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-2">
            Reset Password
          </h1>
          <p className="font-sans text-sm text-logo-black/60">
            Enter your new password for
            <br />
            <span className="font-medium text-logo-black">{email}</span>
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="font-sans text-xs text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <FiCheckCircle className="text-green-500" size={16} />
            <p className="font-sans text-xs text-green-600">{success}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Password */}
          <div className="space-y-1">
            <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                <FiLock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter new password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full pl-11 pr-12 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-logo-black/40 hover:text-logo-black transition-colors cursor-pointer"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
              {formik.touched.password && formik.errors.password ? formik.errors.password : ''}
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                <FiLock size={18} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full pl-11 pr-12 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-logo-black/40 hover:text-logo-black transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
              {formik.touched.confirmPassword && formik.errors.confirmPassword ? formik.errors.confirmPassword : ''}
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={!isLoading ? { scale: 1.01 } : {}}
            whileTap={!isLoading ? { scale: 0.99 } : {}}
            className={`w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold tracking-wide text-sm shadow-md transition-all duration-300 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
          </motion.button>
        </form>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-logo-black hover:text-logo-rose transition-colors duration-200 font-sans text-sm"
          >
            <FiArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default UpdatePassword;
