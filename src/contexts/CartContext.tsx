/* eslint-disable react-refresh/only-export-components, react-hooks/preserve-manual-memoization */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (id: string, options?: { size?: string; color?: string }) => void;
  changeQty: (id: string, delta: number, options?: { size?: string; color?: string }) => void;
  clearCart: () => void;
  saveCartToDB: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'dg_cart_persistent';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Save cart before tab closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
      } catch (e) {
        console.error('Failed to save cart before unload:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cartItems]);

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
    localStorage.removeItem(CART_KEY);
  }, []);

  const saveCartToDB = useCallback(async () => {
    // DB sync disabled until carts table exists in Supabase
    return;
  }, []);

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
