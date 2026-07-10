import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCamera, FiArrowLeft, FiSave, FiHeart } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { uploadProfileImage } from '../utils/storage';

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const ProfileSettings = () => {
  const { user, login } = useAuth();
  const location = useLocation();
  const isAdminContext = location.pathname.startsWith('/admin');
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profilePicUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Country API state
  const [countries, setCountries] = useState<Country[]>([]);
  const [masks, setMasks] = useState<Record<string, string>>({});
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (userData) {
          // Parse phone to separate country code and number
          const phone = userData.phone || '';
          let phoneNumber = phone;

          // Try to extract country code
          for (const country of countries) {
            if (phone.startsWith(country.dialCode)) {
              phoneNumber = phone.slice(country.dialCode.length);
              setSelectedCountry(country);
              break;
            }
          }

          formik.setValues({
            username: userData.username || '',
            email: userData.email || '',
            phone: phoneNumber,
            address: userData.address || '',
            profilePic: null,
          });

          setPreviewUrl(userData.profile_pic_url || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user?.id]);

  // Fetch countries and masks
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/countries-list@2.6.1/dist/countries.json')
      .then((res) => res.json())
      .then((data: Record<string, any>) => {
        const formatted: Country[] = Object.keys(data)
          .map((code) => {
            const c = data[code];
            const rawPhone = c.phone || '';
            const dialCode = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
            return {
              name: c.name || '',
              code: code || '',
              dialCode: dialCode,
              flag: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
            };
          })
          .filter((c) => c.dialCode && c.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(formatted);
        
        const pk = formatted.find((c) => c.code === 'PK');
        if (pk) setSelectedCountry(pk);
        else if (formatted.length > 0) setSelectedCountry(formatted[0]);
      })
      .catch((err) => console.error('Error fetching countries:', err));

    fetch('https://cdn.jsdelivr.net/gh/vueform/international-phone-masks@master/masks.json')
      .then((res) => res.json())
      .then((data) => setMasks(data))
      .catch((err) => console.error('Error fetching phone masks:', err));
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExpectedLength = () => {
    if (!selectedCountry) return 10;
    const maskData = masks[selectedCountry.code];
    if (!maskData) return 10;
    
    const maskStr = Array.isArray(maskData) ? maskData[0] : maskData;
    if (typeof maskStr !== 'string') return 10;

    const hashCount = (maskStr.match(/#/g) || []).length;
    return hashCount > 0 ? hashCount : 10;
  };

  const expectedLength = getExpectedLength();
  
  const getMaskString = () => {
    if (!selectedCountry) return '##########';
    const maskData = masks[selectedCountry.code];
    if (!maskData) return '##########';
    const maskStr = Array.isArray(maskData) ? maskData[0] : maskData;
    return typeof maskStr === 'string' ? maskStr : '##########';
  };
  
  const currentMask = getMaskString();

  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .matches(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, underscores, dots and hyphens allowed')
      .required('Username is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    phone: Yup.string()
      .matches(/^[0-9]*$/, 'Phone number must contain only digits')
      .required('Phone number is required')
      .test('len', `Phone number must be exactly ${expectedLength} digits`, (val) => {
        if (!val) return false;
        return val.length === expectedLength;
      }),
    address: Yup.string()
      .trim()
      .min(10, 'Address must be at least 10 characters')
      .max(200, 'Address cannot exceed 200 characters')
      .required('Address is required'),
  });

  const formik = useFormik({
    initialValues: {
      username: user?.username || '',
      email: user?.email || '',
      phone: '',
      address: '',
      profilePic: null as File | null,
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsLoading(true);
      setSaveError(null);
      setSaveSuccess(null);
      
      try {
        const fullPhone = `${selectedCountry?.dialCode || ''}${values.phone}`;
        let profilePicUrl = user?.profilePicUrl || null;

        // Upload new profile picture if provided
        if (values.profilePic && user?.id) {
          try {
            profilePicUrl = await uploadProfileImage(values.profilePic, user.id);
          } catch (uploadError: any) {
            console.warn('Profile picture upload failed:', uploadError.message);
          }
        }

        // Update user in database
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: values.username,
            phone: fullPhone,
            address: values.address,
            profile_pic_url: profilePicUrl,
          })
          .eq('id', user?.id);

        if (updateError) throw updateError;

        // Update auth context
        login({
          id: user?.id || '',
          username: values.username,
          email: values.email,
          profilePicUrl: profilePicUrl,
        });

        setSaveSuccess('Profile updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(null), 3000);
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setSaveError(error.message || 'Failed to update profile');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      formik.setFieldValue('profilePic', file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    formik.setFieldValue('profilePic', null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dialCode.includes(searchQuery) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-silk-glow">
        <div className="text-center">
          <p className="font-sans text-lg text-logo-black/60">Please log in to access profile settings</p>
          <Link
            to="/login"
            className="inline-block mt-4 font-sans text-action-bordeaux hover:underline"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-auto bg-bg-silk-glow px-4 py-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          {!isAdminContext && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-logo-black hover:text-logo-rose transition-colors duration-200 font-sans text-sm"
            >
              <FiArrowLeft size={16} />
              Back to Home
            </Link>
          )}
          <h1 className="font-serif text-3xl md:text-4xl text-logo-black mt-4 mb-2">
            Profile Settings
          </h1>
          <p className="font-sans text-sm text-logo-black/60">
            Update your profile information
          </p>

          {/* Quick nav tabs */}
          {!isAdminContext && (
            <div className="flex gap-2 mt-4">
              <span className="px-4 py-2 bg-action-bordeaux text-white rounded-full font-sans font-bold text-xs uppercase tracking-wide">
                Profile
              </span>
              <Link
                to="/wishlist"
                className="flex items-center gap-1.5 px-4 py-2 border border-logo-rose/20 text-logo-black/60 hover:border-logo-rose hover:text-logo-rose rounded-full font-sans font-bold text-xs uppercase tracking-wide transition-all"
              >
                <FiHeart size={12} /> Wishlist
              </Link>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-6 md:p-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center justify-center mb-8">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-logo-rose/25 bg-bg-silk-glow/50 overflow-hidden flex items-center justify-center relative shadow-sm group cursor-pointer transition-all duration-300 hover:border-logo-rose/60"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <FiUser className="text-logo-black/30 w-10 h-10 group-hover:scale-105 transition-transform duration-300" />
              )}
              <div className="absolute inset-0 bg-logo-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <FiCamera className="text-white w-6 h-6 mb-1" />
                <span className="text-white font-sans text-xs font-medium">Change Photo</span>
              </div>
            </div>
            {formik.values.profilePic && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs text-logo-rose hover:underline font-sans mt-2 cursor-pointer"
              >
                Remove New Photo
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Username */}
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
                    placeholder="Enter username"
                    maxLength={30}
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full pl-11 pr-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                  />
                </div>
                <div className="flex justify-between items-center h-4 text-xs font-sans mt-0.5 px-1">
                  <span className="text-red-500">{formik.touched.username && formik.errors.username ? formik.errors.username : ''}</span>
                  <span className="text-logo-black/30">{formik.values.username.length}/30</span>
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-1">
                <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
                  Email (Cannot be changed)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                    <FiMail size={18} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formik.values.email}
                    disabled
                    className="w-full pl-11 pr-4 py-2.5 bg-bg-silk-glow/30 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black/50 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1 md:col-span-2 relative" ref={dropdownRef}>
                <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
                  Phone Number
                </label>
                <div className="relative flex items-center bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl overflow-hidden focus-within:border-logo-rose focus-within:ring-2 focus-within:ring-logo-rose/20 transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-logo-rose/5 border-r border-logo-rose/25 hover:bg-logo-rose/10 transition-colors duration-200 cursor-pointer shrink-0"
                  >
                    {selectedCountry ? (
                      <>
                        <img
                          src={selectedCountry.flag}
                          alt={selectedCountry.code}
                          className="w-5 h-3.5 object-cover rounded shadow-sm"
                        />
                        <span className="font-sans text-xs font-semibold text-logo-black">
                          {selectedCountry.dialCode}
                        </span>
                      </>
                    ) : (
                      <FiPhone size={16} />
                    )}
                  </button>
                  
                  <input
                    type="text"
                    name="phone"
                    placeholder={`Format: ${currentMask.replace(/#/g, 'X')}`}
                    maxLength={expectedLength}
                    value={formik.values.phone}
                    onChange={(e) => {
                      // Only allow digits
                      const val = e.target.value.replace(/\D/g, '');
                      formik.setFieldValue('phone', val);
                    }}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2.5 bg-transparent border-none outline-none font-sans text-sm text-logo-black placeholder:text-logo-black/30"
                  />
                </div>

                {/* Country Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute left-0 top-[70px] w-64 max-h-56 bg-white border border-logo-rose/30 rounded-xl shadow-xl overflow-hidden flex flex-col z-50">
                    <div className="p-2 border-b border-logo-rose/10 flex items-center gap-1 bg-bg-silk-glow/50">
                      <input
                        type="text"
                        placeholder="Search country..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-sans text-xs text-logo-black placeholder:text-logo-black/40"
                      />
                    </div>
                    <div className="overflow-y-auto flex-grow py-1 bg-white">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((c) => (
                          <button
                            key={`${c.code}-${c.dialCode}`}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-logo-rose/5 text-left transition-colors duration-150 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={c.flag}
                                alt={c.code}
                                className="w-5 h-3.5 object-cover rounded shadow-sm shrink-0"
                              />
                              <span className="font-sans text-xs text-logo-black truncate max-w-[130px]">
                                {c.name}
                              </span>
                            </div>
                            <span className="font-sans text-xs font-semibold text-logo-black/60">
                              {c.dialCode}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-center font-sans text-xs text-logo-black/40">
                          No countries found
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-0.5 px-1" style={{ minHeight: '1rem' }}>
                  <span className="text-xs text-red-500 font-sans">
                    {formik.touched.phone && formik.errors.phone ? formik.errors.phone : ''}
                  </span>
                  <span className="text-[10px] text-logo-black/30 font-sans shrink-0 ml-2">
                    {formik.values.phone.length}/{expectedLength} digits
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1 md:col-span-2">
                <label className="block font-sans text-sm font-medium text-logo-black mb-1.5">
                  Delivery Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                    <FiMapPin size={18} />
                  </div>
                  <input
                    type="text"
                    name="address"
                    placeholder="Enter your complete shipping address"
                    maxLength={200}
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full pl-11 pr-4 py-2.5 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                  />
                </div>
                <div className="flex justify-between items-center h-4 text-xs font-sans mt-0.5 px-1">
                  <span className="text-red-500">{formik.touched.address && formik.errors.address ? formik.errors.address : ''}</span>
                  <span className="text-logo-black/30">{formik.values.address.length}/200</span>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="text-green-500 text-sm text-center bg-green-50 py-2 rounded-lg">
                {saveSuccess}
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={!isLoading ? { scale: 1.01 } : {}}
              whileTap={!isLoading ? { scale: 0.99 } : {}}
              className={`w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold tracking-wide text-sm shadow-md transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave size={18} />
                  Save Changes
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;
