/* src/auth.ts */
/**
 * Simple token & user store that mirrors the project's existing conventions.
 * The token is persisted in localStorage under the key `authToken`.
 * The current user object (id, email, role) is stored under `authUser`.
 * All getters return `null` when nothing is stored.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  createdAt?: string;
}

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const authStore = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      const user: unknown = JSON.parse(raw);
      if (
        typeof user === 'object' &&
        user !== null &&
        'id' in user && typeof user.id === 'string' &&
        'email' in user && typeof user.email === 'string' &&
        'role' in user && ['ADMIN', 'MANAGER', 'STAFF'].includes(String(user.role))
      ) {
        return user as AuthUser;
      }
    } catch {
      localStorage.removeItem(USER_KEY);
    }

    localStorage.removeItem(USER_KEY);
    return null;
  },
  setUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem(USER_KEY);
  },
  // Convenience to clear everything (used on 401/403)
  clear() {
    this.clearToken();
    this.clearUser();
  },
};
