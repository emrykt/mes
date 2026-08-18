import { DemoProvider } from "@/components/demo/DemoProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import MesModuleGuard from "@/components/auth/MesModuleGuard";

export default function MesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DemoProvider>
        <MesModuleGuard>{children}</MesModuleGuard>
      </DemoProvider>
    </RequireAuth>
  );
}
