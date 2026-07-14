/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch, FiPhone, FiMapPin, FiCheck, FiX, FiPlus, FiTrash2, FiUser, FiMail, FiLock, FiChevronDown, FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { uploadProfileImage } from '../../utils/storage';
import { hashPassword } from '../../utils/password';
import { useToast } from '../../components/common/Toast';

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  address: string | null;
  is_verified: boolean;
  role: string | null;
  profile_pic_url: string | null;
  created_at: string;
  created_by: string | null;
}

interface CountryApiData {
  name?: string;
  phone?: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Country API state for add customer form
  const [countries, setCountries] = useState<Country[]>([]);
  const [masks, setMasks] = useState<Record<string, string | string[]>>({});
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchCountryQuery, setSearchCountryQuery] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      const { data, error, count } = await supabase
        .from('users')
        .select('*')
        .not('role', 'eq', 'Admin')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchUsers();
    // Fetch countries
    fetch('https://cdn.jsdelivr.net/npm/countries-list@2.6.1/dist/countries.json')
      .then((res) => res.json())
      .then((data: Record<string, CountryApiData>) => {
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

    // Close country dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentPage, itemsPerPage, fetchUsers]);

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('users').update({ is_verified: !currentStatus }).eq('id', userId);
      if (error) throw error;
      fetchUsers();
      toast(`Customer ${!currentStatus ? 'verified' : 'unverified'} successfully!`, 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update customer';
      console.error('Error updating user:', error);
      toast(errorMessage, 'error', 'Update Failed');
    }
  };

  const handleDeleteCustomer = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete customer "${username}"?`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      fetchUsers();
      toast('Customer deleted successfully!', 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer';
      console.error('Error deleting customer:', error);
      toast(errorMessage, 'error');
    }
  };

  const getExpectedLength = () => {
    if (!selectedCountry) return 10;
    const maskData = masks[selectedCountry.code];
    if (!maskData) return 10;
    const maskStr = Array.isArray(maskData) ? maskData[0] : maskData;
    if (typeof maskStr !== 'string') return 10;
    const hashCount = (maskStr.match(/#/g) || []).length;
    return hashCount > 0 ? hashCount : 10;
  };

  interface AddCustomerFormValues {
    username: string;
    email: string;
    phone: string;
    address: string;
    profilePic: File | null;
    password: string;
  }

  const validationSchema = Yup.object().shape({
    username: Yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    phone: Yup.string().matches(/^[0-9]*$/, 'Phone number must contain only digits').required('Phone number is required').test('len', `Phone number must be exactly ${getExpectedLength()} digits`, (val) => { if (!val) return false; return val.length === getExpectedLength(); }),
    address: Yup.string().min(10, 'Address must be at least 10 characters').required('Address is required'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  });

  const formik = useFormik<AddCustomerFormValues>({
    initialValues: {
      username: '',
      email: '',
      phone: '',
      address: '',
      profilePic: null as File | null,
      password: '',
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        const fullPhone = `${selectedCountry?.dialCode || ''}${values.phone}`;
        let profilePicUrl: string | null = null;
        const hashedPassword = await hashPassword(values.password);

        // First insert user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            username: values.username,
            email: values.email,
            password: hashedPassword,
            phone: fullPhone,
            address: values.address,
            profile_pic_url: null,
            is_verified: true,
            role: 'Customer',
            created_by: currentAdmin?.id,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Upload profile picture if provided
        if (values.profilePic) {
          try {
            profilePicUrl = await uploadProfileImage(values.profilePic, newUser.id);
            if (profilePicUrl) {
              await supabase.from('users').update({ profile_pic_url: profilePicUrl }).eq('id', newUser.id);
            }
          } catch (uploadError: unknown) {
            const message = uploadError instanceof Error ? uploadError.message : 'Unknown error';
            console.warn('Profile picture upload failed:', message);
          }
        }

        toast('Customer created successfully!', 'success');
        setIsAddModalOpen(false);
        resetForm();
        setPreviewUrl(null);
        fetchUsers();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
        console.error('Error creating customer:', error);
        toast(errorMessage, 'error');
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
    c.name.toLowerCase().includes(searchCountryQuery.toLowerCase()) ||
    c.dialCode.includes(searchCountryQuery) ||
    c.code.toLowerCase().includes(searchCountryQuery.toLowerCase())
  );

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Customers</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold text-sm transition-all"
        >
          <FiPlus size={16} />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/50" size={20} />
          <input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-logo-rose/20 rounded-xl focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/30"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-logo-rose/20">
        {isLoading ? (
          <div className="p-8 text-center text-logo-black/70">Loading customers...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-600">{searchQuery ? 'No customers found' : 'No customers yet'}</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-linear-to-r from-logo-rose/10 to-pop-orchid/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-logo-black">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-logo-black">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-logo-black">Created By</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-logo-black">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-logo-black">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-logo-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-logo-rose/10">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-logo-rose/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profile_pic_url ? (
                            <img src={user.profile_pic_url} alt={user.username} className="w-10 h-10 object-cover rounded-full border-2 border-logo-rose/20" />
                          ) : (
                            <div className="w-10 h-10 bg-linear-to-br from-logo-rose/20 to-pop-orchid/20 rounded-full flex items-center justify-center border-2 border-logo-rose/20">
                              <span className="text-logo-black font-bold">{user.username.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-logo-black">{user.username}</p>
                            <p className="text-sm text-logo-black/60">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.phone && <div className="flex items-center gap-2 text-sm text-logo-black/70"><FiPhone size={14} />{user.phone}</div>}
                          {user.address && <div className="flex items-center gap-2 text-sm text-logo-black/70"><FiMapPin size={14} /><span className="truncate max-w-xs">{user.address}</span></div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-logo-black/70">
                          {user.created_by ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-pop-orchid/10 text-pop-orchid rounded-full text-xs font-semibold">Admin</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-logo-rose/10 text-logo-rose rounded-full text-xs font-semibold">Self</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleVerification(user.id, user.is_verified)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${user.is_verified
                            ? 'bg-energy-apricot/20 text-energy-apricot hover:bg-energy-apricot/30'
                            : 'bg-logo-rose/20 text-logo-rose hover:bg-logo-rose/30'
                          }`}
                        >
                          {user.is_verified ? <><FiCheck size={12} /> Verified</> : <><FiX size={12} /> Unverified</>}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-logo-black/70 font-medium">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteCustomer(user.id, user.username)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-logo-rose/10">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user.profile_pic_url ? (
                        <img src={user.profile_pic_url} alt={user.username} className="w-10 h-10 object-cover rounded-full shrink-0 border-2 border-logo-rose/20" />
                      ) : (
                        <div className="w-10 h-10 bg-linear-to-br from-logo-rose/20 to-pop-orchid/20 rounded-full flex items-center justify-center shrink-0 border-2 border-logo-rose/20">
                          <span className="text-logo-black font-bold">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-logo-black truncate">{user.username}</p>
                        <p className="text-xs text-logo-black/60 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomer(user.id, user.username)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-logo-black/70">{new Date(user.created_at).toLocaleDateString()}</span>
                    {user.created_by ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pop-orchid/10 text-pop-orchid rounded-full text-xs font-semibold">Admin Created</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-logo-rose/10 text-logo-rose rounded-full text-xs font-semibold">Self Signed Up</span>
                    )}
                    <button
                      onClick={() => handleToggleVerification(user.id, user.is_verified)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all ${user.is_verified
                        ? 'bg-energy-apricot/20 text-energy-apricot'
                        : 'bg-logo-rose/20 text-logo-rose'
                      }`}
                    >
                      {user.is_verified ? <FiCheck size={10} /> : <FiX size={10} />}
                      {user.is_verified ? ' Verified' : ' Unverified'}
                    </button>
                  </div>
                  {(user.phone || user.address) && (
                    <div className="space-y-1">
                      {user.phone && <div className="flex items-center gap-2 text-xs text-logo-black/70"><FiPhone size={12} />{user.phone}</div>}
                      {user.address && <div className="flex items-center gap-2 text-xs text-logo-black/70"><FiMapPin size={12} /><span className="truncate">{user.address}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-6 py-4 border-t border-logo-rose/10 bg-bg-silk-glow/30">
                <p className="text-xs md:text-sm text-logo-black/70 font-medium">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} customers
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border-2 border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm font-bold text-logo-black">{currentPage} / {Math.ceil(totalCount / itemsPerPage)}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                    className="px-3 py-1.5 text-sm border-2 border-logo-rose/20 rounded-lg hover:bg-logo-rose/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-logo-rose/20"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-logo-rose/10 bg-linear-to-r from-logo-rose/5 to-pop-orchid/5">
                <h2 className="font-serif text-xl text-logo-black font-bold">Add New Customer</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[80vh] overflow-y-auto">
                {/* Profile Picture */}
                <div className="flex flex-col items-center justify-center mb-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-logo-rose/30 bg-bg-silk-glow/50 overflow-hidden flex items-center justify-center relative shadow-md group cursor-pointer transition-all hover:border-logo-rose/60"
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FiUser className="text-logo-black/30 w-10 h-10 group-hover:scale-105 transition-transform" />
                    )}
                    <div className="absolute inset-0 bg-logo-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiCamera className="text-white w-6 h-6 mb-1" />
                      <span className="text-white font-sans text-xs font-medium">Add Photo</span>
                    </div>
                  </div>
                  {formik.values.profilePic && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs text-logo-rose hover:underline font-sans mt-2 cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <form onSubmit={formik.handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="space-y-1">
                      <label className="block font-sans text-sm font-bold text-logo-black mb-1.5">Username</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                          <FiUser size={18} />
                        </div>
                        <input
                          type="text"
                          name="username"
                          placeholder="Enter username"
                          value={formik.values.username}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="w-full pl-11 pr-4 py-3 bg-bg-silk-glow/50 border-2 border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/30"
                        />
                      </div>
                      {formik.touched.username && formik.errors.username && (
                        <p className="text-red-500 text-xs font-medium">{formik.errors.username}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block font-sans text-sm font-bold text-logo-black mb-1.5">Email Address</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                          <FiMail size={18} />
                        </div>
                        <input
                          type="email"
                          name="email"
                          placeholder="Enter email"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="w-full pl-11 pr-4 py-3 bg-bg-silk-glow/50 border-2 border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/30"
                        />
                      </div>
                      {formik.touched.email && formik.errors.email && (
                        <p className="text-red-500 text-xs font-medium">{formik.errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="block font-sans text-sm font-bold text-logo-black mb-1.5">Password</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                          <FiLock size={18} />
                        </div>
                        <input
                          type="password"
                          name="password"
                          placeholder="Create a password"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="w-full pl-11 pr-4 py-3 bg-bg-silk-glow/50 border-2 border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/30"
                        />
                      </div>
                      {formik.touched.password && formik.errors.password && (
                        <p className="text-red-500 text-xs font-medium">{formik.errors.password}</p>
                      )}
                    </div>

                    {/* Phone Number with Country */}
                    <div className="space-y-1 md:col-span-2 relative" ref={countryDropdownRef}>
                      <label className="block font-sans text-sm font-bold text-logo-black mb-1.5">Phone Number</label>
                      <div className="relative flex items-center bg-bg-silk-glow/50 border-2 border-logo-rose/20 rounded-xl overflow-hidden focus-within:border-logo-rose focus-within:ring-2 focus-within:ring-logo-rose/30 transition-all">
                        <button
                          type="button"
                          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                          className="flex items-center gap-1.5 px-3 py-3 bg-logo-rose/10 border-r border-logo-rose/30 hover:bg-logo-rose/20 transition-colors cursor-pointer shrink-0"
                        >
                          {selectedCountry ? (
                            <>
                              <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-5 h-3.5 object-cover rounded shadow-sm" />
                              <span className="font-sans text-xs font-semibold text-logo-black">{selectedCountry.dialCode}</span>
                            </>
                          ) : (
                            <FiPhone size={16} />
                          )}
                          <FiChevronDown className={`w-4 h-4 text-logo-black/50 transition-transform ${isCountryDropdownOpen ? 'rotate-180 text-logo-rose' : ''}`} />
                        </button>

                        <input
                          type="text"
                          name="phone"
                          placeholder={`Format: ${Array.isArray(masks[selectedCountry?.code || '']) ? masks[selectedCountry?.code || ''][0] : masks[selectedCountry?.code || ''] || '##########'}`}
                          value={formik.values.phone}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="w-full px-3 py-3 bg-transparent border-none outline-none font-sans text-sm text-logo-black placeholder:text-logo-black/40"
                        />
                      </div>

                      {/* Country Dropdown */}
                      {isCountryDropdownOpen && (
                        <div className="absolute left-0 top-full mt-2 w-64 max-h-56 bg-white border-2 border-logo-rose/30 rounded-xl shadow-xl overflow-hidden flex flex-col z-50">
                          <div className="p-2 border-b border-logo-rose/10 flex items-center gap-1 bg-bg-silk-glow/50">
                            <FiSearch className="text-logo-black/40 shrink-0" size={14} />
                            <input
                              type="text"
                              placeholder="Search country..."
                              value={searchCountryQuery}
                              onChange={(e) => setSearchCountryQuery(e.target.value)}
                              className="w-full bg-transparent border-none outline-none font-sans text-xs text-logo-black placeholder:text-logo-black/40"
                            />
                          </div>
                          <div className="overflow-y-auto grow py-1 bg-white">
                            {filteredCountries.length > 0 ? (
                              filteredCountries.map((c) => (
                                <button
                                  key={`${c.code}-${c.dialCode}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountry(c);
                                    setIsCountryDropdownOpen(false);
                                    setSearchCountryQuery('');
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-logo-rose/5 text-left transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <img src={c.flag} alt={c.code} className="w-5 h-3.5 object-cover rounded shadow-sm shrink-0" />
                                    <span className="font-sans text-xs text-logo-black truncate max-w-32.5">{c.name}</span>
                                  </div>
                                  <span className="font-sans text-xs font-semibold text-logo-black/60">{c.dialCode}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-3 text-center font-sans text-xs text-logo-black/40">No countries found</div>
                            )}
                          </div>
                        </div>
                      )}

                      {formik.touched.phone && formik.errors.phone && (
                        <p className="text-red-500 text-xs font-medium mt-1">{formik.errors.phone}</p>
                      )}
                    </div>

                    {/* Address */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="block font-sans text-sm font-bold text-logo-black mb-1.5">Delivery Address</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                          <FiMapPin size={18} />
                        </div>
                        <input
                          type="text"
                          name="address"
                          placeholder="Enter complete delivery address"
                          value={formik.values.address}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          className="w-full pl-11 pr-4 py-3 bg-bg-silk-glow/50 border-2 border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/30"
                        />
                      </div>
                      {formik.touched.address && formik.errors.address && (
                        <p className="text-red-500 text-xs font-medium">{formik.errors.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-3 border-2 border-logo-rose/30 text-logo-black rounded-xl font-sans font-bold transition-all hover:bg-logo-rose/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formik.isSubmitting}
                      className="flex-1 py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-bold transition-all disabled:opacity-70"
                    >
                      {formik.isSubmitting ? 'Creating...' : 'Create Customer'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
