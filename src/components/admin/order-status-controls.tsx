"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatusAction, updatePaymentStatusAction, addOrderNoteAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Printer } from "lucide-react";

const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  PENDING: [{ status: "CONFIRMED", label: "Confirm Order" }, { status: "CANCELLED", label: "Cancel" }],
  CONFIRMED: [{ status: "PACKED", label: "Mark Packed" }, { status: "CANCELLED", label: "Cancel" }],
  PACKED: [{ status: "SHIPPED", label: "Mark Shipped" }, { status: "CANCELLED", label: "Cancel" }],
  SHIPPED: [{ status: "DELIVERED", label: "Mark Delivered" }, { status: "RETURNED", label: "Mark Returned" }],
  DELIVERED: [{ status: "RETURNED", label: "Mark Returned" }],
  CANCELLED: [],
  RETURNED: [],
};

export function OrderStatusControls({
  orderId, status, paymentStatus, adminNotes,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
  adminNotes: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState(adminNotes ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function changeStatus(newStatus: string, reason?: string) {
    start(async () => {
      const res = await updateOrderStatusAction(orderId, newStatus, reason);
      if (res.success) { toast.success("Status updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  function changePayment(next: "PAID" | "PENDING" | "REFUNDED") {
    start(async () => {
      const res = await updatePaymentStatusAction(orderId, next);
      if (res.success) { toast.success("Payment status updated"); router.refresh(); }
      else toast.error(res.error ?? "Failed");
    });
  }

  function saveNote() {
    start(async () => {
      const res = await addOrderNoteAction(orderId, note);
      if (res.success) toast.success("Note saved");
      else toast.error(res.error ?? "Failed");
    });
  }

  const actions = (NEXT_ACTIONS[status] ?? []).filter((action) => action.status !== "CANCELLED" || !["PAID", "REFUNDED"].includes(paymentStatus));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) =>
          a.status === "CANCELLED" ? (
            <Button
              key={a.status}
              variant="destructive"
              disabled={pending}
              onClick={() => setCancelOpen(true)}
            >
              {a.label}
            </Button>
          ) : (
            <Button key={a.status} disabled={pending} onClick={() => changeStatus(a.status)}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} {a.label}
            </Button>
          ),
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print Invoice
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label>Payment:</Label>
        {status === "DELIVERED" && paymentStatus === "PAID" && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => changePayment("PENDING")}>Correct to unpaid</Button>
        )}
        {status === "DELIVERED" && ["PENDING", "FAILED"].includes(paymentStatus) && (
          <Button size="sm" disabled={pending} onClick={() => changePayment("PAID")}>Record COD collection</Button>
        )}
        {status === "RETURNED" && paymentStatus === "PAID" && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => changePayment("REFUNDED")}>Record completed refund</Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminNote">Internal Note (never shown to customer)</Label>
        <Textarea id="adminNote" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        <Button variant="outline" size="sm" onClick={saveNote} disabled={pending}>Save Note</Button>
      </div>

      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCancelOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-semibold">Cancel Order</h3>
            <p className="mb-3 text-sm text-muted-foreground">Stock will be restored. Add a reason (optional).</p>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="Reason for cancellation" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Order</Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => { setCancelOpen(false); changeStatus("CANCELLED", cancelReason); }}
              >
                Cancel Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
