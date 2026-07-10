import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiCheck, FiAward, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../components/common/Toast';

const SYSTEM_BEST_SELLERS_KEY = '__SYSTEM_BEST_SELLERS__';
const MAX_SLOTS = 8;

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  order_count: number;
}

const AdminBestSellers = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [autoSlots, setAutoSlots] = useState(MAX_SLOTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Load existing settings
      const { data: settings } = await supabase
        .from('categories')
        .select('description')
        .eq('name', SYSTEM_BEST_SELLERS_KEY)
        .maybeSingle();

      if (settings?.description) {
        try {
          const parsed = JSON.parse(settings.description);
          setPinnedIds(Array.isArray(parsed.pinned) ? parsed.pinned : []);
          setAutoSlots(typeof parsed.auto_slots === 'number' ? parsed.auto_slots : MAX_SLOTS);
        } catch { /* ignore */ }
      }

      // Fetch all products with order counts
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .order('name', { ascending: true });

      const { data: orders } = await supabase
        .from('orders')
        .select('items')
        .not('status', 'eq', 'cancelled');

      const countMap: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        (o.items || []).forEach((item: any) => {
          if (item.product_id) countMap[item.product_id] = (countMap[item.product_id] || 0) + (item.quantity || 1);
        });
      });

      const withCounts: Product[] = (prods || []).map((p) => ({
        ...p,
        order_count: countMap[p.id] || 0,
      })).sort((a, b) => b.order_count - a.order_count);

      setProducts(withCounts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SLOTS) { toast(`Max ${MAX_SLOTS} pinned products`, 'error'); return prev; }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsJson = JSON.stringify({ pinned: pinnedIds, auto_slots: autoSlots });
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', SYSTEM_BEST_SELLERS_KEY)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('categories').update({ description: settingsJson }).eq('id', existing.id);
      } else {
        await supabase.from('categories').insert({ name: SYSTEM_BEST_SELLERS_KEY, description: settingsJson, image_url: null });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const autoCount = Math.max(0, MAX_SLOTS - pinnedIds.length);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-logo-black">Best Sellers</h1>
          <p className="text-sm text-logo-black/50 mt-1 font-sans">
            Pin specific products or let the system auto-fill based on order count.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
            saved ? 'bg-emerald-500 text-white' : 'bg-action-bordeaux hover:bg-logo-black text-white disabled:opacity-60'
          }`}
        >
          {saved ? <><FiCheck size={15} /> Saved!</> : isSaving ? 'Saving...' : 'Save Settings'}
        </motion.button>
      </div>

      {/* Info banner */}
      <div className="bg-white rounded-2xl border border-logo-rose/10 p-5">
        <div className="flex items-start gap-3">
          <FiAward size={20} className="text-luxury-gold shrink-0 mt-0.5" />
          <div className="text-sm text-logo-black/70 space-y-1">
            <p><strong>How it works:</strong> The homepage shows up to <strong>{MAX_SLOTS} Best Seller</strong> product cards.</p>
            <p>You have <strong>{pinnedIds.length} pinned</strong> product{pinnedIds.length !== 1 ? 's' : ''} — these always appear first regardless of order count.</p>
            <p>The remaining <strong>{autoCount} slot{autoCount !== 1 ? 's' : ''}</strong> auto-fill with the top-ordered products.</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-logo-black/50 font-sans">Loading products...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-logo-rose/10 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-logo-rose/10 bg-bg-silk-glow/30 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-logo-black/50">Products — sorted by order count</span>
            <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-logo-rose hover:text-action-bordeaux cursor-pointer transition-colors font-semibold">
              <FiRefreshCw size={12} /> Refresh
            </button>
          </div>
          <div className="divide-y divide-logo-rose/8">
            {products.map((product, index) => {
              const isPinned = pinnedIds.includes(product.id);
              const pinnedIndex = pinnedIds.indexOf(product.id);
              const isAutoSelected = !isPinned && index < autoCount + pinnedIds.length && product.order_count > 0;
              return (
                <div key={product.id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${isPinned ? 'bg-action-bordeaux/3' : 'hover:bg-logo-rose/3'}`}>
                  {/* Rank */}
                  <span className="text-xs font-bold text-logo-black/30 w-6 text-center shrink-0">{index + 1}</span>

                  {/* Image */}
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded-lg shrink-0 border border-logo-rose/10" />
                  ) : (
                    <div className="w-10 h-10 bg-bg-silk-glow rounded-lg shrink-0 flex items-center justify-center">
                      <FiStar size={14} className="text-logo-rose/30" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-logo-black truncate">{product.name}</p>
                    <p className="text-xs text-logo-black/50">PKR {product.price.toLocaleString()} · {product.order_count} orders</p>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPinned && (
                      <span className="text-[10px] font-bold bg-action-bordeaux/10 text-action-bordeaux px-2 py-0.5 rounded-full border border-action-bordeaux/20">
                        Pinned #{pinnedIndex + 1}
                      </span>
                    )}
                    {!isPinned && isAutoSelected && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        Auto
                      </span>
                    )}
                  </div>

                  {/* Pin button */}
                  <button
                    onClick={() => togglePin(product.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isPinned
                        ? 'bg-action-bordeaux text-white border-action-bordeaux'
                        : 'border-logo-rose/20 text-logo-black/60 hover:border-logo-rose/40 hover:text-action-bordeaux'
                    }`}
                  >
                    <FiStar size={11} fill={isPinned ? 'currentColor' : 'none'} />
                    {isPinned ? 'Unpin' : 'Pin'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBestSellers;
