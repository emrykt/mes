import { DemoProvider } from "@/components/demo/DemoProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import MesModuleGuard from "@/components/auth/MesModuleGuard";
import ReadOnlyBanner from "@/components/auth/ReadOnlyBanner";

export default function MesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DemoProvider>
        <ReadOnlyBanner />
        <MesModuleGuard>{children}</MesModuleGuard>
      </DemoProvider>
    </RequireAuth>
  );
}
