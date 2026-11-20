import { notFound } from "next/navigation";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { POLICY_PAGES } from "@/config/site";
import type { Metadata } from "next";

const POLICY_MAP: Record<string, { title: string; content: string | null }> = {
  return: { title: "Return Policy", content: "" },
  privacy: { title: "Privacy Policy", content: "" },
  terms: { title: "Terms & Conditions", content: "" },
  shipping: { title: "Shipping Policy", content: "" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = POLICY_MAP[slug];
  if (!policy) return { title: "Policy not found" };
  return { title: policy.title };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const settings = await getStoreSettings();

  const map: Record<string, { title: string; content: string | null }> = {
    return: { title: "Return Policy", content: settings.returnPolicy },
    privacy: { title: "Privacy Policy", content: settings.privacyPolicy },
    terms: { title: "Terms & Conditions", content: settings.termsConditions },
    shipping: { title: "Shipping Policy", content: settings.shippingPolicy },
  };

  const policy = map[slug];
  if (!policy) notFound();

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">{policy.title}</h1>
        {policy.content ? (
          <div className="mt-6 whitespace-pre-line text-muted-foreground">{policy.content}</div>
        ) : (
          <div className="mt-6 rounded-lg border p-6 text-center text-muted-foreground">
            <p>This policy has not been configured yet.</p>
            <p className="mt-1 text-sm">Please contact us for more information.</p>
          </div>
        )}
      </div>
    </div>
  );
}
