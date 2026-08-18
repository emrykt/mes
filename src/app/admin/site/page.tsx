import SiteNavAdmin from "@/components/admin/SiteNavAdmin";
import SiteContentAdmin from "@/components/admin/SiteContentAdmin";

export default function AdminSitePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website content</h1>
        <p className="mt-1 text-sm text-ink-2">
          Manage the public landing page. Changes publish to the homepage immediately —
          no rebuild, no downtime.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Navigation menu</h2>
        <SiteNavAdmin />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Content sections</h2>
        <p className="text-sm text-ink-2">Trust bar, testimonials, FAQ and footer.</p>
        <SiteContentAdmin />
      </section>
    </div>
  );
}
