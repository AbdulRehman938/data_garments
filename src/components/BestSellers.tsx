import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingBag, FiCheckCircle, FiImage } from 'react-icons/fi';
import { supabase } from '../utils/supabase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const SYSTEM_BEST_SELLERS_KEY = '__SYSTEM_BEST_SELLERS__';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  stock: number;
  order_count?: number;
}

const BestSellers = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartId, setCartId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { addToCart, openCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => { fetchBestSellers(); }, []);

  const fetchBestSellers = async () => {
    try {
      // 1. Check admin-pinned best sellers
      const { data: settings } = await supabase
        .from('categories')
        .select('description')
        .eq('name', SYSTEM_BEST_SELLERS_KEY)
        .maybeSingle();

      let pinnedIds: string[] = [];
      let autoSlots = 8; // default all slots auto
      if (settings?.description) {
        try {
          const parsed = JSON.parse(settings.description);
          pinnedIds = Array.isArray(parsed.pinned) ? parsed.pinned : [];
          autoSlots = typeof parsed.auto_slots === 'number' ? parsed.auto_slots : Math.max(0, 8 - pinnedIds.length);
        } catch { /* ignore */ }
      }

      const allIds = new Set(pinnedIds);

      // 2. Fetch pinned products
      let pinned: Product[] = [];
      if (pinnedIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, image_url, stock')
          .in('id', pinnedIds)
          .gt('stock', 0);
        if (data) {
          pinned = pinnedIds
            .map((id) => data.find((p) => p.id === id))
            .filter(Boolean) as Product[];
        }
      }

      // 3. Fill remaining slots from order counts (top ordered products not already pinned)
      let auto: Product[] = [];
      if (autoSlots > 0) {
        // Get top products by order count from orders table
        const { data: orders } = await supabase
          .from('orders')
          .select('items')
          .not('status', 'eq', 'cancelled');

        // Count product occurrences
        const countMap: Record<string, number> = {};
        (orders || []).forEach((order: any) => {
          (order.items || []).forEach((item: any) => {
            if (item.product_id && !allIds.has(item.product_id)) {
              countMap[item.product_id] = (countMap[item.product_id] || 0) + (item.quantity || 1);
            }
          });
        });

        const topIds = Object.entries(countMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, autoSlots)
          .map(([id]) => id);

        if (topIds.length > 0) {
          const { data } = await supabase
            .from('products')
            .select('id, name, price, image_url, stock')
            .in('id', topIds)
            .gt('stock', 0);
          if (data) {
            auto = topIds
              .map((id) => {
                const p = data.find((x) => x.id === id);
                return p ? { ...p, order_count: countMap[id] } : null;
              })
              .filter(Boolean) as Product[];
          }
        }

        // If no orders yet, fallback to newest products
        if (auto.length < autoSlots) {
          const existing = new Set([...pinnedIds, ...auto.map((p) => p.id)]);
          const needed = autoSlots - auto.length;
          const { data } = await supabase
            .from('products')
            .select('id, name, price, image_url, stock')
            .gt('stock', 0)
            .not('id', 'in', `(${[...existing].join(',') || 'null'})`)
            .order('created_at', { ascending: false })
            .limit(needed);
          if (data) auto = [...auto, ...data];
        }
      }

      setProducts([...pinned, ...auto].slice(0, 8));
    } catch (err) {
      console.error('BestSellers fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
    openCart();
    setCartId(product.id);
    setTimeout(() => setCartId(null), 2000);
  };

  if (isLoading) {
    return (
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-logo-rose/5 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="max-w-[1600px] flex flex-col justify-between items-center mx-auto px-6 md:px-12 lg:px-16 py-16 pt-0 text-center">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 w-full flex flex-col items-center"
      >
        <h2 className="font-serif !text-4xl sm:!text-5xl md:!text-6xl lg:!text-5xl! text-logo-black text-center mb-4 w-full">
          Customer Favourites
        </h2>
        <p className="font-sans pt-3 text-logo-black/70 text-xl text-center max-w-2xl w-full mx-auto">
          The pieces our customers love most — curated from real orders.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <Link to={`/product/${product.id}`} className="block group">
              <div className="bg-white rounded-2xl overflow-hidden border border-logo-rose/10 hover:border-logo-rose/25 hover:shadow-[0_10px_28px_rgba(210,150,158,0.09)] transition-all duration-300">
                <div className="relative aspect-[4/5] overflow-hidden bg-bg-silk-glow/30">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-logo-black/20">
                      <FiImage size={32} />
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute top-2 left-2 bg-logo-black/70 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">Sold Out</div>
                  )}
                  {product.stock > 0 && product.stock <= 5 && (
                    <div className="absolute top-2 left-2 bg-pop-orchid text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">{product.stock} left</div>
                  )}
                </div>
                <div className="p-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-serif text-sm font-semibold text-logo-black line-clamp-1 group-hover:text-action-bordeaux transition-colors">
                      {product.name}
                    </h3>
                    <span className="font-sans font-bold text-action-bordeaux text-sm">
                      PKR {product.price.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleAddCart(product, e)}
                    disabled={product.stock === 0}
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      cartId === product.id
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : product.stock === 0
                        ? 'bg-logo-black/5 text-logo-black/25 border-logo-rose/10 cursor-not-allowed'
                        : 'text-action-bordeaux border-logo-rose/20 hover:bg-action-bordeaux hover:text-white hover:border-action-bordeaux'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {cartId === product.id ? (
                        <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <FiCheckCircle size={14} />
                        </motion.div>
                      ) : (
                        <motion.div key="bag" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <FiShoppingBag size={14} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-action-bordeaux text-action-bordeaux hover:bg-action-bordeaux hover:text-white rounded-full font-bold text-sm uppercase tracking-widest transition-all duration-300">
          View All Products
        </Link>
      </div>

      {/* Auth modal */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[300]" onClick={() => setShowAuthModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-logo-rose/15 p-8 w-full max-w-sm text-center">
                <h3 className="font-serif text-xl text-logo-black mb-2">Sign In Required</h3>
                <p className="text-sm text-logo-black/60 mb-6">Please sign in to add items to your bag.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 cursor-pointer">Cancel</button>
                  <Link to="/login" onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2.5 bg-action-bordeaux text-white rounded-xl text-sm font-semibold text-center hover:bg-[#460416] transition-all">Sign In</Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
};

export default BestSellers;
