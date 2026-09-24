'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => { success: boolean; message?: string };
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => { success: boolean; message?: string };
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discountTotal: number;
  shippingEstimate: number;
  orderTotal: number;
  freeShippingThreshold: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'njd_cart_v1';
const FREE_SHIPPING_THRESHOLD = 50;
const STANDARD_SHIPPING_RATE = 4.99;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage when updated
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to storage', e);
      }
    }
  }, [items, isLoaded]);

  const addItem = (newItem: Omit<CartItem, 'quantity'>, quantity: number = 1): { success: boolean; message?: string } => {
    if (newItem.maxInventory <= 0) {
      return { success: false, message: 'This item is currently out of stock.' };
    }

    let result = { success: true, message: 'Added to cart' };

    setItems((prevItems) => {
      const index = prevItems.findIndex(
        (i) => i.id === newItem.id && (newItem.variantId ? i.variantId === newItem.variantId : !i.variantId)
      );

      if (index > -1) {
        const existing = prevItems[index];
        const requestedQuantity = existing.quantity + quantity;

        if (requestedQuantity > existing.maxInventory) {
          result = {
            success: false,
            message: `Only ${existing.maxInventory} units available in stock.`,
          };
          const updated = [...prevItems];
          updated[index] = { ...existing, quantity: existing.maxInventory };
          return updated;
        }

        const updated = [...prevItems];
        updated[index] = { ...existing, quantity: requestedQuantity };
        return updated;
      } else {
        const actualQuantity = Math.min(quantity, newItem.maxInventory);
        if (quantity > newItem.maxInventory) {
          result = {
            success: true,
            message: `Quantity adjusted to available stock (${newItem.maxInventory}).`,
          };
        }
        return [...prevItems, { ...newItem, quantity: actualQuantity }];
      }
    });

    return result;
  };

  const removeItem = (id: string, variantId?: string) => {
    setItems((prevItems) =>
      prevItems.filter((i) => !(i.id === id && (variantId ? i.variantId === variantId : !i.variantId)))
    );
  };

  const updateQuantity = (id: string, quantity: number, variantId?: string): { success: boolean; message?: string } => {
    if (quantity <= 0) {
      removeItem(id, variantId);
      return { success: true };
    }

    let result: { success: boolean; message?: string } = { success: true };

    setItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.id === id && (variantId ? item.variantId === variantId : !item.variantId)) {
          if (quantity > item.maxInventory) {
            result = {
              success: false,
              message: `Cannot exceed available inventory of ${item.maxInventory} units.`,
            };
            return { ...item, quantity: item.maxInventory };
          }
          return { ...item, quantity };
        }
        return item;
      });
    });

    return result;
  };

  const clearCart = () => {
    setItems([]);
  };

  // Calculations
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const effectivePrice = item.salePrice !== null && item.salePrice !== undefined && item.salePrice < item.price ? item.salePrice : item.price;
    return sum + effectivePrice * item.quantity;
  }, 0);

  const discountTotal = items.reduce((sum, item) => {
    if (item.salePrice !== null && item.salePrice !== undefined && item.salePrice < item.price) {
      return sum + (item.price - item.salePrice) * item.quantity;
    }
    return sum;
  }, 0);

  const shippingEstimate = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_RATE;
  const orderTotal = subtotal + shippingEstimate;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        discountTotal,
        shippingEstimate,
        orderTotal,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
