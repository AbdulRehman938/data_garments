import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiArrowLeft, FiImage, FiChevronLeft, FiChevronRight,
  FiFilter, FiX, FiShoppingBag, FiCheckCircle, FiLock,
} from 'react-icons/fi';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  order_index: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  stock: number;
  created_at: string;
  images?: ProductImage[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

const ITEMS_PER_PAGE = 10;

const PRICE_RANGES = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under PKR 2,000', min: 0, max: 2000 },
  { label: 'PKR 2,000 – 5,000', min: 2000, max: 5000 },
  { label: 'PKR 5,000 – 10,000', min: 5000, max: 10000 },
  { label: 'PKR 10,000+', min: 10000, max: Infinity },
];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Name: A → Z', value: 'name_asc' },
];

const COLOR_OPTIONS = ['All', 'Black', 'White', 'Red', 'Pink', 'Gold', 'Blue'];
const SIZE_OPTIONS  = ['All', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategoryId = searchParams.get('category');
  const { isAuthenticated } = useAuth();
  const { addToCart, openCart } = useCart();

  const [products, setProducts]       = useState<Product[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading]     = useState(true);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [cartId, setCartId]           = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange]   = useState(0);          // index into PRICE_RANGES
  const [sortBy, setSortBy]           = useState('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedSize, setSelectedSize] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  /* ─── Fetch categories (sidebar) ─── */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .not('name', 'ilike', '__SYSTEM_%')
        .order('created_at', { ascending: false });
      setCategories(data || []);
    })();
  }, []);

  /* ─── Fetch products whenever filters/page change ─── */
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to   = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from('products').select('*', { count: 'exact' });

      if (activeCategoryId) query = query.eq('category_id', activeCategoryId);
      if (inStockOnly)      query = query.gt('stock', 0);
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Price filter
      const pr = PRICE_RANGES[priceRange];
      if (pr.min > 0)          query = query.gte('price', pr.min);
      if (pr.max !== Infinity)  query = query.lte('price', pr.max);

      // Sort
      switch (sortBy) {
        case 'price_asc':  query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'name_asc':   query = query.order('name', { ascending: true }); break;
        default:           query = query.order('created_at', { ascending: false }); break;
      }

      query = query.range(from, to);

      const { data: productsData, error, count } = await query;
      if (error) throw error;

      // Fetch images for each product
      const withImages = await Promise.all(
        (productsData || []).map(async (prod) => {
          const { data: imgs } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', prod.id)
            .order('order_index', { ascending: true });
          return { ...prod, images: imgs || [] };
        })
      );

      setProducts(withImages);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategoryId, currentPage, inStockOnly, searchQuery, priceRange, sortBy]);

  // Client-side size/color filtering on top of server results
  const filteredProducts = products.filter((product) => {
    if (selectedSize === 'All' && selectedColor === 'All') return true;
    try {
      const details = (product as any).details
        ? JSON.parse((product as any).details)
        : {};
      if (selectedSize !== 'All') {
        const sizes: string[] = details.sizes || [];
        if (!sizes.some((s) => s.toLowerCase() === selectedSize.toLowerCase())) return false;
      }
      if (selectedColor !== 'All') {
        const colors: string[] = details.colors || [];
        if (!colors.some((c) => c.toLowerCase() === selectedColor.toLowerCase())) return false;
      }
    } catch { return false; }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryId, inStockOnly, searchQuery, priceRange, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategory = (id: string | null) => {
    if (id) setSearchParams({ category: id });
    else setSearchParams({});
  };

  const handleAddCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) { setShowAuthModal(true); return; }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity: 1,
    });
    openCart();
    setCartId(product.id);
    setTimeout(() => setCartId(null), 2000);
  };

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  const activeFilterCount = [
    activeCategoryId,
    priceRange > 0 ? 'price' : null,
    inStockOnly ? 'stock' : null,
    selectedSize !== 'All' ? 'size' : null,
    selectedColor !== 'All' ? 'color' : null,
  ].filter(Boolean).length;

  return (
    <div className="bg-bg-silk-glow min-h-screen font-sans pb-24">

      {/* ── Slim Page Header ── */}
      <div className="bg-white border-b border-logo-rose/10 px-6 md:px-12 lg:px-16 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-1.5 text-logo-rose hover:text-action-bordeaux transition-colors text-xs font-semibold">
              <FiArrowLeft size={14} /> Home
            </Link>
            <span className="text-logo-black/20">/</span>
            <h1 className="font-serif text-xl md:text-2xl text-logo-black">
              {activeCategory ? activeCategory.name : 'All Collections'}
            </h1>
          </div>
          {/* Active category chip */}
          {activeCategory && (
            <button
              onClick={() => handleCategory(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-action-bordeaux/10 text-action-bordeaux rounded-full text-xs font-bold border border-action-bordeaux/20 hover:bg-action-bordeaux hover:text-white transition-all cursor-pointer"
            >
              {activeCategory.name}
              <FiX size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-12 lg:px-16 mt-8 flex flex-col lg:flex-row gap-8">

        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 gap-6">

          {/* Collections */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Collections</h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleCategory(null)}
                className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  !activeCategoryId ? 'bg-action-bordeaux text-white shadow-sm' : 'hover:bg-white text-logo-black border border-logo-rose/10 hover:border-logo-rose/25'
                }`}
              >
                All Collections
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategory(cat.id)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    activeCategoryId === cat.id ? 'bg-action-bordeaux text-white shadow-sm' : 'hover:bg-white text-logo-black border border-logo-rose/10 hover:border-logo-rose/25'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Price Range</h3>
            <div className="flex flex-col gap-1.5">
              {PRICE_RANGES.map((pr, idx) => (
                <button
                  key={pr.label}
                  onClick={() => setPriceRange(idx)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    priceRange === idx ? 'bg-action-bordeaux text-white shadow-sm' : 'hover:bg-white text-logo-black border border-logo-rose/10 hover:border-logo-rose/25'
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Availability</h3>
            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium w-full text-left transition-all cursor-pointer border ${
                inStockOnly ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black border-logo-rose/10 hover:border-logo-rose/25 hover:bg-white'
              }`}
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${inStockOnly ? 'bg-white/30 border-white' : 'border-logo-rose/30'}`}>
                {inStockOnly && <FiCheckCircle size={10} className="text-white" />}
              </span>
              In Stock Only
            </button>
          </div>

          {/* Size */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Size</h3>
            <div className="flex flex-wrap gap-1.5">
              {SIZE_OPTIONS.map((s) => (
                <button key={s} onClick={() => setSelectedSize(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedSize === s ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black border-logo-rose/15 hover:border-logo-rose/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Color</h3>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setSelectedColor(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedColor === c ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black border-logo-rose/15 hover:border-logo-rose/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main Area ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-logo-rose/10 p-3 md:p-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-logo-black/40" size={16} />
              <input
                type="text"
                placeholder="Search collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-silk-glow/50 border border-logo-rose/10 rounded-xl focus:outline-none focus:border-logo-rose text-sm placeholder:text-logo-black/35"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs border border-logo-rose/15 rounded-xl bg-white focus:outline-none focus:border-logo-rose cursor-pointer font-medium text-logo-black"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-xs border border-logo-rose/15 rounded-xl bg-white font-medium text-logo-black cursor-pointer relative"
              >
                <FiFilter size={13} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-action-bordeaux text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="hidden sm:block text-xs text-logo-black/50 font-medium whitespace-nowrap">
                {totalCount} product{totalCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-logo-rose/10 overflow-hidden animate-pulse">
                  <div className="aspect-[4/5] bg-logo-rose/5" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-logo-rose/5 rounded" />
                    <div className="h-3 bg-logo-rose/5 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="min-h-[360px] bg-white rounded-3xl border border-logo-rose/10 flex flex-col items-center justify-center text-center p-8">
              <FiImage size={44} className="text-logo-rose/30 mb-4" />
              <h3 className="font-serif text-xl text-logo-black mb-2">No Products Found</h3>
              <p className="text-logo-black/50 text-sm max-w-sm">Try adjusting your filters or browse all collections.</p>
              <button
                onClick={() => { handleCategory(null); setPriceRange(0); setInStockOnly(false); setSelectedSize('All'); setSelectedColor('All'); setSearchQuery(''); }}
                className="mt-5 px-6 py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-md transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const secondImg = product.images && product.images.length > 1 ? product.images[1].image_url : null;
                const coverImg = product.image_url || (product.images && product.images[0]?.image_url) || null;
                const displayImg = hoveredId === product.id && secondImg ? secondImg : coverImg;

                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="block group"
                    onMouseEnter={() => setHoveredId(product.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl overflow-hidden border border-logo-rose/10 shadow-[0_2px_12px_rgba(210,150,158,0.04)] hover:shadow-[0_10px_28px_rgba(210,150,158,0.09)] hover:border-logo-rose/20 transition-all duration-300"
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/5] overflow-hidden bg-bg-silk-glow/30">
                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-logo-black/25">
                            <FiImage size={32} />
                          </div>
                        )}

                        {/* Stock badge */}
                        {product.stock === 0 ? (
                          <div className="absolute top-2 left-2 bg-logo-black/70 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            Sold Out
                          </div>
                        ) : product.stock <= 5 ? (
                          <div className="absolute top-2 left-2 bg-pop-orchid text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            {product.stock} left
                          </div>
                        ) : null}
                      </div>

                      {/* Info */}
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
                          className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                            cartId === product.id
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : product.stock === 0
                              ? 'bg-logo-black/5 text-logo-black/25 border-logo-rose/10 cursor-not-allowed'
                              : 'text-action-bordeaux border-logo-rose/20 hover:bg-action-bordeaux hover:text-white hover:border-action-bordeaux hover:scale-105 active:scale-95'
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
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── Custom Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-xl border border-logo-rose/15 flex items-center justify-center text-logo-black hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <FiChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-1 text-logo-black/30 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-action-bordeaux text-white shadow-sm'
                          : 'border border-logo-rose/15 text-logo-black hover:bg-white'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-xl border border-logo-rose/15 flex items-center justify-center text-logo-black hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          )}

          {totalCount > 0 && (
            <p className="text-center text-xs text-logo-black/40 font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} products
            </p>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Drawer ── */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 overflow-y-auto p-6 space-y-6 lg:hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif text-xl text-logo-black">Filters</h2>
                <button onClick={() => setFiltersOpen(false)} className="p-1.5 hover:bg-logo-rose/10 rounded-full cursor-pointer">
                  <FiX size={18} className="text-logo-black" />
                </button>
              </div>

              {/* Collections */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Collections</h3>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => { handleCategory(null); setFiltersOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${!activeCategoryId ? 'bg-action-bordeaux text-white' : 'border border-logo-rose/10 text-logo-black'}`}>
                    All Collections
                  </button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => { handleCategory(cat.id); setFiltersOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${activeCategoryId === cat.id ? 'bg-action-bordeaux text-white' : 'border border-logo-rose/10 text-logo-black'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Price Range</h3>
                <div className="flex flex-col gap-1.5">
                  {PRICE_RANGES.map((pr, idx) => (
                    <button key={pr.label} onClick={() => setPriceRange(idx)}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${priceRange === idx ? 'bg-action-bordeaux text-white' : 'border border-logo-rose/10 text-logo-black'}`}>
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Availability</h3>
                <button onClick={() => setInStockOnly(!inStockOnly)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium w-full border transition-all cursor-pointer ${inStockOnly ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black border-logo-rose/10'}`}>
                  In Stock Only
                </button>
              </div>

              {/* Size */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Size</h3>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_OPTIONS.map((s) => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all ${selectedSize === s ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black border-logo-rose/15'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-logo-black/50 mb-3">Color</h3>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setSelectedColor(c)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer transition-all ${selectedColor === c ? 'bg-action-bordeaux text-white border-action-bordeaux' : 'text-logo-black border-logo-rose/15'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setFiltersOpen(false)}
                className="w-full py-3 bg-action-bordeaux text-white rounded-full font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-[#460416] transition-all mt-4">
                Apply Filters
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Auth Gate Modal ── */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]"
              onClick={() => setShowAuthModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto bg-white rounded-3xl shadow-2xl border border-logo-rose/15 p-8 w-full max-w-sm text-center">
                <div className="w-14 h-14 rounded-2xl bg-logo-rose/10 flex items-center justify-center mx-auto mb-4">
                  <FiLock size={26} className="text-action-bordeaux" />
                </div>
                <h3 className="font-serif text-xl text-logo-black mb-2">Sign In Required</h3>
                <p className="font-sans text-sm text-logo-black/60 leading-relaxed mb-6">
                  Please sign in to add items to your bag.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <Link
                    to="/login"
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-semibold transition-all cursor-pointer font-sans flex items-center justify-center"
                  >
                    Sign In
                  </Link>
                </div>
                <Link
                  to="/signup"
                  onClick={() => setShowAuthModal(false)}
                  className="block mt-3 text-xs text-logo-rose hover:text-action-bordeaux transition-colors font-sans font-medium"
                >
                  Don't have an account? Sign Up
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shop;
