import { Skeleton } from '@/components/ui/skeleton';

// The local cart is unavailable to SSR. Reserve a stable viewport and avoid
// presenting a misleading empty cart before the persisted shop bag is read.
export const CART_VIEWPORT = 'min-h-[calc(100svh-9rem)]';

export function CartLoading({label}: {label: string}) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]" role="status" aria-label={label}>
    <Skeleton className="h-44 rounded-2xl motion-reduce:animate-none" />
    <Skeleton className="h-44 rounded-2xl motion-reduce:animate-none" />
  </div>;
}
