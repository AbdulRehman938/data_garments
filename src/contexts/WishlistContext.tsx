/* eslint-disable react-refresh/only-export-components, react-hooks/preserve-manual-memoization, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

export interface WishlistItem {
  id: string;           // wishlist row id
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  added_at: string;
}

interface SupabaseWishlistRow {
  id: string;
  product_id: string;
  added_at: string;
  products: { name: string; price: number; image_url: string | null }[] | null;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistIds: Set<string>;
  isLoading: boolean;
  addToWishlist: (product: { id: string; name: string; price: number; image_url: string | null }) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refetch: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const wishlistIds = useMemo(() => new Set(wishlistItems.map((i) => i.product_id)), [wishlistItems]);

  const fetchWishlist = useCallback(async () => {
    if (!user?.id) { setWishlistItems([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('id, product_id, added_at, products(name, price, image_url)')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      const items: WishlistItem[] = ((data || []) as unknown as SupabaseWishlistRow[]).map((row) => {
        const product = row.products?.[0];
        return {
          id: row.id,
          product_id: row.product_id,
          name: product?.name ?? 'Unknown',
          price: product?.price ?? 0,
          image_url: product?.image_url ?? null,
          added_at: row.added_at,
        };
      });
      setWishlistItems(items);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch on login / user change
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchWishlist();
    } else {
      setWishlistItems([]);
    }
  }, [isAuthenticated, user?.id, fetchWishlist]);

  const addToWishlist = useCallback(async (product: { id: string; name: string; price: number; image_url: string | null }) => {
    if (!user?.id) return;
    // Optimistic update
    const tempItem: WishlistItem = {
      id: `temp_${product.id}`,
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      added_at: new Date().toISOString(),
    };
    setWishlistItems((prev) => [tempItem, ...prev]);
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .insert({ user_id: user.id, product_id: product.id })
        .select('id')
        .single();
      if (error) throw error;
      // Replace temp with real id
      setWishlistItems((prev) =>
        prev.map((i) => i.id === tempItem.id ? { ...i, id: data.id } : i)
      );
    } catch (err) {
      // Rollback on error
      console.error('Error adding to wishlist:', err);
      setWishlistItems((prev) => prev.filter((i) => i.id !== tempItem.id));
    }
  }, [user?.id]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!user?.id) return;
    const removed = wishlistItems.find((i) => i.product_id === productId);
    // Optimistic
    setWishlistItems((prev) => prev.filter((i) => i.product_id !== productId));
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      if (error) throw error;
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      // Rollback
      if (removed) setWishlistItems((prev) => [removed, ...prev]);
    }
  }, [user?.id, wishlistItems]);

  const isInWishlist = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  return (
    <WishlistContext.Provider value={{ wishlistItems, wishlistIds, isLoading, addToWishlist, removeFromWishlist, isInWishlist, refetch: fetchWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
};
