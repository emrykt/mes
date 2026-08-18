"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

/** Slim banner shown to view-only demo accounts so they know writes are off. */
export default function ReadOnlyBanner() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user?.readOnly) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-accent-strong px-4 py-1.5 text-center text-xs font-medium text-white">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5" />
        View-only demo tour — you can explore every screen; changes are disabled.
      </span>
      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="rounded-md bg-white/15 px-2 py-0.5 font-semibold hover:bg-white/25"
      >
        Exit
      </button>
    </div>
  );
}
