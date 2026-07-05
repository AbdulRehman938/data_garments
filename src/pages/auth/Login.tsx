import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { verifyPassword } from '../../utils/password';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'email' | 'username'>('email');

  const validationSchema = Yup.object().shape({
    email: loginType === 'email'
      ? Yup.string().email('Invalid email address').required('Email is required')
      : Yup.string().notRequired(),
    username: loginType === 'username'
      ? Yup.string().min(3, 'Username must be at least 3 characters').required('Username is required')
      : Yup.string().notRequired(),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      username: '',
      password: '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const emailOrUsername = loginType === 'email' ? values.email : values.username;
        
        // Fetch user from database
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq(loginType === 'email' ? 'email' : 'username', emailOrUsername)
          .single();

        if (error || !user) {
          alert('Invalid credentials');
          return;
        }

        // Verify password
        if (!user.password) {
          alert('Please reset your password. Your account was created before password verification was implemented.');
          return;
        }

        const isPasswordValid = await verifyPassword(values.password, user.password);
        
        if (!isPasswordValid) {
          alert('Invalid credentials');
          return;
        }

        const userData = {
          id: user.id,
          username: user.username,
          email: user.email,
          profilePicUrl: user.profile_pic_url,
          role: user.role || 'Customer',
        };
        
        login(userData);
        
        // Redirect based on role
        if (user.role === 'Admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
      }
    },
  });

  const handleToggleLoginType = (type: 'email' | 'username') => {
    setLoginType(type);
    formik.setFieldError('email', undefined);
    formik.setFieldError('username', undefined);
    formik.setFieldTouched('email', false);
    formik.setFieldTouched('username', false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 lg:gap-8 items-center justify-center mx-auto"
    >
      {/* Left Side - Image Placeholder */}
      <div className="hidden lg:flex flex-1 h-[480px]">
        <div className="w-full h-full bg-white/60 backdrop-blur-sm rounded-3xl border border-logo-rose/20 shadow-xl overflow-hidden flex items-center justify-center">
          <div className="text-center p-8">
            <p className="font-serif text-2xl text-logo-black/40 mb-2">Image Placeholder</p>
            <p className="font-sans text-sm text-logo-black/30">
              Required: Editorial fashion image<br />
              Size: 800x1000px (4:5 aspect ratio)<br />
              Style: Elegant, feminine, luxury
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Card */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-5 md:p-6 lg:p-8 md:pt-1 lg:pt-3">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black mb-1.5">
            Welcome Back
          </h1>
          <p className="font-sans text-xs md:text-sm text-logo-black/60">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="flex bg-bg-silk-glow/50 rounded-full p-1 mb-5">
          <button
            type="button"
            onClick={() => handleToggleLoginType('email')}
            className={`flex-1 py-1.5 px-3 rounded-full font-sans text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer ${
              loginType === 'email'
                ? 'bg-action-bordeaux text-white shadow-md'
                : 'text-logo-black/60 hover:text-logo-black'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => handleToggleLoginType('username')}
            className={`flex-1 py-1.5 px-3 rounded-full font-sans text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer ${
              loginType === 'username'
                ? 'bg-action-bordeaux text-white shadow-md'
                : 'text-logo-black/60 hover:text-logo-black'
            }`}
          >
            Username
          </button>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-1">
          {/* Email or Username Input */}
          <div className="space-y-1">
            <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
              {loginType === 'email' ? 'Email Address' : 'Username'}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                {loginType === 'email' ? <FiMail size={18} /> : <FiArrowRight size={18} />}
              </div>
              <input
                type={loginType === 'email' ? 'email' : 'text'}
                name={loginType === 'email' ? 'email' : 'username'}
                placeholder={loginType === 'email' ? 'Enter your email' : 'Enter your username'}
                value={loginType === 'email' ? formik.values.email : formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full pl-11 pr-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
              />
            </div>
            {/* Error Message Spacer (fixed height to prevent layout shifts) */}
            <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
              {loginType === 'email'
                ? (formik.touched.email && formik.errors.email ? formik.errors.email : '')
                : (formik.touched.username && formik.errors.username ? formik.errors.username : '')
              }
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                <FiLock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full pl-11 pr-11 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-logo-black/40 hover:text-logo-rose transition-colors duration-200"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {/* Error Message Spacer (fixed height to prevent layout shifts) */}
            <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
              {formik.touched.password && formik.errors.password ? formik.errors.password : ''}
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right pb-2">
            <Link
              to="/forgot-password"
              className="font-sans text-xs md:text-sm text-logo-rose hover:text-action-bordeaux transition-colors duration-200"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold tracking-wide text-xs md:text-sm shadow-md transition-all duration-300 cursor-pointer"
          >
            Sign In
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-logo-rose/20" />
          <span className="font-sans text-xs text-logo-black/40">or</span>
          <div className="flex-1 h-px bg-logo-rose/20" />
        </div>

        {/* Create Account Button */}
        <div className="text-center space-y-10">
          <p className="font-sans text-xs md:text-sm text-logo-black/60 mb-2.5">
            Don't have an account?
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 w-full py-3 border border-logo-rose/40 hover:border-logo-rose hover:bg-logo-rose/5 text-logo-black rounded-xl font-sans font-semibold tracking-wide text-xs md:text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer mt-2"
          >
            Create New Account
            <FiArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;
