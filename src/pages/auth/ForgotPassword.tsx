/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiUser, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { sendOtpEmail } from '../../utils/email';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [inputType, setInputType] = useState<'email' | 'username'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object().shape({
    email: inputType === 'email'
      ? Yup.string().email('Invalid email address').required('Email is required')
      : Yup.string().notRequired(),
    username: inputType === 'username'
      ? Yup.string().min(3, 'Username must be at least 3 characters').required('Username is required')
      : Yup.string().notRequired(),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      username: '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsLoading(true);
      setError(null);
      setIsVerified(null);
      setUserEmail(null);

      try {
        const searchField = inputType === 'email' ? 'email' : 'username';
        const searchValue = inputType === 'email' ? values.email : values.username;

        // Check if user exists
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq(searchField, searchValue)
          .single();

        if (fetchError || !user) {
          setError('Username or email is not registered. Please sign up first.');
          setIsLoading(false);
          return;
        }

        // Check if email is verified
        if (!user.is_verified) {
          setError('Your email is not verified. Please verify your email first.');
          setIsVerified(false);
          setUserEmail(user.email);
          setIsLoading(false);
          return;
        }

        // Email is verified, generate OTP and send
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const { error: updateError } = await supabase
          .from('users')
          .update({
            otp: otp,
            otp_created_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        await sendOtpEmail(user.email, otp);

        // Navigate to OTP page with password reset flag
        navigate('/verify-otp', { 
          state: { 
            email: user.email, 
            isPasswordReset: true 
          } 
        });
      } catch (error: any) {
        console.error('Forgot password error:', error);
        setError('An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
  });

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
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-2">
            Forgot Password?
          </h1>
          <p className="font-sans text-sm text-logo-black/60">
            Enter your email or username to reset your password
          </p>
        </div>

        {/* Input Type Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setInputType('email');
              setError(null);
              setIsVerified(null);
              formik.resetForm();
            }}
            className={`flex-1 py-2.5 rounded-xl font-sans text-sm font-medium transition-all duration-300 ${
              inputType === 'email'
                ? 'bg-action-bordeaux text-white'
                : 'bg-bg-silk-glow/50 text-logo-black hover:bg-bg-silk-glow'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setInputType('username');
              setError(null);
              setIsVerified(null);
              formik.resetForm();
            }}
            className={`flex-1 py-2.5 rounded-xl font-sans text-sm font-medium transition-all duration-300 ${
              inputType === 'username'
                ? 'bg-action-bordeaux text-white'
                : 'bg-bg-silk-glow/50 text-logo-black hover:bg-bg-silk-glow'
            }`}
          >
            Username
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                <p className="font-sans text-xs text-red-600">{error}</p>
              </div>

              {/* Verify Email Button for unverified users */}
              {isVerified === false && userEmail && (
                <Link
                  to="/verify-otp"
                  state={{ email: userEmail }}
                  className="mt-3 block w-full py-2.5 bg-logo-rose hover:bg-[#460416] text-white rounded-xl font-sans text-sm font-medium text-center transition-all duration-300"
                >
                  Verify Email
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {inputType === 'email' ? (
            <div className="space-y-1">
              <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                  <FiMail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-11 pr-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.email && formik.errors.email ? formik.errors.email : ''}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                  <FiUser size={18} />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-11 pr-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.username && formik.errors.username ? formik.errors.username : ''}
              </div>
            </div>
          )}

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
            {isLoading ? 'Processing...' : 'Send Verification Code'}
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

export default ForgotPassword;
