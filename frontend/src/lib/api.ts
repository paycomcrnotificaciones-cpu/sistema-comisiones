// Dirección de la API y clave con la que se guarda el token en el navegador.
// El token vive en localStorage, así la sesión sigue abierta al recargar.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100/api";
const TOKEN_KEY = "comisiones_token";

// Lee el token guardado. En el servidor no hay localStorage, por eso devuelve null.
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

// Guarda el token después de un login correcto.
export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

// Borra el token al cerrar sesión o cuando el servidor dice que expiró.
export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

// Datos que van dentro del token (no incluye la contraseña).
export interface SesionJwt {
  sub?: string;
  email?: string;
  rol?: string;
  empresaId?: string;
  comisionistaId?: string | null;
}

// Lee los datos del usuario desde el token, sin pedirlos al servidor.
// El token tiene tres partes separadas por puntos; la del medio es la información.
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

// Tiempo máximo de espera. La API gratuita de Render se duerme a los 15
// minutos y tarda cerca de un minuto en despertar, así que el límite es
// generoso: si se pasa, se avisa en vez de quedarse colgado.
const ESPERA_MAXIMA_MS = 45_000;

// Hace la petición con tiempo límite y un reintento si el servidor no
// responde (red caída o arranque en frío).
async function pedir(url: string, init: RequestInit): Promise<Response> {
  const metodo = (init.method ?? "GET").toUpperCase();
  const intentos = metodo === "GET" ? 2 : 1;

  let ultimoError: unknown;
  for (let intento = 0; intento < intentos; intento++) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
    try {
      return await fetch(url, { ...init, signal: control.signal });
    } catch (err) {
      ultimoError = err;
      if (intento === intentos - 1) break;
      await new Promise((r) => setTimeout(r, 1200));
    } finally {
      clearTimeout(reloj);
    }
  }
  if (ultimoError instanceof Error && ultimoError.name === "AbortError") {
    throw new Error(
      "El servidor tardó demasiado en responder. Revisa tu conexión e intenta de nuevo.",
    );
  }
  throw new Error(
    "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
  );
}

// Función que usan todas las pantallas para hablar con la API.
// Agrega el token, convierte la respuesta a JSON y, si la sesión venció,
// manda al login. Si hay error, lanza un Error con el mensaje del servidor.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await pedir(`${API_URL}${path}`, { ...init, headers });

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
  debeCambiarPassword?: boolean;
}

// Inicia sesión: pide el token, lo guarda y devuelve los datos del usuario.
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

// Descarga un archivo (por ejemplo el CSV de ventas) sin salir de la página.
// Se pide con el token, se arma un enlace temporal y se simula el clic.
export async function descargarArchivo(path: string, nombre: string): Promise<void> {
  const token = getToken();
  const response = await pedir(`${API_URL}${path}`, {
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
