import PortalShell from "@/components/portal/PortalShell";
import { PortalStateProvider } from "@/components/portal/PortalState";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalStateProvider>
      <PortalShell>{children}</PortalShell>
    </PortalStateProvider>
  );
}
