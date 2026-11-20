"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleCustomerBlockAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Loader2, Ban, CheckCircle } from "lucide-react";

export function CustomerRowActions({ id, isBlocked }: { id: string; isBlocked: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      const res = await toggleCustomerBlockAction(id, !isBlocked);
      if (res.success) {
        toast.success(isBlocked ? "Customer unblocked" : "Customer blocked");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={toggle}
      className={isBlocked ? "text-green-600" : "text-destructive"}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isBlocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
      {isBlocked ? "Unblock" : "Block"}
    </Button>
  );
}
