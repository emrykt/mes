import type { AppModule, AuthUser, SessionUser, TenantRole } from "@/lib/demo-types";

/** All grantable modules, in display order. */
export const ALL_MODULES: AppModule[] = [
  "operator",
  "production",
  "sales",
  "maintenance",
  "executive",
  "tv",
];

export const MODULE_LABELS: Record<AppModule, string> = {
  operator: "Operator Kiosk",
  production: "Production Management",
  sales: "Sales & Quoting",
  maintenance: "Maintenance",
  executive: "Executive",
  tv: "Andon TV",
};

export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  owner: "Account Owner",
  admin: "Administrator",
  production: "Production Manager",
  operator: "Operator",
  sales: "Sales",
  maintenance: "Maintenance",
  executive: "Executive",
};

export const PLATFORM_ROLE_LABELS = {
  owner: "Platform Owner",
  admin: "Platform Admin",
  sales: "Platform Sales",
} as const;

/** Default module grant for a tenant role (owner can still customize). */
export function defaultModules(role: TenantRole): AppModule[] {
  switch (role) {
    case "owner":
    case "admin":
      return [...ALL_MODULES];
    case "production":
      return ["production", "tv"];
    case "operator":
      return ["operator"];
    case "sales":
      return ["sales"];
    case "maintenance":
      return ["maintenance"];
    case "executive":
      return ["executive", "tv"];
    default:
      return [];
  }
}

/** Owner/admin (and all platform staff) implicitly see every module. */
export function seesAllModules(u: {
  kind: string;
  tenantRole?: TenantRole;
}): boolean {
  return u.kind === "platform" || u.tenantRole === "owner" || u.tenantRole === "admin";
}

/** Effective modules a user may access. */
export function modulesFor(u: {
  kind: string;
  tenantRole?: TenantRole;
  modules?: AppModule[];
}): AppModule[] {
  return seesAllModules(u) ? [...ALL_MODULES] : u.modules ?? [];
}

export function hasModule(
  u: { kind: string; tenantRole?: TenantRole; modules?: AppModule[] } | null | undefined,
  m: AppModule,
): boolean {
  if (!u) return false;
  return modulesFor(u).includes(m);
}

/** Platform admin/owner can manage platform staff & all tenants. */
export function canManagePlatform(u: { kind: string; platformRole?: string } | null): boolean {
  return !!u && u.kind === "platform" && (u.platformRole === "owner" || u.platformRole === "admin");
}

/** Tenant owner/admin can manage their own team. */
export function canManageTenant(u: { kind: string; tenantRole?: TenantRole } | null): boolean {
  return !!u && u.kind === "tenant" && (u.tenantRole === "owner" || u.tenantRole === "admin");
}

/** Strip secrets before sending a user to the client. */
export function sanitizeUser(u: AuthUser): SessionUser {
  const { password: _pw, inviteToken: _it, ...rest } = u;
  void _pw;
  void _it;
  return rest;
}
