import PortalShell from "@/components/portal/PortalShell";
import { PortalStateProvider } from "@/components/portal/PortalState";
import { RequireAuth } from "@/components/auth/RequireAuth";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth kind="tenant">
      <PortalStateProvider>
        <PortalShell>{children}</PortalShell>
      </PortalStateProvider>
    </RequireAuth>
  );
}
