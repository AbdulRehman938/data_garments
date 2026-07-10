import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeart, FiArrowLeft, FiShoppingBag, FiX, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

const Wishlist = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart, openCart } = useCart();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated]);

  const handleMoveToCart = (item: typeof wishlistItems[0]) => {
    addToCart({
      id: item.product_id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
    });
    openCart();
  };

  return (
    <div className="min-h-screen bg-bg-silk-glow px-4 py-6 md:py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to="/profile-settings"
            className="inline-flex items-center gap-2 text-logo-black/60 hover:text-logo-rose transition-colors font-sans text-sm mb-4">
            <FiArrowLeft size={16} /> Back to Profile
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-logo-rose/10 flex items-center justify-center">
              <FiHeart size={18} className="text-action-bordeaux" />
            </div>
            <div>
              <h1 className="font-serif text-3xl text-logo-black">My Wishlist</h1>
              <p className="font-sans text-sm text-logo-black/50">
                {wishlistItems.length} saved {wishlistItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-logo-rose/30 border-t-action-bordeaux animate-spin" />
          </div>
        ) : wishlistItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-logo-rose/10 flex items-center justify-center mx-auto mb-5">
              <FiHeart size={32} className="text-logo-rose/40" />
            </div>
            <h2 className="font-serif text-xl text-logo-black mb-2">Nothing saved yet</h2>
            <p className="font-sans text-sm text-logo-black/50 mb-6">
              Browse the shop and tap the heart to save items here.
            </p>
            <Link to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full font-sans font-bold text-sm transition-all shadow-md">
              <FiShoppingBag size={16} /> Explore Shop
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {wishlistItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl border border-logo-rose/10 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Product image — clickable */}
                  <Link to={`/product/${item.product_id}`} className="block relative aspect-[4/3] overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-bg-silk-glow flex items-center justify-center">
                        <FiShoppingBag size={32} className="text-logo-rose/30" />
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.preventDefault(); removeFromWishlist(item.product_id); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-logo-rose hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm cursor-pointer"
                      title="Remove from wishlist"
                    >
                      <FiX size={14} />
                    </button>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    <Link to={`/product/${item.product_id}`}
                      className="block font-sans text-sm font-semibold text-logo-black hover:text-logo-rose transition-colors truncate mb-1">
                      {item.name}
                    </Link>
                    <p className="font-sans text-sm font-bold text-action-bordeaux mb-3">
                      PKR {item.price.toLocaleString()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveToCart(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl font-sans font-bold text-xs uppercase tracking-wide transition-all cursor-pointer"
                      >
                        <FiShoppingBag size={12} /> Add to Cart
                      </button>
                      <Link
                        to={`/product/${item.product_id}`}
                        className="w-9 h-9 flex items-center justify-center border border-logo-rose/20 rounded-xl hover:bg-logo-rose/5 text-logo-rose transition-colors"
                        title="View product"
                      >
                        <FiArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
