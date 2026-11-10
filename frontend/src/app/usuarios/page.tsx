"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { apiFetch, getSesion } from "@/lib/api";

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

export default function UsuariosPage() {
  const router = useRouter();
  const sesion = getSesion();
  const esSuperAdmin = sesion?.rol === "SUPER_ADMIN";
  const esGestor = esSuperAdmin || sesion?.rol === "ADMIN";

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("SUPERVISOR");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [claveId, setClaveId] = useState<string | null>(null);
  const [nuevaClave, setNuevaClave] = useState("");

  const cargar = useCallback(async () => {
    const data = await apiFetch<Usuario[]>("/usuarios");
    setUsuarios(data);
  }, []);

  useEffect(() => {
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
  }, [cargar, esGestor, router]);

  async function crear(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await apiFetch("/usuarios", {
        method: "POST",
        body: JSON.stringify({ email, password, rol }),
      });
      setEmail("");
      setPassword("");
      setMensaje("Usuario creado correctamente");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    }
  }

  function puedeGestionar(u: Usuario): boolean {
    if (u.id === sesion?.sub) return false;
    if (esSuperAdmin) return true;
    return u.rol === "SUPERVISOR" || u.rol === "COMISIONISTA";
  }

  async function cambiarRol(id: string, nuevoRol: string) {
    setError(null);
    setMensaje(null);
    try {
      await apiFetch(`/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ rol: nuevoRol }),
      });
      setMensaje("Rol actualizado");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar el rol");
    }
  }

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

  async function cambiarPassword(id: string) {
    setError(null);
    setMensaje(null);
    try {
      await apiFetch(`/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: nuevaClave }),
      });
      setNuevaClave("");
      setClaveId(null);
      setMensaje("Contraseña actualizada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar");
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

        <section className="rounded-2xl border border-light-100 bg-white p-6 shadow-sm dark:border-dark-600 dark:bg-dark-700 lg:p-7">
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

          <form onSubmit={crear} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Correo</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" className={inputClass} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Contraseña</span>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={inputClass} />
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
        </section>

        <section className="rounded-2xl border border-light-100 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-700">
          <div className="border-b border-light-100 p-6 dark:border-dark-600 lg:p-7">
            <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              Usuarios del sistema
            </h2>
            <p className="mt-1 text-[12px] text-body-text">{usuarios.length} usuarios registrados</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                  <th className="px-6 py-3 font-semibold lg:px-7">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Comisionista</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-body-text">Cargando…</td></tr>
                ) : (
                  usuarios.map((u) => (
                    <tr key={u.id} className="border-t border-light-100 dark:border-dark-600">
                      <td className="px-6 py-3.5 font-medium text-zinc-900 dark:text-white lg:px-7">{u.email}</td>
                      <td className="px-4 py-3.5">
                        {puedeGestionar(u) && u.rol !== "COMISIONISTA" ? (
                          <select
                            value={u.rol}
                            onChange={(e) => cambiarRol(u.id, e.target.value)}
                            className="rounded-md border border-light-100 bg-white px-2 py-1 text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white"
                          >
                            <option value="SUPERVISOR">Supervisor</option>
                            {esSuperAdmin && <option value="ADMIN">Administrador</option>}
                            {esSuperAdmin && <option value="SUPER_ADMIN">Super admin</option>}
                          </select>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${rolClass[u.rol]}`}>
                            {rolLabel[u.rol]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={u.activo ? "text-success-600 dark:text-success-500" : "text-body-text"}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-body-text">{u.comisionista?.nombre ?? "—"}</td>
                      <td className="px-4 py-3.5 text-right">
                        {puedeGestionar(u) && (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {claveId === u.id ? (
                              <>
                                <input type="password" minLength={8} value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} placeholder="Nueva contraseña" className="w-36 rounded-md border border-light-100 px-2 py-1 text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white" />
                                <button type="button" onClick={() => cambiarPassword(u.id)} className="rounded-md px-2 py-1 text-[12px] font-semibold text-primary-600">Guardar</button>
                                <button type="button" onClick={() => { setClaveId(null); setNuevaClave(""); }} className="text-[12px] text-body-text">Cancelar</button>
                              </>
                            ) : (
                              <button type="button" onClick={() => setClaveId(u.id)} className="rounded-md px-2 py-1 text-[12px] font-semibold text-body-text hover:bg-light-50 dark:hover:bg-dark-600">Contraseña</button>
                            )}
                            <button type="button" onClick={() => alternarActivo(u)} className={`rounded-md px-2 py-1 text-[12px] font-semibold ${u.activo ? "text-danger-500" : "text-success-600 dark:text-success-500"}`}>
                              {u.activo ? "Desactivar" : "Activar"}
                            </button>
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
