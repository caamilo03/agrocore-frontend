export type UserRole = "ADMIN" | "OPERADOR" | "OBSERVADOR";
export type UserStatus = "PENDIENTE" | "ACTIVO" | "BLOQUEADO";

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  role: UserRole | null;   // null when status === "PENDIENTE"
  status: UserStatus;
}

const TOKEN_KEY = "agro_token";
const USER_KEY = "agro_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** True if the role can write (create/edit/delete) */
export function canWrite(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "OPERADOR";
}

/** True if the role has full admin access */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}
