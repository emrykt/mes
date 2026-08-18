"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PLATFORM_ROLE_LABELS, TENANT_ROLE_LABELS } from "@/lib/auth";

/** Current-user block + logout, for a sidebar. `dark` for the chrome sidebar. */
export default function UserMenu({ dark = false }: { dark?: boolean }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  const roleLabel = user.readOnly
    ? "Demo · view-only"
    : user.kind === "platform"
      ? PLATFORM_ROLE_LABELS[user.platformRole ?? "admin"]
      : TENANT_ROLE_LABELS[user.tenantRole ?? "operator"];

  const nameCls = dark ? "text-white" : "text-ink";
  const subCls = dark ? "text-chrome-ink/70" : "text-muted";

  const doLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div>
      <p className={`truncate text-sm font-medium ${nameCls}`}>{user.name}</p>
      <p className={`truncate text-[11px] ${subCls}`}>{roleLabel}</p>
      <button
        onClick={doLogout}
        className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${
          dark ? "text-chrome-ink hover:text-white" : "text-ink-2 hover:text-ink"
        }`}
      >
        <LogOut className="size-3.5" />
        Sign out
      </button>
    </div>
  );
}
