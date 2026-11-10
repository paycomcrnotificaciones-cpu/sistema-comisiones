const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api";
const TOKEN_KEY = "comisiones_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export interface SesionJwt {
  sub?: string;
  email?: string;
  rol?: string;
  empresaId?: string;
  comisionistaId?: string | null;
}

export function getSesion(): SesionJwt | null {
  const token = getToken();
  if (!token) return null;
  try {
    const base = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base)) as SesionJwt;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.replace("/login");
    throw new Error("Sesión expirada");
  }

  if (!response.ok) {
    const cuerpo = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(cuerpo?.message ?? `Error ${response.status}`);
  }

  return (await response.json()) as T;
}

export interface UsuarioSesion {
  id: string;
  email: string;
  rol: string;
  empresaId: string;
  comisionistaId?: string | null;
}

export async function login(email: string, password: string): Promise<UsuarioSesion> {
  const data = await apiFetch<{ accessToken: string; usuario: UsuarioSesion }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  setToken(data.accessToken);
  return data.usuario;
}

export async function descargarArchivo(path: string, nombre: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`No se pudo descargar (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
