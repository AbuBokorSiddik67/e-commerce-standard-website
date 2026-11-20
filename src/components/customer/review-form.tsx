"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReviewAction } from "@/server/actions/customer";
import { toast } from "sonner";

export function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      productId,
      rating,
      customerName: (form.elements.namedItem("customerName") as HTMLInputElement).value,
      city: (form.elements.namedItem("city") as HTMLInputElement).value,
      title: (form.elements.namedItem("title") as HTMLInputElement).value,
      body: (form.elements.namedItem("body") as HTMLTextAreaElement).value,
    };
    const res = await submitReviewAction(data);
    setLoading(false);
    if (res.success) {
      toast.success("Review submitted! It will appear after approval.");
      onDone();
    } else {
      toast.error(res.error ?? "Failed to submit review");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border p-4">
      <div>
        <Label>Rating</Label>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}>
              <Star className={`h-6 w-6 ${(hover || rating) >= s ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="customerName">Your Name</Label>
          <Input id="customerName" name="customerName" required />
        </div>
        <div>
          <Label htmlFor="city">City (optional)</Label>
          <Input id="city" name="city" />
        </div>
      </div>
      <div>
        <Label htmlFor="title">Title (optional)</Label>
        <Input id="title" name="title" />
      </div>
      <div>
        <Label htmlFor="body">Review</Label>
        <Textarea id="body" name="body" rows={3} />
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Review"}</Button>
    </form>
  );
}
