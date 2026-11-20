import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingCatalog() {
  return <div className="container-page space-y-6 py-8" role="status" aria-label="Loading catalog">
    <Skeleton className="h-28 rounded-2xl motion-reduce:animate-none" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({length: 8}, (_, i) => <Skeleton className="aspect-[4/5] rounded-2xl motion-reduce:animate-none" key={i} />)}</div>
  </div>;
}
