import { getStoreSettings } from "@/server/repositories/settings.repo";
import { ContactClient } from "@/components/customer/contact-client";

export default async function ContactPage() {
  const settings = await getStoreSettings();
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">Have a question? We're here to help.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {settings.contactPhone && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{settings.contactPhone}</p>
            </div>
          )}
          {settings.contactEmail && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{settings.contactEmail}</p>
            </div>
          )}
          {settings.storeAddress && (
            <div className="rounded-lg border p-4 sm:col-span-2">
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{settings.storeAddress}</p>
            </div>
          )}
        </div>

        <ContactClient />
      </div>
    </div>
  );
}
