"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatusAction, updatePaymentStatusAction, addOrderNoteAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
            <AlertDialog key={a.status} open={cancelOpen} onOpenChange={open => { if (!pending) setCancelOpen(open); }}>
              <AlertDialogTrigger asChild><Button variant="destructive" disabled={pending}>{a.label}</Button></AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
                <AlertDialogHeader><AlertDialogTitle>Cancel order?</AlertDialogTitle><AlertDialogDescription>Stock will be restored. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <div className="space-y-1.5"><Label htmlFor="cancel-reason">Cancellation reason (optional)</Label><Textarea id="cancel-reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} maxLength={500} /></div>
                <AlertDialogFooter><AlertDialogCancel>Keep order</AlertDialogCancel><Button variant="destructive" disabled={pending} onClick={() => { setCancelOpen(false); changeStatus("CANCELLED", cancelReason); }}>Cancel order</Button></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

    </div>
  );
}
