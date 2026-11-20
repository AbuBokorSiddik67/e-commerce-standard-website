import { getStoreSettings } from "@/server/repositories/settings.repo";
import { Truck, ShieldCheck, RotateCcw, HeadphonesIcon, Users, Target, Heart } from "lucide-react";

export default async function AboutPage() {
  const settings = await getStoreSettings();

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">About {settings.storeName}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We're dedicated to bringing you the best products at affordable prices, delivered right to your door across Bangladesh.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border p-6 text-center">
            <Users className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-3 font-semibold">10,000+ Customers</h3>
            <p className="mt-1 text-sm text-muted-foreground">Trusted by thousands across the country</p>
          </div>
          <div className="rounded-lg border p-6 text-center">
            <Target className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-3 font-semibold">Quality First</h3>
            <p className="mt-1 text-sm text-muted-foreground">Every product is checked before shipping</p>
          </div>
          <div className="rounded-lg border p-6 text-center">
            <Heart className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-3 font-semibold">Customer Care</h3>
            <p className="mt-1 text-sm text-muted-foreground">We're here to help, every step of the way</p>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <h2 className="text-xl font-bold">Our Story</h2>
          <p className="text-muted-foreground">
            {settings.storeName} started with a simple mission: make quality products accessible to everyone in Bangladesh.
            We believe online shopping should be easy, affordable, and reliable — which is why we offer cash on delivery,
            fast shipping, and easy returns on every order.
          </p>
          <p className="text-muted-foreground">
            From our warehouse to your doorstep, we handle every step with care. Our team works hard to source
            authentic products, pack them securely, and deliver them quickly. If you ever have an issue, our
            customer support team is just a phone call away.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border p-6">
            <Truck className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-semibold">Fast Nationwide Delivery</h3>
            <p className="mt-1 text-sm text-muted-foreground">We ship to all 64 districts of Bangladesh with tracked delivery.</p>
          </div>
          <div className="rounded-lg border p-6">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-semibold">100% Authentic Products</h3>
            <p className="mt-1 text-sm text-muted-foreground">Every item is verified and quality-checked before dispatch.</p>
          </div>
          <div className="rounded-lg border p-6">
            <RotateCcw className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-semibold">Easy Returns</h3>
            <p className="mt-1 text-sm text-muted-foreground">Not satisfied? Return within the return window for a refund.</p>
          </div>
          <div className="rounded-lg border p-6">
            <HeadphonesIcon className="h-8 w-8 text-primary" />
            <h3 className="mt-3 font-semibold">Dedicated Support</h3>
            <p className="mt-1 text-sm text-muted-foreground">Reach us by phone or email — we respond quickly.</p>
          </div>
        </div>

        <div className="mt-10 rounded-lg bg-muted p-6 text-center">
          <h2 className="text-xl font-bold">Get in Touch</h2>
          <p className="mt-2 text-muted-foreground">
            {settings.contactPhone && <span>Phone: {settings.contactPhone} · </span>}
            {settings.contactEmail && <span>Email: {settings.contactEmail}</span>}
          </p>
          {settings.storeAddress && <p className="mt-1 text-sm text-muted-foreground">{settings.storeAddress}</p>}
        </div>
      </div>
    </div>
  );
}
