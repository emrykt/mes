import SiteNavAdmin from "@/components/admin/SiteNavAdmin";

export default function AdminSitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website content</h1>
        <p className="mt-1 text-sm text-ink-2">
          Manage the landing-page mega-menu. Changes publish to the public homepage
          immediately — no rebuild, no downtime.
        </p>
      </div>
      <SiteNavAdmin />
    </div>
  );
}
