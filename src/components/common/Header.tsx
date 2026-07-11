import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiShoppingBag, FiX, FiMenu, FiUser, FiLogOut,
  FiSettings, FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiHeart,
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { supabase } from '../../utils/supabase';

/* ─── Types ─── */
interface SearchProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

/* ─── Highlight matching letters ─── */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-logo-rose/20 text-action-bordeaux rounded-sm px-0.5 not-italic font-bold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const {
    cartItems, cartCount, cartTotal,
    isCartOpen, addToCart: ctxAddToCart,
    removeFromCart, changeQty, clearCart, saveCartToDB,
    openCart, closeCart,
  } = useCart();
  const navigate = useNavigate();
  const navLinks = [
    { name: 'Shop', path: '/shop' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact Us', path: '/contact' },
  ];

  /* ── visibility ── */
  const [isVisible, setIsVisible] = useState(true);

  /* ── search ── */
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── cart sidebar local UI state ── */
  const [cartSearch, setCartSearch] = useState('');
  const [cartFilter, setCartFilter] = useState<'all' | 'low' | 'high'>('all');

  /* ── ui ── */
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  /* ─────────────── scroll hide/show ─────────────── */
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      if (currentScrollY > heroHeight) {
        setIsVisible(currentScrollY <= lastScrollY);
      } else {
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ─────────────── close dropdowns on outside click ─────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ─────────────── search products ─────────────── */
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .ilike('name', `%${q}%`)
        .limit(8);
      if (!error) setSearchResults(data || []);
    } catch { /* silent */ } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchProducts]);

  /* ─────────────── cart helpers ─────────────── */
  const addToCart = (product: SearchProduct) => {
    ctxAddToCart({ ...product, quantity: 1 });
  };

  const filteredCartItems = cartItems
    .filter((i) => i.name.toLowerCase().includes(cartSearch.toLowerCase()))
    .filter((i) => {
      if (cartFilter === 'low') return i.price < 2000;
      if (cartFilter === 'high') return i.price >= 2000;
      return true;
    });

  const handleLogout = async () => {
    await logout(async () => {
      if (cartItems.length > 0) {
        await saveCartToDB();
        // Clear cart from localStorage
        clearCart();
      }
    });
    navigate('/');
  };

  return (
    <>
    <header
      className={`sticky top-0 z-50 bg-pop-orchid/20 backdrop-blur-3xl rounded-b-2xl w-full transition-transform duration-300 ease-in-out transform ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="w-full px-2 md:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="shrink-0">
            <motion.img
              src="/logo_header.avif"
              alt="Data Garments"
              className="h-8 md:h-9 w-[115px] md:w-[135px] max-w-full object-fill"
              whileHover={{ scale: 1.00 }}
              transition={{ duration: 0.2 }}
              loading="eager"
            />
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-1 md:gap-6">
            <div className="flex items-center gap-1 md:gap-4">

              {/* ─── Search ─── */}
              <div ref={searchRef} className="relative">
                <div
                  onClick={() => { if (!isSearchOpen) { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); } }}
                  className={`flex items-center h-10 md:h-9 rounded-full overflow-visible border transition-all duration-300 ease-in-out px-2.5 md:px-3 ${isSearchOpen
                    ? 'w-[220px] xs:w-[270px] sm:w-[360px] md:w-[380px] lg:w-[450px] bg-bg-silk-glow border-logo-rose/30 cursor-default'
                    : 'w-10 md:w-9 bg-transparent border-transparent hover:bg-logo-rose/10 cursor-pointer justify-center px-0!'
                  }`}
                >
                  <div className="flex items-center justify-end w-full h-full gap-1.5 md:gap-1">
                    <FiSearch className={`w-6 h-6 md:w-5 md:h-5 shrink-0 transition-colors duration-200 ${isSearchOpen ? 'text-logo-black/50 w-4 h-4 md:w-5 md:h-5' : 'text-logo-black'}`} />
                    {isSearchOpen && (
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search exclusive collections..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full h-full font-sans text-xs md:text-sm text-logo-black placeholder:text-logo-black/40"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {isSearchOpen && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                        className="p-1 text-logo-black hover:text-logo-rose rounded-full hover:bg-logo-rose/10 cursor-pointer transition-colors duration-200 shrink-0 flex items-center justify-center"
                        aria-label="Close search"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Dropdown */}
                <AnimatePresence>
                  {isSearchOpen && searchQuery.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-logo-rose/15 overflow-hidden z-[200] max-h-80 overflow-y-auto"
                    >
                      {isSearching ? (
                        <div className="px-4 py-5 text-center text-xs text-logo-black/40 font-sans">Searching...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-5 text-center text-xs text-logo-black/40 font-sans">No products found for "{searchQuery}"</div>
                      ) : (
                        <ul>
                          {searchResults.map((product) => (
                            <li key={product.id} className="border-b border-logo-rose/5 last:border-0">
                              <Link
                                to={`/product/${product.id}`}
                                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-logo-rose/5 transition-colors group cursor-pointer"
                              >
                                {product.image_url ? (
                                  <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded-lg shrink-0 border border-logo-rose/10" />
                                ) : (
                                  <div className="w-10 h-10 bg-bg-silk-glow rounded-lg shrink-0 flex items-center justify-center">
                                    <FiShoppingBag size={16} className="text-logo-rose/40" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-sans text-sm font-medium text-logo-black truncate group-hover:text-logo-rose transition-colors">
                                    <HighlightMatch text={product.name} query={searchQuery} />
                                  </p>
                                  <p className="font-sans text-xs text-logo-black/50 mt-0.5">PKR {product.price.toLocaleString()}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(product); }}
                                  className="shrink-0 p-2 rounded-full bg-action-bordeaux/10 hover:bg-action-bordeaux text-action-bordeaux hover:text-white transition-all duration-200 cursor-pointer"
                                  aria-label="Add to cart"
                                >
                                  <FiShoppingCart size={13} />
                                </button>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>{/* end search wrapper */}

              {/* ─── Cart Button ─── */}
              <motion.button
                onClick={() => openCart()}
                className="w-10 h-10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors duration-200 cursor-pointer relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Cart"
              >
                <FiShoppingBag className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-pop-orchid text-white text-[10px] md:text-xs w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center font-sans font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </motion.button>

              {/* ─── User Profile ─── */}
              {isAuthenticated && (
                <div className="relative" ref={profileDropdownRef}>
                  <motion.button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="w-10 h-10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors duration-200 cursor-pointer relative overflow-hidden"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Profile"
                    title={user?.username || 'Profile'}
                  >
                    {user?.profilePicUrl ? (
                      <img src={user.profilePicUrl} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <FiUser className="w-6 h-6" />
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <>
                        <div className="md:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="fixed right-2 md:right-6 top-16 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-logo-rose/20 overflow-hidden z-[9999]"
                        >
                          <div className="p-4 border-b border-logo-rose/10 bg-bg-silk-glow/30">
                            <div className="flex items-center gap-3">
                              {user?.profilePicUrl ? (
                                <img src={user.profilePicUrl} alt={user.username} className="w-12 h-12 rounded-full object-cover ring-2 ring-logo-rose/20" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-logo-rose to-action-bordeaux flex items-center justify-center ring-2 ring-logo-rose/20">
                                  <FiUser className="text-white" size={24} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-sans text-sm font-semibold text-logo-black truncate">{user?.username}</p>
                                <p className="font-sans text-xs text-logo-black/60 truncate">{user?.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 space-y-1">
                            {user?.role === 'Admin' && (
                              <Link to="/admin/dashboard" onClick={() => setIsProfileDropdownOpen(false)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-logo-rose/5 text-logo-black hover:text-logo-rose transition-all duration-200 cursor-pointer group">
                                <FiSettings size={18} className="group-hover:scale-110 transition-transform" />
                                <span className="font-sans text-sm font-medium">Admin Dashboard</span>
                              </Link>
                            )}
                            <Link to="/profile-settings" onClick={() => setIsProfileDropdownOpen(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-logo-rose/5 text-logo-black hover:text-logo-rose transition-all duration-200 cursor-pointer group">
                              <FiSettings size={18} className="group-hover:scale-110 transition-transform" />
                              <span className="font-sans text-sm font-medium">Profile Settings</span>
                            </Link>
                            <Link to="/wishlist" onClick={() => setIsProfileDropdownOpen(false)}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-logo-rose/5 text-logo-black hover:text-logo-rose transition-all duration-200 cursor-pointer group">
                              <FiHeart size={18} className="group-hover:scale-110 transition-transform" />
                              <span className="font-sans text-sm font-medium">My Wishlist</span>
                            </Link>
                            <div className="border-t border-logo-rose/10 my-1" />
                            <button onClick={() => { handleLogout(); setIsProfileDropdownOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-logo-black hover:text-red-600 transition-all duration-200 cursor-pointer group">
                              <FiLogOut size={18} className="group-hover:scale-110 transition-transform" />
                              <span className="font-sans text-sm font-medium">Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors duration-200 cursor-pointer"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
              </button>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.name} to={link.path}
                  className="font-sans text-logo-black font-medium hover:text-logo-rose transition-colors duration-200 relative group text-xs">
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-logo-rose group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </nav>

            {/* Auth Buttons */}
            {!isAuthenticated && (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/login" className="font-sans text-xs text-logo-black hover:text-logo-rose transition-colors duration-200 font-medium">Sign In</Link>
                <Link to="/signup" className="font-sans text-xs px-4 py-2 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full transition-all duration-300 font-medium">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* ─── Portals ─── */}
    {createPortal(
      <>
        {/* ─── Mobile Menu ─── */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                onClick={() => setIsMobileMenuOpen(false)} />
              <motion.div
                initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden fixed top-0 left-0 right-0 w-full bg-white/95 backdrop-blur-2xl shadow-[0_15px_40px_rgba(99,6,32,0.1)] z-[101] overflow-hidden rounded-b-[2rem] border-b border-logo-rose/10 flex flex-col"
              >
                <div className="flex flex-col p-5 pb-6 space-y-5 overflow-y-auto max-h-[80vh]">
                  <div className="flex items-center justify-between border-b border-logo-rose/10 pb-3">
                    <span className="font-serif text-lg font-bold tracking-wide text-logo-black">Menu</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors cursor-pointer"><FiX size={22} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {navLinks.map((link) => (
                      <Link key={link.name} to={link.path} onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3.5 bg-bg-silk-glow/20 hover:bg-logo-rose/5 border border-logo-rose/10 rounded-xl transition-all duration-300 group cursor-pointer">
                        <span className="font-sans text-xs font-semibold text-logo-black group-hover:text-logo-rose transition-colors">{link.name}</span>
                        <span className="text-logo-rose/50 group-hover:translate-x-1 transition-transform duration-300 text-xs">→</span>
                      </Link>
                    ))}
                  </div>
                  <div className="space-y-4 pt-1">
                    {!isAuthenticated ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center font-sans text-xs font-bold py-2.5 border border-action-bordeaux/20 hover:border-action-bordeaux text-logo-black rounded-lg transition-all duration-300 cursor-pointer">Sign In</Link>
                        <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center font-sans text-xs font-bold py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">Create Account</Link>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-bg-silk-glow/40 p-3 rounded-xl border border-logo-rose/5">
                        <div className="flex items-center gap-3">
                          {user?.profilePicUrl ? (
                            <img src={user.profilePicUrl} alt={user.username} className="w-9 h-9 rounded-full object-cover ring-2 ring-logo-rose/20" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-logo-rose to-action-bordeaux flex items-center justify-center"><FiUser className="text-white" size={16} /></div>
                          )}
                          <div className="min-w-0">
                            <p className="font-sans text-xs font-bold text-logo-black truncate">{user?.username}</p>
                            <p className="font-sans text-[10px] text-logo-black/50 truncate">{user?.email}</p>
                          </div>
                        </div>
                        <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center justify-center p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer" title="Logout"><FiLogOut size={14} /></button>
                      </div>
                    )}
                    <div className="text-center font-serif text-[9px] uppercase tracking-widest text-logo-black/30 border-t border-logo-rose/5 pt-3">Elegance in every thread</div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ─── Cart Sidebar ─── */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
                onClick={() => closeCart()} />
              <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[201] flex flex-col"
              >
                {/* Cart Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-logo-rose/10 bg-bg-silk-glow/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <FiShoppingCart size={20} className="text-action-bordeaux" />
                    <h2 className="font-serif text-lg text-logo-black">Your Cart</h2>
                    {cartCount > 0 && (
                      <span className="bg-action-bordeaux text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center font-sans">{cartCount}</span>
                    )}
                  </div>
                  <button onClick={() => closeCart()} className="p-2 text-logo-black hover:text-logo-rose hover:bg-logo-rose/10 rounded-full transition-colors cursor-pointer"><FiX size={20} /></button>
                </div>

                {/* Cart Search & Filter — only shown when items exist */}
                {cartItems.length > 0 && (
                  <div className="px-4 pt-3 pb-2 border-b border-logo-rose/8 bg-white shrink-0 space-y-2">
                    {/* Search */}
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-logo-black/35" size={14} />
                      <input
                        type="text"
                        placeholder="Search in cart..."
                        value={cartSearch}
                        onChange={(e) => setCartSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-bg-silk-glow/50 border border-logo-rose/15 rounded-xl focus:outline-none focus:border-logo-rose font-sans text-logo-black placeholder:text-logo-black/35"
                      />
                      {cartSearch && (
                        <button onClick={() => setCartSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-logo-black/30 hover:text-logo-rose cursor-pointer">
                          <FiX size={12} />
                        </button>
                      )}
                    </div>
                    {/* Price Filter Pills */}
                    <div className="flex items-center gap-1.5">
                      {(['all', 'low', 'high'] as const).map((f) => (
                        <button key={f} onClick={() => setCartFilter(f)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer border ${cartFilter === f ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black/50 border-logo-rose/15 hover:border-logo-rose/40'}`}>
                          {f === 'all' ? 'All' : f === 'low' ? '< PKR 2K' : '≥ PKR 2K'}
                        </button>
                      ))}
                      <span className="ml-auto text-[10px] text-logo-black/30 font-sans">{filteredCartItems.length} item{filteredCartItems.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}

                {/* Cart Items — scrollable only when content exceeds viewport */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16">
                      <FiShoppingBag size={48} className="text-logo-rose/20" />
                      <p className="font-sans text-sm text-logo-black/50 font-medium">Your cart is empty</p>
                      <p className="font-sans text-xs text-logo-black/30">Search for products and add them here</p>
                    </div>
                  ) : filteredCartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                      <FiSearch size={32} className="text-logo-rose/20" />
                      <p className="font-sans text-sm text-logo-black/40">No items match your search</p>
                    </div>
                  ) : (
                    filteredCartItems.map((item, index) => (
                      <div key={`${item.id}-${item.size || ''}-${item.color || ''}-${index}`} className="flex items-center gap-3 p-3 bg-bg-silk-glow/30 rounded-2xl border border-logo-rose/[0.08]">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl shrink-0 border border-logo-rose/10" />
                        ) : (
                          <div className="w-16 h-16 bg-bg-silk-glow rounded-xl shrink-0 flex items-center justify-center"><FiShoppingBag size={20} className="text-logo-rose/30" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm font-semibold text-logo-black truncate">{item.name}</p>
                          <p className="font-sans text-xs text-action-bordeaux font-bold mt-0.5">PKR {(item.price * item.quantity).toLocaleString()}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => changeQty(item.id, -1, { size: item.size, color: item.color })} className="w-6 h-6 rounded-full border border-logo-rose/20 flex items-center justify-center hover:bg-logo-rose/10 transition-colors cursor-pointer"><FiMinus size={10} /></button>
                            <span className="font-sans text-sm font-bold text-logo-black w-4 text-center">{item.quantity}</span>
                            <button onClick={() => changeQty(item.id, 1, { size: item.size, color: item.color })} className="w-6 h-6 rounded-full border border-logo-rose/20 flex items-center justify-center hover:bg-logo-rose/10 transition-colors cursor-pointer"><FiPlus size={10} /></button>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id, { size: item.size, color: item.color })} className="p-2 text-logo-rose/50 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer shrink-0"><FiTrash2 size={15} /></button>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Footer */}
                {cartItems.length > 0 && (
                  <div className="px-5 py-4 border-t border-logo-rose/10 bg-white space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-sm font-medium text-logo-black/60">Total ({cartCount} items)</span>
                      <span className="font-serif text-lg font-bold text-logo-black">PKR {cartTotal.toLocaleString()}</span>
                    </div>
                    <Link to="/checkout" onClick={() => closeCart()}
                      className="w-full py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full font-sans font-bold text-sm uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer text-center block">
                      Proceed to Checkout
                    </Link>                    <button onClick={() => { clearCart(); setCartSearch(''); setCartFilter('all'); }} className="w-full py-2 text-xs text-logo-black/40 hover:text-red-500 transition-colors font-sans cursor-pointer">Clear Cart</button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>,
      document.body
    )}
    </>
  );
};

export default Header;
