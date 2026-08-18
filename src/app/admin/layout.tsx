import AdminSidebar from "@/components/admin/AdminSidebar";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth kind="platform">
      <div className="min-h-screen">
        <AdminSidebar />
        <main className="ml-60 px-8 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </RequireAuth>
  );
}
