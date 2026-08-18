"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserKind } from "@/lib/demo-types";

/**
 * Client auth guard. Redirects to /login when signed out; when `kind` is set,
 * redirects a signed-in user of the wrong kind to their own home.
 */
export function RequireAuth({ children, kind }: { children: React.ReactNode; kind?: UserKind }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (kind && user.kind !== kind) {
      router.replace(user.kind === "platform" ? "/admin" : "/mes");
    }
  }, [loading, user, kind, router]);

  if (loading || !user || (kind && user.kind !== kind)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
