"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSesion, type SesionJwt } from "@/lib/api";

interface Usuario {
  id: string;
  email: string;
  rol: "SUPER_ADMIN" | "ADMIN" | "SUPERVISOR" | "COMISIONISTA";
  activo: boolean;
  comisionista: { id: string; nombre: string } | null;
}

const rolLabel: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COMISIONISTA: "Comisionista",
};

const rolClass: Record<string, string> = {
  SUPER_ADMIN: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
  ADMIN: "bg-success-500/10 text-success-600 dark:text-success-500",
  SUPERVISOR: "bg-warning-500/10 text-warning-600",
  COMISIONISTA: "bg-light-100 text-body-text dark:bg-dark-600",
};

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-body-text/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white";

// Usuarios del sistema: quién puede entrar y con qué rol.
// Un admin solo maneja supervisores; el super admin maneja también admins.
export default function UsuariosPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esSuperAdmin = sesion?.rol === "SUPER_ADMIN";
  const esGestor = esSuperAdmin || sesion?.rol === "ADMIN";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("SUPERVISOR");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Enlace de un solo uso que se le entrega a la persona para que cree su
  // contraseña. El administrador nunca la conoce.
  const [enlace, setEnlace] = useState<{ email: string; url: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Trae la lista de usuarios de la empresa.
  const cargar = useCallback(async () => {
    const data = await apiFetch<Usuario[]>("/usuarios");
    setUsuarios(data);
  }, []);

  useEffect(() => {
    if (!sesion) return;
    if (!esGestor) {
      router.replace("/comisionistas");
      return;
    }
    let activo = true;
    (async () => {
      try {
        await cargar();
        if (activo) setCargando(false);
      } catch (err) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
        setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar, esGestor, router, sesion]);

  // Crea un usuario nuevo. No se pide contraseña: el sistema genera un enlace
  // de invitación y la persona define la suya.
  async function crear(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    setEnlace(null);
    try {
      const creado = await apiFetch<{
        email: string;
        enlaceInvitacion: string;
      }>("/usuarios", {
        method: "POST",
        body: JSON.stringify({ email, rol }),
      });
      setEmail("");
      setMensaje("Usuario creado. Comparte el enlace para que defina su contraseña.");
      setEnlace({ email: creado.email, url: creado.enlaceInvitacion });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    }
  }

  // Indica si el usuario de la sesión puede modificar a esta persona.
  // Nadie puede modificarse a sí mismo.
  function puedeGestionar(u: Usuario): boolean {
    if (u.id === sesion?.sub) return false;
    if (esSuperAdmin) return true;
    return u.rol === "SUPERVISOR" || u.rol === "COMISIONISTA";
  }

  // Cambia el rol de un usuario. Si el rol cambia, el servidor genera un
  // enlace nuevo de un solo uso para que la persona defina su contraseña.
  async function cambiarRol(id: string, nuevoRol: string) {
    setError(null);
    setMensaje(null);
    setEnlace(null);
    try {
      const actualizado = await apiFetch<
        Usuario & { enlaceInvitacion?: string }
      >(`/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ rol: nuevoRol }),
      });
      if (actualizado.enlaceInvitacion) {
        setEnlace({ email: actualizado.email, url: actualizado.enlaceInvitacion });
        setMensaje(
          "Rol actualizado. Comparte el enlace para que defina su nueva contraseña.",
        );
      } else {
        setMensaje("Rol actualizado");
      }
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar el rol");
    }
  }

  // Activa o desactiva el acceso de un usuario sin borrarlo.
  async function alternarActivo(u: Usuario) {
    setError(null);
    setMensaje(null);
    try {
      await apiFetch(`/usuarios/${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !u.activo }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  }

  // Genera un enlace para que el usuario cree o cambie su contraseña.
  // Reemplaza al viejo "cambiar contraseña": así el admin nunca la ve.
  async function generarEnlace(u: Usuario) {
    setError(null);
    setMensaje(null);
    setEnlace(null);
    try {
      const data = await apiFetch<{ enlace: string }>(
        `/usuarios/${u.id}/enlace`,
        { method: "POST" },
      );
      setEnlace({ email: u.email, url: data.enlace });
      setMensaje("Enlace generado. Los anteriores quedaron anulados.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al generar el enlace",
      );
    }
  }

  // Copia el enlace al portapapeles para pegarlo en un chat o correo.
  async function copiarEnlace() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  if (!esGestor) return null;

  return (
    <AppShell titulo="Usuarios">
      <div className="space-y-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
            Control de acceso
          </p>
          <h1 className="mt-3 font-display text-[37px] font-bold leading-none tracking-[-0.4px] text-zinc-900 dark:text-white">
            Usuarios
          </h1>
          <p className="mt-3 text-[14px] text-body-text">
            Define quién entra como supervisor, administrador o super admin.
          </p>
        </div>

        <section className="surface p-6 lg:p-7">
          <div className="mb-6 flex gap-3">
            <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">01</span>
            <div>
              <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                Nuevo usuario
              </h2>
              <p className="mt-1 text-[12px] text-body-text">
                {esSuperAdmin
                  ? "Puedes crear supervisores, administradores y super admins."
                  : "Puedes crear usuarios supervisores."}
              </p>
            </div>
          </div>

          <form onSubmit={crear} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Correo</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Rol</span>
              <select value={rol} onChange={(e) => setRol(e.target.value)} className={inputClass}>
                <option value="SUPERVISOR">Supervisor</option>
                {esSuperAdmin && <option value="ADMIN">Administrador</option>}
                {esSuperAdmin && <option value="SUPER_ADMIN">Super admin</option>}
              </select>
            </label>
            <button type="submit" className="flex h-[46px] items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600">
              Crear usuario
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-danger-500">{error}</p>}
          {mensaje && <p className="mt-4 text-sm text-success-600 dark:text-success-500">{mensaje}</p>}

          {enlace && (
            <div className="mt-4 rounded-xl border border-primary-500/30 bg-primary-500/5 p-4">
              <p className="text-[12px] font-semibold text-primary-600 dark:text-primary-100">
                Enlace de acceso para {enlace.email}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={enlace.url}
                  aria-label="Enlace de acceso"
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-lg border border-light-100 bg-white px-2.5 py-2 font-mono text-[12px] text-zinc-900 dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={copiarEnlace}
                  className="h-10 shrink-0 rounded-lg bg-primary-500 px-4 text-[12px] font-semibold text-white hover:bg-primary-600"
                >
                  {copiado ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-body-text">
                Caduca en 48 horas y sirve una sola vez. Compártelo por un medio
                privado: quien lo abra podrá definir la contraseña.
              </p>
            </div>
          )}
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b border-light-100 p-6 dark:border-dark-600 lg:p-7">
            <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              Usuarios del sistema
            </h2>
            <p className="mt-1 text-[12px] text-body-text">{usuarios.length} usuarios registrados</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full xl:min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                  <th className="px-6 py-3 font-semibold lg:px-7">Usuario</th>
                  <th className="hidden xl:table-cell px-4 py-3 font-semibold">Rol</th>
                  <th className="hidden xl:table-cell px-4 py-3 font-semibold">Estado</th>
                  <th className="hidden xl:table-cell px-4 py-3 font-semibold">Comisionista</th>
                  <th className="lg:sticky lg:right-0 lg:z-10 bg-light-50 dark:bg-dark-600 px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-body-text">Cargando…</td></tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="border-t border-light-100 dark:border-dark-600">
                      <td className="px-6 py-3.5 font-medium text-zinc-900 dark:text-white lg:px-7">
                        <span className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full xl:hidden ${u.activo ? "bg-success-500" : "bg-body-text/60"}`} />
                          <span className="truncate">{u.email}</span>
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5">
                        {puedeGestionar(u) ? (
                          <select
                            value={u.rol}
                            onChange={(e) => cambiarRol(u.id, e.target.value)}
                            className="rounded-md border border-light-100 bg-white px-2 py-1 text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                          >
                            {u.rol === "COMISIONISTA" && (
                              <option value="COMISIONISTA">Comisionista</option>
                            )}
                            <option value="SUPERVISOR">Supervisor</option>
                            {(esSuperAdmin || u.rol === "ADMIN") && (
                              <option value="ADMIN">Administrador</option>
                            )}
                            {(esSuperAdmin || u.rol === "SUPER_ADMIN") && (
                              <option value="SUPER_ADMIN">Super admin</option>
                            )}
                            {u.comisionista && u.rol !== "COMISIONISTA" && (
                              <option value="COMISIONISTA">Comisionista</option>
                            )}
                          </select>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${rolClass[u.rol]}`}>
                            {rolLabel[u.rol]}
                          </span>
                        )}
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5">
                        <span className={u.activo ? "text-success-600 dark:text-success-500" : "text-body-text"}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5 text-body-text">{u.comisionista?.nombre ?? "—"}</td>
                      <td className="lg:sticky lg:right-0 lg:z-10 bg-white lg:shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-4 py-3.5">
                        {puedeGestionar(u) && (
                          <div className="flex items-center justify-end gap-1.5">
                            <AccionTabla
                              etiqueta={`Generar enlace de acceso de ${u.email}`}
                              icono="clave"
                              variante="primario"
                              onClick={() => generarEnlace(u)}
                            />
                            <AccionTabla
                              etiqueta={u.activo ? `Desactivar a ${u.email}` : `Activar a ${u.email}`}
                              icono={u.activo ? "desactivar" : "activar"}
                              variante={u.activo ? "peligro" : "exito"}
                              onClick={() => alternarActivo(u)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
