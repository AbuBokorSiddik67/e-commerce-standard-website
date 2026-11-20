import { TrackOrderClient } from "@/components/customer/track-order-client";

export default function TrackOrderPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-center">Track Your Order</h1>
        <p className="mb-8 text-center text-muted-foreground">Enter your order number and phone to see your order status.</p>
        <TrackOrderClient />
      </div>
    </div>
  );
}
