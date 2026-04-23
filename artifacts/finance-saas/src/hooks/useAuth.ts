const TOKEN_KEY = "ini_token";
const USER_KEY = "ini_user";

export type AuthUser = {
  email: string;
  name: string;
  role: "master" | "admin" | "user";
};

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isMaster(): boolean {
  return getStoredUser()?.role === "master";
}

export function isLoggedIn(): boolean {
  return !!getStoredToken() && !!getStoredUser();
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ success: true; user: AuthUser } | { success: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
    if (!res.ok || !data.token || !data.user) {
      return { success: false, error: data.error ?? "Login failed." };
    }
    saveAuth(data.token, data.user);
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function verifyToken(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearAuth();
      return null;
    }
    const data = await res.json() as { user?: AuthUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}
