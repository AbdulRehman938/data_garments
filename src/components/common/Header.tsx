import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiShoppingBag, FiX, FiMenu } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Header = () => {
  const navLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
  ];

  const [isVisible, setIsVisible] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <header
      className={`sticky top-0 z-50 bg-pop-orchid/20 backdrop-blur-3xl rounded-b-2xl w-full transition-transform duration-300 ease-in-out transform ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="w-full px-2 md:px-6 py-1">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <motion.img
              src="/logo_header.png"
              alt="Data Garments"
              className="h-9 md:h-12 w-[135px] max-w-full object-fill"
              whileHover={{ scale: 1.00 }}
              transition={{ duration: 0.2 }}
            />
          </Link>

          {/* Right Side Buttons & Links */}
          <div className="flex items-center gap-2 md:gap-8">
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="font-sans text-logo-black hover:text-logo-rose transition-colors duration-200 relative group"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-logo-rose group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 md:gap-4">
              {/* Search Section (Inline Flow) */}
              <div
                onClick={() => {
                  if (!isSearchOpen) setIsSearchOpen(true);
                }}
                className={`flex items-center h-8 md:h-10 rounded-full overflow-hidden border transition-all duration-300 ease-in-out px-2 md:px-3 ${
                  isSearchOpen
                    ? 'w-[200px] xs:w-[240px] md:w-[320px] bg-bg-silk-glow border-logo-rose/30 cursor-default'
                    : 'w-8 md:w-10 bg-transparent border-transparent hover:bg-logo-rose/10 cursor-pointer justify-center !px-0'
                }`}
              >
                <div className="flex items-center justify-between w-full h-full gap-1.5 md:gap-2">
                  <FiSearch className={`w-5 h-5 md:w-6 md:h-6 flex-shrink-0 transition-colors duration-200 ${isSearchOpen ? 'text-logo-black/50 w-4 h-4 md:w-5 md:h-5' : 'text-logo-black'}`} />
                  
                  {isSearchOpen && (
                    <input
                      type="text"
                      placeholder="Search exclusive collections..."
                      className="bg-transparent border-none outline-none w-full font-sans text-xs md:text-sm text-logo-black placeholder:text-logo-black/40"
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
                      className="p-1 text-logo-black hover:text-logo-rose rounded-full hover:bg-logo-rose/10 cursor-pointer transition-colors duration-200 flex-shrink-0 flex items-center justify-center"
                      aria-label="Close search"
                    >
                      <FiX className="w-4 h-4 md:w-4.5 md:h-4.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cart Button */}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;