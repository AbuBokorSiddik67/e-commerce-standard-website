'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/hooks/use-cart';
import { toggleWishlistAction } from '@/server/actions/account';
import { Button } from '@/components/ui/button';
import type { CartItem } from '@/types/domain';

export function CardCartButton({item,disabled}: {item: CartItem; disabled: boolean}) {
  const [adding,setAdding] = useState(false);
  return <Button variant="outline" size="sm" className="w-full px-1.5 text-[0.7rem] sm:text-xs" disabled={disabled || adding} onClick={() => {
    setAdding(true);
    useCartStore.getState().addItem(item);
    toast.success('Added to cart');
    setTimeout(() => setAdding(false), 500);
  }}><ShoppingBag className="size-3.5 shrink-0" aria-hidden="true" />{disabled ? 'Unavailable' : adding ? 'Added' : 'Add to cart'}</Button>;
}

export function CardWishlistButton({productId,name,initial,refresh}: {productId: string;name: string;initial: boolean;refresh: boolean}) {
  const [override,setOverride] = useState<boolean>();
  const [saving,start] = useTransition();
  const router = useRouter();
  const saved = override ?? initial;
  return <button type="button" onClick={() => start(async () => {
    try {
      const result = await toggleWishlistAction(productId);
      if (!result.success) { toast.error(result.error ?? 'Could not update wishlist'); return; }
      setOverride(Boolean(result.wishlisted));
      toast.success(result.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
      if (refresh) router.refresh();
    } catch { toast.error('Could not update wishlist'); }
  })} disabled={saving} aria-pressed={saved} aria-label={`Wishlist: ${name}`} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full border border-white/60 bg-white text-[#25334e] shadow-sm hover:bg-[#eaf0fd] sm:right-3 sm:top-3">
    <Heart className={`size-4 ${saved ? 'fill-rose-600 text-rose-600' : ''}`} aria-hidden="true" />
  </button>;
}
