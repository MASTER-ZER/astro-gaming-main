import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  cartId: string;
  gameId: string;
  gameName: string;
  gameNameAr: string;
  gameSlug: string;
  gameIcon: string;
  packageId: string;
  packageName: string;
  packageAmount: string;
  packagePrice: number;
  loginType: string;
  quantity: number;
  playerId?: string;
  accountUsername?: string;
  accountPassword?: string;
  linkingMethod?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartId">) => void;
  removeItem: (cartId: string) => void;
  updateItem: (cartId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  totalPrice: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateItem: () => {},
  clearCart: () => {},
  totalPrice: 0,
  itemCount: 0,
});

const CART_STORAGE_KEY = "master_astro_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "cartId">) => {
    const cartId = `${item.packageId}_${Date.now()}`;
    setItems(prev => [...prev, { ...item, cartId }]);
  };

  const removeItem = (cartId: string) => {
    setItems(prev => prev.filter(i => i.cartId !== cartId));
  };

  const updateItem = (cartId: string, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(i => i.cartId === cartId ? { ...i, ...updates } : i));
  };

  const clearCart = () => setItems([]);

  const totalPrice = items.reduce((sum, i) => sum + i.packagePrice * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItem, clearCart, totalPrice, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
