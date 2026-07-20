/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiUser,
  FiArrowLeft,
  FiPhone,
  FiMapPin,
  FiSearch,
  FiCamera,
  FiChevronDown,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { supabase } from "../../utils/supabase";
import { sendOtpEmail } from "../../utils/email";
import { uploadProfileImage } from "../../utils/storage";
import { hashPassword } from "../../utils/password";

interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Country API state
  const [countries, setCountries] = useState<Country[]>([]);
  const [masks, setMasks] = useState<Record<string, string>>({});
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch countries flags, codes, and masks dynamically from free APIs on mount
  useEffect(() => {
    // 1. Fetch country info (flags, codes, names, dialCode)
    fetch(
      "https://cdn.jsdelivr.net/npm/countries-list@2.6.1/dist/countries.json",
    )
      .then((res) => res.json())
      .then((data: Record<string, any>) => {
        const formatted: Country[] = Object.keys(data)
          .map((code) => {
            const c = data[code];
            const rawPhone = c.phone || "";
            const dialCode = rawPhone.startsWith("+")
              ? rawPhone
              : `+${rawPhone}`;
            return {
              name: c.name || "",
              code: code || "",
              dialCode: dialCode,
              flag: `https://flagcdn.com/w40/${code.toLowerCase()}.png`,
            };
          })
          .filter((c) => c.dialCode && c.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(formatted);

        // Find Pakistan to set as default country
        const pk = formatted.find((c) => c.code === "PK");
        if (pk) {
          setSelectedCountry(pk);
        } else if (formatted.length > 0) {
          setSelectedCountry(formatted[0]);
        }
      })
      .catch((err) => {
        console.error("Error fetching countries:", err);
      });

    // 2. Fetch phone input masks dynamically from the vueform jsDelivr CDN endpoint
    fetch(
      "https://cdn.jsdelivr.net/gh/vueform/international-phone-masks@master/masks.json",
    )
      .then((res) => res.json())
      .then((data) => {
        setMasks(data);
      })
      .catch((err) => {
        console.error("Error fetching phone masks:", err);
      });
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate the phone format input length dynamically from the mask dataset
  const getExpectedLength = () => {
    if (!selectedCountry) return 10;
    const maskData = masks[selectedCountry.code];
    if (!maskData) return 10; // Default fallback

    const maskStr = Array.isArray(maskData) ? maskData[0] : maskData;
    if (typeof maskStr !== "string") return 10;

    const hashCount = (maskStr.match(/#/g) || []).length;
    return hashCount > 0 ? hashCount : 10;
  };

  const expectedLength = getExpectedLength();

  const getMaskString = () => {
    if (!selectedCountry) return "##########";
    const maskData = masks[selectedCountry.code];
    if (!maskData) return "##########";
    const maskStr = Array.isArray(maskData) ? maskData[0] : maskData;
    return typeof maskStr === "string" ? maskStr : "##########";
  };

  const currentMask = getMaskString();

  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .min(3, "Username must be at least 3 characters")
      .required("Username is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    phone: Yup.string()
      .matches(
        /^[0-9]*$/,
        "Phone number must contain only digits (no spaces or dashes)",
      )
      .required("Phone number is required")
      .test(
        "len",
        `Phone number must be exactly ${expectedLength} digits`,
        (val) => {
          if (!val) return false;
          return val.length === expectedLength;
        },
      ),
    address: Yup.string()
      .min(10, "Address must be at least 10 characters")
      .required("Address is required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match")
      .required("Confirm password is required"),
  });

  const formik = useFormik({
    initialValues: {
      username: "",
      email: "",
      phone: "",
      address: "",
      profilePic: null as File | null,
      password: "",
      confirmPassword: "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsLoading(true);
      setSubmitError(null);
      try {
        const fullPhone = `${selectedCountry?.dialCode || ""}${values.phone}`;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Check if user already exists
        const { data: existingUsers, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("email", values.email);

        if (checkError) {
          console.error("Error checking existing user:", checkError);
        }

        if (existingUsers && existingUsers.length > 0) {
          setSubmitError("Email is already registered.");
          setIsLoading(false);
          return;
        }

        // Hash password before storing
        const hashedPassword = await hashPassword(values.password);

        // Create user first to get ID
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert({
            username: values.username,
            email: values.email,
            password: hashedPassword,
            phone: fullPhone,
            address: values.address,
            profile_pic_url: null,
            otp: otp,
            otp_created_at: new Date().toISOString(),
            is_verified: false,
            role: "Customer",
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Upload profile image if provided
        let profilePicUrl: string | null = null;
        if (values.profilePic) {
          try {
            profilePicUrl = await uploadProfileImage(
              values.profilePic,
              newUser.id,
            );

            if (profilePicUrl) {
              const { error: updateError } = await supabase
                .from("users")
                .update({ profile_pic_url: profilePicUrl })
                .eq("id", newUser.id);

              if (updateError) throw updateError;
            }
          } catch (uploadError: any) {
            console.warn(
              "Profile picture upload failed, continuing without it:",
              uploadError.message,
            );
          }
        }

        // Send OTP email - if this fails, delete the created user and stop
        try {
          await sendOtpEmail(values.email, otp);
        } catch (emailError: any) {
          console.error(
            "Failed to send OTP email, cleaning up user:",
            emailError,
          );
          try {
            await supabase.from("users").delete().eq("id", newUser.id);
          } catch (cleanupError) {
            console.error(
              "Failed to cleanup user after email failure:",
              cleanupError,
            );
          }
          throw new Error(
            "Failed to send verification email. Please try again later.",
          );
        }

        navigate("/verify-otp", { state: { email: values.email } });
      } catch (error: any) {
        console.error("Signup error:", error);
        setSubmitError(error.message || "An error occurred during signup.");
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      formik.setFieldValue("profilePic", file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    formik.setFieldValue("profilePic", null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Filter countries by search query
  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 lg:gap-8 items-center justify-center mx-auto"
    >
     

      {/* Right Side - Signup Card */}
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-logo-rose/20 p-5 md:p-6 lg:p-8 md:pt-3 lg:pt-1">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="font-serif text-2xl md:text-3xl my-2! text-logo-black">
            Create Account
          </h1>
          <p className="font-sans text-xs md:text-sm text-logo-black/60">
            Join us and start your journey
          </p>
        </div>

        {/* Profile Picture at Top */}
        <div className="flex flex-col items-center justify-center mb-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full border border-logo-rose/25 bg-bg-silk-glow/50 overflow-hidden flex items-center justify-center relative shadow-sm group cursor-pointer transition-all duration-300 hover:border-logo-rose/60"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <FiUser className="text-logo-black/30 w-8 h-8 group-hover:scale-105 transition-transform duration-300" />
            )}
            <div className="absolute inset-0 bg-logo-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <FiCamera className="text-white w-5 h-5 mb-0.5" />
              <span className="text-white font-sans text-[9px] font-medium">
                Choose Photo
              </span>
            </div>
          </div>
          <span className="font-sans text-xs font-semibold text-logo-black/70 mt-2">
            Profile Photo (Optional)
          </span>
          {formik.values.profilePic && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-[11px] text-logo-rose hover:underline font-sans mt-1 cursor-pointer"
            >
              Remove Photo
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-0.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                  <FiUser size={18} />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-11 pr-4 py-2 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.username && formik.errors.username
                  ? formik.errors.username
                  : ""}
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
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
                  className="w-full pl-11 pr-4 py-2 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.email && formik.errors.email
                  ? formik.errors.email
                  : ""}
              </div>
            </div>

            {/* Phone Number Input with Flag Dropdown */}
            <div className="space-y-1 md:col-span-2 relative" ref={dropdownRef}>
              <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
                Phone Number
              </label>
              <div className="relative flex items-center bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl overflow-hidden focus-within:border-logo-rose focus-within:ring-2 focus-within:ring-logo-rose/20 transition-all duration-300">
                {/* Flag Selector Prefix */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-logo-rose/5 border-r border-logo-rose/25 hover:bg-logo-rose/10 transition-colors duration-200 cursor-pointer shrink-0"
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
                  <FiChevronDown
                    className={`w-4 h-4 text-logo-black/50 transition-transform duration-300 ${
                      isDropdownOpen ? "rotate-180 text-logo-rose" : "rotate-0"
                    }`}
                  />
                </button>

                {/* Number Input Box */}
                <input
                  type="text"
                  name="phone"
                  placeholder={`Format: ${currentMask.replace(/#/g, "X")}`}
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full px-3 py-2 bg-transparent border-none outline-none font-sans text-sm text-logo-black placeholder:text-logo-black/30"
                />
              </div>

              {/* Country Search Dropdown Modal */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.8, originY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute left-0 top-17.5 w-64 max-h-56 bg-white border border-logo-rose/30 rounded-xl shadow-xl overflow-hidden flex flex-col z-50 origin-top"
                  >
                    {/* Search country field */}
                    <div className="p-2 border-b border-logo-rose/10 flex items-center gap-1 bg-bg-silk-glow/50">
                      <FiSearch
                        className="text-logo-black/40 shrink-0"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder="Search country/code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none outline-none font-sans text-xs text-logo-black placeholder:text-logo-black/40"
                      />
                    </div>
                    {/* List */}
                    <div className="overflow-y-auto grow py-1 bg-white">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((c) => (
                          <button
                            key={`${c.code}-${c.dialCode}`}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-logo-rose/5 text-left transition-colors duration-150 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={c.flag}
                                alt={c.code}
                                className="w-5 h-3.5 object-cover rounded shadow-sm shrink-0"
                              />
                              <span className="font-sans text-xs text-logo-black truncate max-w-32.5">
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
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.phone && formik.errors.phone
                  ? formik.errors.phone
                  : ""}
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
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-11 pr-11 py-2 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-logo-black/40 hover:text-logo-rose transition-colors duration-200"
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.password && formik.errors.password
                  ? formik.errors.password
                  : ""}
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-1">
              <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                  <FiLock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-11 pr-11 py-2 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-logo-black/40 hover:text-logo-rose transition-colors duration-200"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff size={18} />
                  ) : (
                    <FiEye size={18} />
                  )}
                </button>
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.confirmPassword && formik.errors.confirmPassword
                  ? formik.errors.confirmPassword
                  : ""}
              </div>
            </div>

            {/* Address Input (Full width on md screens) */}
            <div className="space-y-1 md:col-span-2">
              <label className="block font-sans text-xs md:text-sm font-medium text-logo-black mb-1.5">
                Delivery Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-logo-black/40">
                  <FiMapPin size={18} />
                </div>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter your complete shipping address in Pakistan"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full pl-11 pr-4 py-2 bg-bg-silk-glow/50 border border-logo-rose/20 rounded-xl font-sans text-sm text-logo-black placeholder:text-logo-black/40 focus:outline-none focus:border-logo-rose focus:ring-2 focus:ring-logo-rose/20 transition-all duration-300"
                />
              </div>
              <div className="h-4 text-xs text-red-500 font-sans mt-0.5 px-1">
                {formik.touched.address && formik.errors.address
                  ? formik.errors.address
                  : ""}
              </div>
            </div>
          </div>

          {submitError && (
            <div className="text-red-500 text-sm mt-2 text-center">
              {submitError}
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={!isLoading ? { scale: 1.01 } : {}}
            whileTap={!isLoading ? { scale: 0.99 } : {}}
            className={`w-full py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-semibold tracking-wide text-xs md:text-sm shadow-md transition-all duration-300 cursor-pointer mt-2! ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isLoading ? "Processing..." : "Create Account"}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-3">
          <div className="flex-1 h-px bg-logo-rose/20" />
          <span className="font-sans text-xs text-logo-black/40">or</span>
          <div className="flex-1 h-px bg-logo-rose/20" />
        </div>

        {/* Login Button */}
        <div className="text-center">
          <p className="font-sans text-xs md:text-sm text-logo-black/60 mb-2">
            Already have an account?
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 border border-logo-rose/40 hover:border-logo-rose hover:bg-logo-rose/5 text-logo-black rounded-xl font-sans font-semibold tracking-wide text-xs md:text-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-4"
          >
            <FiArrowLeft size={16} />
            Sign In
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default Signup;
