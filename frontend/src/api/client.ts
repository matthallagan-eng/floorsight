const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE}/auth/login`, { method: "POST", body });
    return handle<{ access_token: string }>(res);
  },

  async register(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handle(res);
  },

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    return handle<T>(res);
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    return handle<T>(res);
  },

  async upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/uploads`, {
      method: "POST", headers: authHeaders(), body: form,
    });
    return handle<{ rows_imported: number; machines_created: number }>(res);
  },
};