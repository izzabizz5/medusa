export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'athlete' | 'admin';
  sport: string | null;
}

const USER_KEY = 'medusa_user';
const ADMIN_USER_KEY = 'medusa_admin_user';

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Returns the real admin identity when impersonating, null otherwise. */
export function getAdminUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Token is now an httpOnly session cookie managed by the browser.
// We only store non-sensitive user info for UI display purposes.
export function setAuth(user: AuthUser, adminUser?: AuthUser | null) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (adminUser) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
  } else {
    localStorage.removeItem(ADMIN_USER_KEY);
  }
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

export function isImpersonating(): boolean {
  return getAdminUser() !== null;
}
