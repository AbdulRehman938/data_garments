import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiShoppingBag, FiCheckCircle, FiHeart, FiShield, FiTruck, FiRefreshCw, FiImage } from 'react-icons/fi';
import { supabase } from '../utils/supabase';

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
}

interface Category {
  id: string;
  name: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [isFavorite, setIsFavorite] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Set initial active image
      if (productData.image_url) {
        setActiveImage(productData.image_url);
      }

      // 2. Fetch product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('order_index', { ascending: true });

      if (imagesError) throw imagesError;
      setImages(imagesData || []);

      // If there are secondary images but no cover image_url, set the first image as active
      if (imagesData && imagesData.length > 0 && !productData.image_url) {
        setActiveImage(imagesData[0].image_url);
      }

      // 3. Fetch category
      if (productData.category_id) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id, name')
          .eq('id', productData.category_id)
          .single();
        if (categoryData) {
          setCategory(categoryData);
        }
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      // Redirect to shop if product not found
      navigate('/shop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    setCartSuccess(true);
    setTimeout(() => {
      setCartSuccess(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-silk-glow flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-logo-rose/30 border-t-action-bordeaux animate-spin" />
          <p className="text-sm font-medium text-logo-black/60 font-sans">Revealing product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // Combine cover image with secondary images for the selection carousel
  const allImages = [
    ...(product.image_url ? [{ id: 'cover', image_url: product.image_url }] : []),
    ...images.filter((img) => img.image_url !== product.image_url)
  ];

  return (
    <div className="bg-bg-silk-glow min-h-screen font-sans pb-24">
      {/* Navigation Header */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 pt-8 pb-4">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-logo-rose hover:text-action-bordeaux transition-colors duration-200 font-semibold text-sm"
        >
          <FiArrowLeft size={16} />
          Back to Shop
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white p-6 md:p-10 rounded-[2.5rem] border border-logo-rose/10 shadow-[0_10px_40px_rgba(210,150,158,0.06)]">
          
          {/* Left Column: Image Gallery (Grid Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Image Box */}
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-bg-silk-glow/20 border border-logo-rose/10">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-logo-black/30">
                  <FiImage size={64} className="mb-2" />
                  <span className="text-sm uppercase tracking-wider">No image available</span>
                </div>
              )}

              {/* Badges */}
              {product.stock === 0 ? (
                <div className="absolute top-6 left-6 bg-logo-black text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                  Sold Out
                </div>
              ) : product.stock <= 5 ? (
                <div className="absolute top-6 left-6 bg-pop-orchid text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md animate-pulse">
                  Only {product.stock} Left
                </div>
              ) : null}
            </div>

            {/* Thumbnail Selectors */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {allImages.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setActiveImage(img.image_url)}
                    className={`w-20 md:w-24 aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      activeImage === img.image_url
                        ? 'border-action-bordeaux shadow-md scale-102'
                        : 'border-logo-rose/10 hover:border-logo-rose/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Specs (Grid Col 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-8">
            <div className="space-y-6">
              {/* Category & Title */}
              <div>
                {category && (
                  <span className="text-xs font-bold uppercase tracking-widest text-logo-rose">
                    {category.name}
                  </span>
                )}
                <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-logo-black font-semibold tracking-wide leading-tight mt-1">
                  {product.name}
                </h1>
                <div className="text-2xl font-bold text-action-bordeaux mt-3">
                  ${product.price.toFixed(2)}
                </div>
              </div>

              <hr className="border-logo-rose/10" />

              {/* Sizes Selection */}
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-logo-black/60">
                  <span>Select Size</span>
                  <span className="text-logo-rose">Size Guide</span>
                </div>
                <div className="flex gap-2">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer border ${
                        selectedSize === size
                          ? 'bg-action-bordeaux text-white border-action-bordeaux shadow-sm'
                          : 'bg-white text-logo-black border-logo-rose/20 hover:border-logo-rose/50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-logo-black/60">Description</h3>
                <p className="text-logo-black/85 text-sm md:text-base leading-relaxed">
                  {product.description || 'A timeless addition to your collection. Exquisitely designed and ethically manufactured with top-tier finishing.'}
                </p>
              </div>

              {/* Value Propositions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-logo-black/70">
                <div className="flex items-center gap-2 bg-bg-silk-glow/50 p-3 rounded-xl border border-logo-rose/5">
                  <FiTruck className="text-logo-rose shrink-0" size={16} />
                  <span>Free Global Shipping</span>
                </div>
                <div className="flex items-center gap-2 bg-bg-silk-glow/50 p-3 rounded-xl border border-logo-rose/5">
                  <FiRefreshCw className="text-logo-rose shrink-0" size={16} />
                  <span>30-Day Returns</span>
                </div>
                <div className="flex items-center gap-2 bg-bg-silk-glow/50 p-3 rounded-xl border border-logo-rose/5">
                  <FiShield className="text-logo-rose shrink-0" size={16} />
                  <span>100% Organic Silk</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-3 pt-6 border-t border-logo-rose/10">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={`flex-1 py-4 rounded-full font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
                  cartSuccess
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : product.stock === 0
                    ? 'bg-logo-black/10 text-logo-black/30 cursor-not-allowed shadow-none'
                    : 'bg-action-bordeaux hover:bg-[#460416] text-white hover:scale-102 active:scale-98 hover:shadow-lg cursor-pointer'
                }`}
              >
                <AnimatePresence mode="wait">
                  {cartSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <FiCheckCircle size={18} />
                      Added to Bag
                    </motion.div>
                  ) : (
                    <motion.div
                      key="add"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <FiShoppingBag size={18} />
                      Add to Bag
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                  isFavorite
                    ? 'border-rose-200 bg-rose-50 text-rose-500 shadow-inner'
                    : 'border-logo-rose/20 text-logo-black hover:border-logo-rose hover:bg-logo-rose/5'
                }`}
              >
                <FiHeart size={20} fill={isFavorite ? 'currentColor' : 'none'} className="transition-transform active:scale-90" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
