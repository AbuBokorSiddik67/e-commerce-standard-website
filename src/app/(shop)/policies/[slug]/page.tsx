import { notFound, permanentRedirect } from "next/navigation";
import { getStoreSettings } from "@/server/repositories/settings.repo";
import { POLICY_PAGES } from "@/config/site";
import { excerpt, mediaUrl, noIndex, publicMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/shared/page-heading";

const legacy: Readonly<Record<string, string>> = { return: 'return-policy', privacy: 'privacy-policy', terms: 'terms-conditions', shipping: 'shipping-policy' };
const findPolicy = (slug: string) => POLICY_PAGES.find(p => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = findPolicy(slug);
  if (!policy) return { title: 'Store policy', robots: noIndex };
  const settings = await getStoreSettings();
  const description = excerpt(settings[policy.field]);
  return publicMetadata({ title: policy.label, description, path: `/policies/${policy.slug}`, store: settings.storeName,
    image: mediaUrl(settings.socialShareImage), index: Boolean(description) });
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (Object.hasOwn(legacy, slug)) permanentRedirect(`/policies/${legacy[slug]}`);
  const policy = findPolicy(slug);
  if (!policy) notFound();
  const content = (await getStoreSettings())[policy.field];
  return <div className="container-page py-12"><div className="mx-auto max-w-3xl">
    <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: policy.label }]} />
    <h1 className="page-title">{policy.label}</h1>
    {content ? <div className="mt-6 whitespace-pre-line text-muted-foreground">{content}</div> : <p className="surface mt-6 p-6 text-muted-foreground">This policy has not been configured yet. Please contact us for more information.</p>}
  </div></div>;
}
