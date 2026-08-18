import PortalShell from "@/components/portal/PortalShell";
import { PortalStateProvider } from "@/components/portal/PortalState";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // any signed-in user: tenants see their own account; platform staff manage
    // the customer they've entered (full owner-equivalent access).
    <RequireAuth>
      <PortalStateProvider>
        <PortalShell>{children}</PortalShell>
      </PortalStateProvider>
    </RequireAuth>
  );
}
