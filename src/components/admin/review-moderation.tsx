"use client";

import { useState } from "react";
import { toast } from "sonner";
import { moderateReviewAction } from "@/server/actions/reviews";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function ReviewModeration({ id, approved }: { id: string; approved: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function update() {
    setBusy(true);
    try {
      const result = await moderateReviewAction(id, !approved);
      if (!result.success) { toast.error(result.error); return; }
      setOpen(false);
      toast.success(approved ? "Review hidden" : "Review published");
    } catch { toast.error("Could not update review"); }
    finally { setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}>
    <AlertDialogTrigger asChild><Button size="sm" variant={approved ? "outline" : "default"}>{approved ? "Hide review" : "Publish review"}</Button></AlertDialogTrigger>
    <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
      <AlertDialogHeader><AlertDialogTitle>{approved ? "Hide this review?" : "Publish this review?"}</AlertDialogTitle><AlertDialogDescription>{approved ? "The review will no longer be public or included in product ratings." : "The review will be visible publicly and included in the product’s rating."}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button onClick={update} disabled={busy}>{busy ? "Saving…" : "Confirm"}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
