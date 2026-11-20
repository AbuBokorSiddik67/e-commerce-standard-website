"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelMyOrderAction } from "@/server/actions/account";

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <Button className="w-full" variant="outline" disabled={pending} onClick={() => {
    if (!window.confirm("Cancel this order?")) return;
    start(async () => {
      try {
        const response = await cancelMyOrderAction(orderNumber);
        if (!response.success) { toast.error(response.error ?? "Could not cancel this order"); return; }
        toast.success("Order cancelled");
        router.refresh();
      } catch { toast.error("Could not confirm cancellation. Refresh order details before retrying."); }
    });
  }}>{pending ? "Cancelling…" : "Cancel order"}</Button>;
}
