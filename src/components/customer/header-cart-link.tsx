'use client';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCartCount } from '@/hooks/use-cart';

export function HeaderCartLink() {
  const count = useCartCount();
  return <Link prefetch={false} href="/cart" aria-label={`Cart, ${count} items`} className="relative grid size-10 place-items-center rounded-lg hover:bg-secondary hover:text-primary">
    <ShoppingBag className="size-[1.17rem]" aria-hidden="true" />
    {count > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.62rem] font-bold text-primary-foreground">{count}</span>}
  </Link>;
}
