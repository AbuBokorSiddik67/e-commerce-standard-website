'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const ReviewForm = dynamic(() => import('./review-form').then(m => m.ReviewForm), {
  ssr: false,
  loading: () => <p role="status" className="my-4 text-sm text-muted-foreground">Loading review form…</p>,
});

export function ReviewComposer({productId}: {productId: string}) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" size="sm" className="mb-4" aria-expanded={open} aria-controls="review-composer" onClick={() => setOpen(!open)}>{open ? 'Close review form' : 'Write a review'}</Button>
    <div id="review-composer" hidden={!open}>{open && <ReviewForm productId={productId} onDone={() => setOpen(false)} />}</div>
  </>;
}
