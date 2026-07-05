import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiShoppingBag, FiX, FiMenu, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const navLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const [isVisible, setIsVisible] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = window.innerHeight; // Hero is min-h-screen (100vh)

      // Only hide/unhide if hero section is out of viewport
      if (currentScrollY > heroHeight) {
        if (currentScrollY > lastScrollY) {
          // Scrolling down
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
      } else {
        // Hero is in viewport -> always show header
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-pop-orchid/20 backdrop-blur-3xl rounded-b-2xl w-full transition-transform duration-300 ease-in-out transform ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="w-full px-2 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <motion.img
              src="/logo_header.avif"
              alt="Data Garments"
              className="h-9 md:h-9 w-[135px] max-w-full object-fill"
              whileHover={{ scale: 1.00 }}
              transition={{ duration: 0.2 }}
              loading="eager"
            />
          </Link>

          {/* Right Side Buttons & Links */}
          <div className="flex items-center gap-2 md:gap-6">
             {/* Action Buttons */}
            <div className="flex items-center gap-1.5 md:gap-4">
              {/* Search Section (Inline Flow) */}
              <div
                onClick={() => {
                  if (!isSearchOpen) setIsSearchOpen(true);
                }}
                className={`flex items-center h-8 md:h-9 rounded-full overflow-hidden border transition-all duration-300 ease-in-out px-2 md:px-3 ${
                  isSearchOpen
                    ? 'w-[200px] xs:w-[240px] md:w-[320px] bg-bg-silk-glow border-logo-rose/30 cursor-default'
                    : 'w-8 md:w-9 bg-transparent border-transparent hover:bg-logo-rose/10 cursor-pointer justify-center px-0!'
                }`}
              >
                <div className="flex items-center justify-end w-full h-full gap-1.5 md:gap-1">
                  <FiSearch className={`w-5 h-5 shrink-0 transition-colors duration-200 ${isSearchOpen ? 'text-logo-black/50 w-4 h-4 md:w-5 md:h-5' : 'text-logo-black'}`} />
                  
                  {isSearchOpen && (
                    <input
                      type="text"
                      placeholder="Search exclusive collections..."
                      className="bg-transparent border-none outline-none w-full h-full font-sans text-xs md:text-sm text-logo-black placeholder:text-logo-black/40"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  {isSearchOpen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearchOpen(false);
                      }}
                      className="p-1 text-logo-black hover:text-logo-rose rounded-full hover:bg-logo-rose/10 cursor-pointer transition-colors duration-200 shrink-0 flex items-center justify-center"
                      aria-label="Close search"
                    >
                      <FiX className="w-4 h-4 md:w-4.5 md:h-4.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cart Button - Only show when authenticated */}
              {isAuthenticated && (
                <motion.button
                  className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors duration-200 cursor-pointer relative"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Cart"
                >
                  <FiShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-pop-orchid text-white text-[10px] md:text-xs w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center font-sans">
                    0
                  </span>
                </motion.button>
              )}

              {/* User Profile Button - Only show when authenticated */}
              {isAuthenticated && (
                <div className="relative" ref={profileDropdownRef}>
                  <motion.button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors duration-200 cursor-pointer relative overflow-hidden"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Profile"
                    title={user?.username || 'Profile'}
                  >
                    {user?.profilePicUrl ? (
                      <img
                        src={user.profilePicUrl}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </motion.button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-12 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-logo-rose/20 overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-logo-rose/10">
                          <div className="flex items-center gap-3">
                            {user?.profilePicUrl ? (
                              <img
                                src={user.profilePicUrl}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-logo-rose/20 flex items-center justify-center">
                                <FiUser className="text-logo-rose" size={20} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-sans text-sm font-medium text-logo-black truncate">
                                {user?.username}
                              </p>
                              <p className="font-sans text-xs text-logo-black/60 truncate">
                                {user?.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2">
                          {user?.role === 'Admin' && (
                            <Link
                              to="/admin/dashboard"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-logo-rose/5 text-logo-black hover:text-logo-rose transition-colors duration-200 cursor-pointer"
                            >
                              <FiSettings size={18} />
                              <span className="font-sans text-sm">Admin Dashboard</span>
                            </Link>
                          )}
                          <Link
                            to="/profile-settings"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-logo-rose/5 text-logo-black hover:text-logo-rose transition-colors duration-200 cursor-pointer"
                          >
                            <FiSettings size={18} />
                            <span className="font-sans text-sm">Profile Settings</span>
                          </Link>
                          <button
                            onClick={() => {
                              handleLogout();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-logo-black hover:text-red-600 transition-colors duration-200 cursor-pointer"
                          >
                            <FiLogOut size={18} />
                            <span className="font-sans text-sm">Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-8 h-8 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors duration-200 cursor-pointer"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </button>
            </div>
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`font-sans text-logo-black font-medium hover:text-logo-rose transition-colors duration-200 relative group ${
                    link.name === 'Contact Us' ? 'text-xs' : 'text-xs'
                  }`}
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-logo-rose group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </nav>

            {/* Auth Buttons - Desktop Only */}
            {!isAuthenticated ? (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  to="/login"
                  className="font-sans text-xs text-logo-black hover:text-logo-rose transition-colors duration-200 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="font-sans text-xs px-4 py-2 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full transition-all duration-300 font-medium"
                >
                  Sign Up
                </Link>
              </div>
            ) : null}

          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden w-full bg-white/95 backdrop-blur-xl border-t border-logo-rose/10 overflow-hidden"
          >
            <div className="flex flex-col px-4 py-4 gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-sans text-logo-black hover:text-logo-rose transition-colors duration-200 text-lg py-2 border-b border-logo-rose/5"
                >
                  {link.name}
                </Link>
              ))}
              {/* Mobile Auth Links */}
              <div className="flex flex-col gap-3 pt-2">
                {!isAuthenticated ? (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="font-sans text-logo-black hover:text-logo-rose transition-colors duration-200 text-lg py-2"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="font-sans text-action-bordeaux hover:bg-action-bordeaux/10 text-center py-3 rounded-full transition-all duration-200 font-medium"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 py-2 px-3 bg-bg-silk-glow/50 rounded-lg">
                      {user?.profilePicUrl ? (
                        <img
                          src={user.profilePicUrl}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-logo-rose/20 flex items-center justify-center">
                          <FiUser className="text-logo-rose" size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-sans text-sm font-medium text-logo-black">
                          {user?.username}
                        </p>
                        <p className="font-sans text-xs text-logo-black/60">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="font-sans text-logo-black hover:text-logo-rose transition-colors duration-200 text-lg py-2 flex items-center gap-2"
                    >
                      <FiLogOut size={18} />
                      Logout
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;