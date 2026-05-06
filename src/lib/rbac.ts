export const ROLE_SUPERADMIN = "SUPERADMIN" as const;
export const ROLE_DIRECTOR = "DIRECTOR" as const;
export const ROLE_FINANCE = "FINANCE" as const;
export const ROLE_STAFF = "STAFF" as const;

export type CanonicalRole =
  | typeof ROLE_SUPERADMIN
  | typeof ROLE_DIRECTOR
  | typeof ROLE_FINANCE
  | typeof ROLE_STAFF;

export function normalizeRole(role: string | null | undefined): CanonicalRole {
  const normalized = String(role ?? "").trim().toUpperCase();

  if (normalized === "SUPERADMIN") {
    return ROLE_SUPERADMIN;
  }

  if (normalized === "DIRECTOR" || normalized === "ADMIN") {
    return ROLE_DIRECTOR;
  }

  if (normalized === "FINANCE") {
    return ROLE_FINANCE;
  }

  return ROLE_STAFF;
}

function normalizeAdminSection(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  const adminIndex = parts.findIndex((segment) => segment === "admin");
  if (adminIndex === -1) {
    return "/";
  }

  const sectionParts = parts.slice(adminIndex + 1);
  if (sectionParts.length === 0) {
    return "/";
  }

  return `/${sectionParts.join("/")}`;
}

function pathMatches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const FOUNDATION_ADMIN_PATHS = ["/", "/profile", "/donations", "/projects", "/newsletters", "/messages", "/governance", "/activity"];

export function canAccessAdminPath(role: string | null | undefined, pathname: string) {
  void role;
  const sectionPath = normalizeAdminSection(pathname);

  if (sectionPath === "/login" || sectionPath === "/unauthorized") {
    return true;
  }

  return FOUNDATION_ADMIN_PATHS.some((prefix) => pathMatches(sectionPath, prefix));
}

export function assertRoleAllowed(role: string | null | undefined, allowedRoles: CanonicalRole[]) {
  const normalizedRole = normalizeRole(role);

  if (!allowedRoles.includes(normalizedRole)) {
    throw new Error("Forbidden");
  }

  return normalizedRole;
}
