import Cookies from 'js-cookie';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'athlete' | 'admin';
}

export function getUser(): AuthUser | null {
  const raw = Cookies.get('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setAuth(token: string, user: AuthUser) {
  Cookies.set('accessToken', token, { expires: 7 });
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
}

export function clearAuth() {
  Cookies.remove('accessToken');
  Cookies.remove('user');
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}
