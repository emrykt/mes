"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasModule } from "@/lib/auth";
import type { AppModule } from "@/lib/demo-types";

const PREFIX_MODULE: [string, AppModule][] = [
  ["/mes/operator", "operator"],
  ["/mes/sales", "sales"],
  ["/mes/manager", "production"],
  ["/mes/stock", "production"],
  ["/mes/maintenance", "maintenance"],
  ["/mes/executive", "executive"],
  ["/mes/tv", "tv"],
];

/** Redirect a tenant member away from a module they aren't granted. Platform
 *  staff and owner/admin pass everything (hasModule handles that). */
export default function MesModuleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const required = PREFIX_MODULE.find(([p]) => pathname.startsWith(p))?.[1];
  const allowed = !required || !user || hasModule(user, required);

  useEffect(() => {
    if (!loading && user && required && !hasModule(user, required)) {
      router.replace("/mes");
    }
  }, [loading, user, required, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
