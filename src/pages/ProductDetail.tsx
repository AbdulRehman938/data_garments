import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiShoppingBag, FiCheckCircle, FiHeart,
  FiTruck, FiRefreshCw, FiImage, FiPlus, FiMinus, FiLock,
  FiShield, FiPackage, FiStar, FiGift, FiZap, FiAward,
  FiClock, FiGlobe,
} from 'react-icons/fi';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';

/* ─── Icon map for dynamic service badges ─── */
import type { IconType } from 'react-icons';
const SERVICE_ICON_MAP: Record<string, IconType> = {
  FiTruck, FiRefreshCw, FiShield, FiPackage, FiStar, FiHeart,
  FiGift, FiZap, FiAward, FiCheckCircle, FiClock, FiGlobe,
};

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  order_index: number;
}

interface ProductDetails {
  colors?: string[];
  sizes?: string[];
  fabric?: string;
  wear_type?: string;
  trouser_type?: string;
  styling?: string;
  product_category?: string;
  dupatta_fabric?: string;
  trouser_fabric?: string;
  service_ids?: string[];
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
  details?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface ServiceBadge {
  id: string;
  label: string;
  icon_name: string;
}

/* ─── Description with clamp + expand toggle ─── */
const DescriptionBlock = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const CHAR_LIMIT = 200;
  const isLong = text.length > CHAR_LIMIT;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-logo-black/60">Description</h3>
      <p className="text-logo-black/80 text-sm leading-relaxed break-words overflow-hidden">
        {isLong && !expanded ? `${text.slice(0, CHAR_LIMIT).trimEnd()}…` : text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs font-bold text-logo-rose hover:text-action-bordeaux transition-colors cursor-pointer"
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart, openCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const [product, setProduct]     = useState<Product | null>(null);
  const [images, setImages]       = useState<ProductImage[]>([]);
  const [category, setCategory]   = useState<Category | null>(null);
  const [details, setDetails]     = useState<ProductDetails>({});
  const [services, setServices]   = useState<ServiceBadge[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // User selections
  const [selectedSize, setSelectedSize]   = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity]           = useState(1);
  const [cartSuccess, setCartSuccess]     = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const isFavorite = product ? isInWishlist(product.id) : false;

  // Auth-gate modal
  const [showAuthModal, setShowAuthModal]   = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'cart' | 'wishlist' | 'buy'>('cart');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (id) fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      const { data: productData, error: productError } = await supabase
        .from('products').select('*').eq('id', id).single();
      if (productError) throw productError;

      setProduct(productData);
      if (productData.image_url) setActiveImage(productData.image_url);

      // Parse stored details
      let parsedDetails: ProductDetails = {};
      if (productData.details) {
        try {
          parsedDetails = typeof productData.details === 'string'
            ? JSON.parse(productData.details)
            : productData.details;
          setDetails(parsedDetails);
          if (parsedDetails.sizes?.length) setSelectedSize(parsedDetails.sizes[0]);
          if (parsedDetails.colors?.length) setSelectedColor(parsedDetails.colors[0]);
        } catch { /* ignore malformed */ }
      }

      const { data: imagesData } = await supabase
        .from('product_images').select('*').eq('product_id', id)
        .order('order_index', { ascending: true });
      setImages(imagesData || []);
      if (imagesData?.length && !productData.image_url) setActiveImage(imagesData[0].image_url);

      if (productData.category_id) {
        const { data: catData } = await supabase
          .from('categories').select('id, name').eq('id', productData.category_id).single();
        if (catData) setCategory(catData);
      }

      // Fetch only the service badges assigned to this product
      const serviceIds: string[] = parsedDetails.service_ids || [];
      if (serviceIds.length > 0) {
        const { data: svcs } = await supabase
          .from('services')
          .select('id, label, icon_name')
          .in('id', serviceIds)
          .eq('is_active', true);
        // Preserve admin-assigned order
        const ordered = serviceIds
          .map((sid) => (svcs || []).find((s) => s.id === sid))
          .filter(Boolean) as ServiceBadge[];
        setServices(ordered);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error(err);
      navigate('/shop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) { setAuthModalAction('cart'); setShowAuthModal(true); return; }
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });
    openCart();
    setCartSuccess(true);
    setTimeout(() => setCartSuccess(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) { setAuthModalAction('buy'); setShowAuthModal(true); return; }
    if (!product) return;
    // Add to cart then go to checkout
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });
    navigate('/checkout');
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { setAuthModalAction('wishlist'); setShowAuthModal(true); return; }
    if (!product || wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (isFavorite) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist({
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
        });
      }
    } finally {
      setWishlistLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-silk-glow flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-logo-rose/30 border-t-action-bordeaux animate-spin" />
          <p className="text-sm font-medium text-logo-black/60 font-sans">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const allImages = [
    ...(product.image_url ? [{ id: 'cover', image_url: product.image_url }] : []),
    ...images.filter((img) => img.image_url !== product.image_url),
  ];

  const availableSizes  = details.sizes?.length  ? details.sizes  : ['XS', 'S', 'M', 'L', 'XL'];
  const availableColors = details.colors?.length ? details.colors : [];

  // Spec table rows — only show if value is set
  const specRows: { label: string; value: string | undefined }[] = [
    { label: 'Fabric',            value: details.fabric },
    { label: 'Wear Type',         value: details.wear_type },
    { label: 'Trouser Type',      value: details.trouser_type },
    { label: 'Styling',           value: details.styling },
    { label: 'Product Category',  value: details.product_category },
    { label: 'Dupatta Fabric',    value: details.dupatta_fabric },
    { label: 'Trouser Fabric',    value: details.trouser_fabric },
  ].filter((r) => r.value);

  return (
    <div className="bg-bg-silk-glow min-h-screen font-sans pb-24">
      {/* Back nav */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 pt-6 pb-2">
        <Link to="/shop"
          className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux transition-colors font-semibold text-sm">
          <FiArrowLeft size={16} /> Back to Shop
        </Link>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-12 lg:px-16 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 bg-white p-5 md:p-10 rounded-[2rem] border border-logo-rose/10 shadow-[0_10px_40px_rgba(210,150,158,0.06)]">

          {/* ── Left: Gallery ── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[2/3] max-h-[70vh] rounded-[1.75rem] overflow-hidden bg-bg-silk-glow/20 border border-logo-rose/10 flex items-center justify-center">
              {activeImage ? (
                <motion.img
                  key={activeImage}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-logo-black/30">
                  <FiImage size={64} className="mb-2" />
                </div>
              )}
              {product.stock === 0 ? (
                <div className="absolute top-5 left-5 bg-logo-black text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">Sold Out</div>
              ) : product.stock <= 5 ? (
                <div className="absolute top-5 left-5 bg-pop-orchid text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md animate-pulse">
                  Only {product.stock} Left
                </div>
              ) : null}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button key={img.id ?? idx} onClick={() => setActiveImage(img.image_url)}
                    className={`w-20 md:w-24 aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImage === img.image_url
                        ? 'border-action-bordeaux shadow-md'
                        : 'border-logo-rose/10 hover:border-logo-rose/30 opacity-70 hover:opacity-100'
                    }`}>
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Info ── */}
          <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">

            {/* Title & Price */}
            <div>
              {category && (
                <Link to={`/shop?category=${category.id}`}
                  className="text-xs font-bold uppercase tracking-widest text-logo-rose hover:text-action-bordeaux transition-colors">
                  {category.name}
                </Link>
              )}
              <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-logo-black font-semibold leading-tight mt-1">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-2xl font-bold text-action-bordeaux font-sans">
                  PKR {product.price.toLocaleString()}
                </span>
                {product.stock > 0 && (
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">In Stock</span>
                )}
              </div>
            </div>

            <hr className="border-logo-rose/10" />

            {/* Color Selection */}
            {availableColors.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-logo-black/60">
                  <span>Color</span>
                  {selectedColor && <span className="text-action-bordeaux normal-case font-semibold">{selectedColor}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        selectedColor === color
                          ? 'bg-action-bordeaux text-white border-action-bordeaux shadow-sm'
                          : 'text-logo-black border-logo-rose/20 hover:border-logo-rose/50'
                      }`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-logo-black/60">
                <span>Size</span>
                <span className="text-logo-rose cursor-pointer hover:text-action-bordeaux transition-colors normal-case font-semibold">Size Guide</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button key={size} onClick={() => setSelectedSize(size)}
                    className={`min-w-[44px] h-11 px-3 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer border ${
                      selectedSize === size
                        ? 'bg-action-bordeaux text-white border-action-bordeaux shadow-sm'
                        : 'bg-white text-logo-black border-logo-rose/20 hover:border-logo-rose/50'
                    }`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-logo-black/60">Quantity</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border border-logo-rose/20 flex items-center justify-center hover:bg-logo-rose/8 hover:border-logo-rose/40 transition-all cursor-pointer">
                  <FiMinus size={14} />
                </button>
                <span className="font-serif text-xl font-bold text-logo-black w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                  disabled={product.stock === 0}
                  className="w-10 h-10 rounded-full border border-logo-rose/20 flex items-center justify-center hover:bg-logo-rose/8 hover:border-logo-rose/40 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <FiPlus size={14} />
                </button>
                <span className="text-xs text-logo-black/40 font-sans ml-1">
                  {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                </span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <DescriptionBlock text={product.description} />
            )}

            {/* Product Spec Table */}
            {specRows.length > 0 && (
              <div className="rounded-2xl border border-logo-rose/10 overflow-hidden">
                <div className="bg-bg-silk-glow/60 px-4 py-2.5 border-b border-logo-rose/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-logo-black/60">Product Details</h3>
                </div>
                <div className="divide-y divide-logo-rose/8">
                  {specRows.map(({ label, value }) => (
                    <div key={label} className="flex items-start px-4 py-2.5 gap-4">
                      <span className="text-xs text-logo-black/50 font-semibold w-36 shrink-0">{label}</span>
                      <span className="text-xs text-logo-black font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping badges — dynamic from admin */}
            {services.length > 0 && (
              <div className="grid grid-cols-3 gap-2 text-[10px] text-logo-black/60">
                {services.map((svc) => {
                  const Icon = SERVICE_ICON_MAP[svc.icon_name] ?? FiCheckCircle;
                  return (
                    <div key={svc.id} className="flex flex-col items-center gap-1.5 bg-bg-silk-glow/50 p-2.5 rounded-xl border border-logo-rose/8 text-center">
                      <Icon className="text-logo-rose shrink-0" size={15} />
                      <span className="font-medium leading-tight">{svc.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-logo-rose/10">
              {/* Add to Bag */}
              <button onClick={handleAddToCart} disabled={product.stock === 0}
                className={`w-full py-3.5 rounded-full font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-md cursor-pointer ${
                  cartSuccess
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : product.stock === 0
                    ? 'bg-logo-black/10 text-logo-black/30 cursor-not-allowed shadow-none'
                    : 'bg-white border-2 border-action-bordeaux text-action-bordeaux hover:bg-action-bordeaux hover:text-white hover:shadow-lg'
                }`}>
                <AnimatePresence mode="wait">
                  {cartSuccess ? (
                    <motion.div key="ok" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-2">
                      <FiCheckCircle size={16} /> Added to Bag
                    </motion.div>
                  ) : (
                    <motion.div key="add" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-2">
                      <FiShoppingBag size={16} /> Add to Bag
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* Buy it Now */}
              <button onClick={handleBuyNow} disabled={product.stock === 0}
                className={`w-full py-3.5 rounded-full font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-md cursor-pointer ${
                  product.stock === 0
                    ? 'bg-logo-black/10 text-logo-black/30 cursor-not-allowed shadow-none'
                    : 'bg-action-bordeaux hover:bg-[#460416] text-white hover:shadow-lg'
                }`}>
                Buy it Now
              </button>

              {/* Wishlist */}
              <button onClick={handleWishlist} disabled={wishlistLoading}
                className={`w-full py-2.5 rounded-full font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer border disabled:opacity-60 ${
                  isFavorite
                    ? 'border-rose-200 bg-rose-50 text-rose-500'
                    : 'border-logo-rose/20 text-logo-black/60 hover:border-logo-rose hover:bg-logo-rose/5'
                }`}>
                <FiHeart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
                {wishlistLoading ? 'Updating...' : isFavorite ? 'Wishlisted' : 'Add to Wishlist'}
              </button>
            </div>
          </div>

        </div>
      </div>

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
              className="fixed inset-0 z-[301] flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl border border-logo-rose/15 p-8 w-full max-w-sm text-center">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-logo-rose/10 flex items-center justify-center mx-auto mb-4">
                  <FiLock size={26} className="text-action-bordeaux" />
                </div>
                <h3 className="font-serif text-xl text-logo-black mb-2">Sign In Required</h3>
                <p className="font-sans text-sm text-logo-black/60 leading-relaxed mb-6">
                  {authModalAction === 'cart'
                    ? 'Please sign in to add items to your bag.'
                    : authModalAction === 'buy'
                    ? 'Please sign in to purchase this product.'
                    : 'Please sign in to save items to your wishlist.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 py-2.5 border border-logo-rose/20 rounded-xl text-sm font-semibold text-logo-black hover:bg-logo-rose/5 transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowAuthModal(false); navigate('/login'); }}
                    className="flex-1 py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-xl text-sm font-semibold transition-all cursor-pointer font-sans"
                  >
                    Sign In
                  </button>
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

export default ProductDetail;
