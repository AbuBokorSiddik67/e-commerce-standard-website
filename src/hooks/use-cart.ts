"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/domain";

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  setCoupon: (code: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      addItem: (item) =>
        set((state) => {
          const maxStock = Math.max(0, Math.min(100, item.maxStock));
          if (maxStock === 0 || !Number.isInteger(item.quantity) || item.quantity < 1) return state;
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? { ...item, maxStock, quantity: Math.min(i.quantity + item.quantity, maxStock) }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, maxStock, quantity: Math.min(item.quantity, maxStock) }] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId),
          ),
        })),
      updateQuantity: (productId, quantity, variantId) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.max(1, Math.min(Math.trunc(quantity), i.maxStock, 100)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clearCart: () => set({ items: [], couponCode: null }),
      setCoupon: (code) => set({ couponCode: code }),
    }),
    { name: "shopbd-cart" },
  ),
);

export function useCartCount() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useCartSubtotal() {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
}

const subscribeToBrowser = () => () => {};
const browserSnapshot = () => true;
const serverSnapshot = () => false;

// Persistence uses synchronous localStorage. This also resolves when storage
// is unavailable or corrupted, so the UI can still show and use an empty bag.
export function useCartHydrated() {
  return useSyncExternalStore(subscribeToBrowser, browserSnapshot, serverSnapshot);
}
