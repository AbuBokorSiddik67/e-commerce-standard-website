import { NotFoundView } from "@/components/shared/not-found-view";

export default function AdminNotFound() {
  return (
    <NotFoundView
      admin
      title="This admin page doesn't exist"
      description="The record may have been deleted, or the link is incorrect. Use the dashboard to continue."
    />
  );
}
