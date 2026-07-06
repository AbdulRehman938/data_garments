import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const SYSTEM_SETTINGS_KEY = '__SYSTEM_SETTINGS__';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

const CategoryCards = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // 1. Fetch system settings to get featured category IDs
      const { data: settingsData } = await supabase
        .from('categories')
        .select('description')
        .eq('name', SYSTEM_SETTINGS_KEY)
        .maybeSingle();

      let featuredIds: string[] = [];
      if (settingsData?.description) {
        try {
          const parsed = JSON.parse(settingsData.description);
          featuredIds = Array.isArray(parsed.featured) ? parsed.featured : [];
        } catch {
          featuredIds = [];
        }
      }

      // 2. Fetch all real categories (excluding system config)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .not('name', 'ilike', '__SYSTEM_%')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allCats: Category[] = data || [];

      // 3. If admin configured featured IDs, filter & order by that; otherwise show first 5
      let displayCats: Category[];
      if (featuredIds.length > 0) {
        displayCats = featuredIds
          .map((id) => allCats.find((c) => c.id === id))
          .filter((c): c is Category => !!c)
          .slice(0, 5);
      } else {
        displayCats = allCats.slice(0, 5);
      }

      setCategories(displayCats);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-logo-rose/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1600px] flex flex-col justify-between items-center mx-auto px-6 md:px-12 lg:px-16 py-16 pt-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 w-full"
      >
        <h2 className="font-serif !text-4xl sm:!text-5xl md:!text-6xl lg:!text-5xl! text-logo-black text-center mb-4">
          Explore Collections
        </h2>
        <p className="font-sans pt-3 text-logo-black/70 text-xl text-center max-w-2xl mx-auto">
          Discover our curated categories, each designed to bring elegance and style to your wardrobe
        </p>
      </motion.div>

      {/* Responsive grid: 2 cols on mobile, 3 on md, 5 on lg for 5 categories */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {categories.map((category, index) => {
          const isExpanded = expandedId === category.id;
          return (
            <motion.div
              key={category.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <motion.div
                layout
                onClick={() => setExpandedId(isExpanded ? null : category.id)}
                className={`relative bg-white rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 select-none group ${
                  isExpanded
                    ? 'shadow-[0_16px_40px_rgba(92,6,30,0.12)] border-logo-rose/30'
                    : 'shadow-[0_4px_20px_rgba(210,150,158,0.05)] border-logo-rose/10 hover:border-logo-rose/25'
                }`}
                whileHover={isExpanded ? {} : { y: -4, scale: 1.015 }}
                transition={{ duration: 0.25 }}
              >
                {/* Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-bg-silk-glow/20">
                  {category.image_url ? (
                    <motion.img
                      layout
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-logo-rose to-action-bordeaux flex items-center justify-center">
                      <span className="text-white font-serif text-3xl font-bold uppercase">
                        {category.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full border border-logo-rose/20">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-action-bordeaux font-sans">
                      Collection
                    </span>
                  </div>

                  {/* Title */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex justify-start md:justify-center">
                    <motion.h3
                      layout
                      className="font-serif !text-base sm:!text-lg md:!text-xl text-white font-bold tracking-wide text-left md:text-center leading-tight"
                    >
                      {category.name}
                    </motion.h3>
                  </div>
                </div>

                {/* Content Panel */}
                <motion.div layout className="px-3 py-3 bg-white flex flex-col gap-2">
                  <AnimatePresence mode="wait">
                    {isExpanded ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col gap-3 overflow-hidden"
                      >
                        <div className="h-px bg-gradient-to-r from-logo-rose/20 to-transparent" />
                        <p className="font-sans text-logo-black/70 leading-relaxed !text-xs tracking-wide text-left md:text-center">
                          {category.description || 'Explore this curated collection.'}
                        </p>
                        <div className="flex flex-col items-stretch gap-2 mt-1">
                          <Link
                            to={`/shop?category=${category.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-action-bordeaux hover:bg-[#460416] text-white rounded-full font-sans font-bold text-[10px] uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 group/btn shadow-sm hover:shadow-md whitespace-nowrap"
                          >
                            Show Products
                            <FiArrowRight size={11} className="group-hover/btn:translate-x-0.5 transition-transform" />
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                            className="text-logo-rose hover:text-action-bordeaux font-bold text-[10px] uppercase tracking-widest transition-colors py-1 cursor-pointer text-center"
                          >
                            Close
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-between md:justify-center md:gap-2 group/explore w-full"
                      >
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-logo-rose group-hover/explore:text-action-bordeaux transition-colors">
                          Explore
                        </span>
                        <div className="w-6 h-6 rounded-full bg-bg-silk-glow border border-logo-rose/15 flex items-center justify-center group-hover/explore:bg-action-bordeaux transition-all duration-300">
                          <FiArrowRight size={11} className="text-logo-rose group-hover/explore:text-white transition-transform group-hover/explore:translate-x-0.5" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryCards;
