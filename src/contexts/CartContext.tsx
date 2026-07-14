/* eslint-disable react-refresh/only-export-components, react-hooks/preserve-manual-memoization */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabase';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  size?: string;
  color?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  isLoadingCart: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (id: string, options?: { size?: string; color?: string }) => void;
  changeQty: (id: string, delta: number, options?: { size?: string; color?: string }) => void;
  clearCart: () => void;
  saveCartToDB: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY_PREFIX = 'dg_cart_';

const getCartKey = (userId: string | null) => {
  if (userId) {
    return `${CART_KEY_PREFIX}${userId}`;
  }
  return `${CART_KEY_PREFIX}guest`;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const cartKey = getCartKey(user?.id || null);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const key = getCartKey(user?.id || null);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  // Load saved cart from DB when user logs in
  useEffect(() => {
    const loadCartFromDB = async () => {
      if (!user?.id) {
        // No user - load guest cart from localStorage
        try {
          const key = getCartKey(null);
          const stored = localStorage.getItem(key);
          setCartItems(stored ? JSON.parse(stored) : []);
        } catch {
          setCartItems([]);
        }
        return;
      }

      setIsLoadingCart(true);
      try {
        // First try to load from DB
        const { data, error } = await supabase
          .from('carts')
          .select('cart_data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.cart_data) {
          const dbCart = data.cart_data as CartItem[];
          setCartItems(dbCart);
          // Also sync to localStorage
          localStorage.setItem(cartKey, JSON.stringify(dbCart));
        } else {
          // No cart in DB - check localStorage
          try {
            const key = getCartKey(user.id);
            const stored = localStorage.getItem(key);
            setCartItems(stored ? JSON.parse(stored) : []);
          } catch {
            setCartItems([]);
          }
        }
      } catch (err) {
        console.error('Error loading cart from DB:', err);
        // Fallback to localStorage if DB fails
        try {
          const key = getCartKey(user.id);
          const stored = localStorage.getItem(key);
          setCartItems(stored ? JSON.parse(stored) : []);
        } catch {
          setCartItems([]);
        }
      } finally {
        setIsLoadingCart(false);
      }
    };

    loadCartFromDB();
  }, [user?.id, cartKey]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, cartKey]);

  // Lock body scroll when cart open
  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setCartItems((prev) => {
      const key = item.id + (item.size || '') + (item.color || '');
      const exists = prev.find((i) => i.id + (i.size || '') + (i.color || '') === key);
      if (exists) {
        return prev.map((i) =>
          i.id + (i.size || '') + (i.color || '') === key
            ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
            : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: string, options?: { size?: string; color?: string }) => {
    const { size, color } = options || {};
    setCartItems((prev) => prev.filter((i) => {
      const matchesId = i.id === id;
      const matchesSize = (size === undefined) || (i.size === size);
      const matchesColor = (color === undefined) || (i.color === color);
      return !(matchesId && matchesSize && matchesColor);
    }));
  }, []);

  const changeQty = useCallback((id: string, delta: number, options?: { size?: string; color?: string }) => {
    const { size, color } = options || {};
    setCartItems((prev) =>
      prev.map((i) => {
        const matchesId = i.id === id;
        const matchesSize = (size === undefined) || (i.size === size);
        const matchesColor = (color === undefined) || (i.color === color);
        if (matchesId && matchesSize && matchesColor) {
          return { ...i, quantity: Math.max(1, i.quantity + delta) };
        }
        return i;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    // Also clear from localStorage
    if (user) {
      localStorage.removeItem(getCartKey(user.id));
    } else {
      localStorage.removeItem(getCartKey(null));
    }
  }, [user]);

  const saveCartToDB = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Check if cart exists for user
      const { data: existingCart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCart) {
        // Update existing cart
        await supabase
          .from('carts')
          .update({ 
            cart_data: cartItems, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingCart.id);
      } else {
        // Insert new cart
        await supabase
          .from('carts')
          .insert({ 
            user_id: user.id, 
            cart_data: cartItems,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          });
      }
    } catch (err) {
      console.error('Error saving cart to DB:', err);
      throw err;
    }
  }, [user?.id, cartItems]);

  const openCart  = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      cartCount, 
      cartTotal, 
      isCartOpen, 
      isLoadingCart,
      addToCart, 
      removeFromCart, 
      changeQty, 
      clearCart,
      saveCartToDB,
      openCart, 
      closeCart 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
