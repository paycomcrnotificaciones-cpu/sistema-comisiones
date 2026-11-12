"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { apiFetch, getSesion, type SesionJwt } from "@/lib/api";

interface Sucursal {
  id: string;
  nombre: string;
}

interface Comisionista {
  id: string;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  sucursal: { id: string; nombre: string } | null;
  usuario: { email: string; activo: boolean } | null;
}

const PAGE_SIZE = 8;

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-body-text/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 dark:border-dark-600 dark:bg-dark-600 dark:text-white";

// Saca las iniciales del nombre para el círculo del avatar.
function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// Listado del equipo. Muestra a cada comisionista con su sucursal, su estado
// y un botón para abrir su libreta. Permite buscar y filtrar por sucursal.
export default function ComisionistasPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esComisionista = sesion?.rol === "COMISIONISTA";
  const esSupervisor = sesion?.rol === "SUPERVISOR";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [comisionistas, setComisionistas] = useState<Comisionista[]>([]);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (esComisionista) {
      const propio = getSesion()?.comisionistaId;
      router.replace(propio ? `/comisionistas/${propio}` : "/resumen");
      return;
    }
    let activo = true;
    (async () => {
      try {
        const [s, c] = await Promise.all([
          apiFetch<Sucursal[]>("/sucursales"),
          apiFetch<Comisionista[]>("/comisionistas"),
        ]);
        if (!activo) return;
        setSucursales(s);
        setComisionistas(c);
        setSucursalId((actual) => actual || s[0]?.id || "");
        setCargando(false);
      } catch (err) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
        setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [esComisionista, router]);

  // Da de alta un comisionista y, si se indica, su acceso al sistema.
  async function crear(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch("/comisionistas", {
        method: "POST",
        body: JSON.stringify({
          nombre,
          codigo: codigo || undefined,
          sucursalId,
          email: email || undefined,
          password: password || undefined,
        }),
      });
      setNombre("");
      setCodigo("");
      setEmail("");
      setPassword("");
      const c = await apiFetch<Comisionista[]>("/comisionistas");
      setComisionistas(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return comisionistas;
    return comisionistas.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.codigo ?? "").toLowerCase().includes(q) ||
        (c.sucursal?.nombre ?? "").toLowerCase().includes(q),
    );
  }, [comisionistas, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const visibles = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  const activos = comisionistas.filter((c) => c.activo).length;

  if (esComisionista) return null;

  return (
    <AppShell titulo="Comisionistas">
      <div className="space-y-8">
        <section className="hero-panel p-6 lg:p-7">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
                Equipo comercial
              </p>
              <h1 className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.5px] text-white">
                Comisionistas
              </h1>
              <p className="mt-3 max-w-lg text-[14px] text-white/70">
                Administra tu equipo y mantén sus datos siempre al día.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-brand-cyan-500 ring-1 ring-white/15">
                <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
                  <circle cx="9.5" cy="7.5" r="3.5" />
                  <path d="M17 11l2 2 3-4" />
                </svg>
              </span>
              <div className="min-w-[92px]">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50">Activos</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-white">{activos}</span>
                  <span className="text-[11px] font-medium text-[#7ef0e4]">en total</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!esSupervisor && (
        <section className="surface p-6 lg:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">01</span>
              <div>
                <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                  Nuevo comisionista
                </h2>
                <p className="mt-1 text-[12px] text-body-text">Completa los datos para añadirlo al equipo.</p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text/70">Email y contraseña crean el acceso del comisionista</p>
          </div>

          <form onSubmit={crear} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Nombre completo</span>
              <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Laura Méndez" className={inputClass} />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Código</span>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="C-005" className={`${inputClass} font-mono`} />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Sucursal</span>
              <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={inputClass}>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Email de acceso</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="laura@empresa.com" className={inputClass} />
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Contraseña</span>
              <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={inputClass} />
            </label>

            <button
              type="submit"
              className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(66,84,186,0.25)] transition-colors hover:bg-primary-600"
            >
              <span className="text-lg leading-none">+</span>
              Agregar comisionista
            </button>
          </form>

          {error && <p className="mt-4 text-sm text-danger-500">{error}</p>}
        </section>
        )}

        <section className="surface overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 p-6 lg:p-7">
            <div className="flex gap-3">
              <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">02</span>
              <div>
                <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                  Equipo actual
                </h2>
                <p className="mt-1 text-[12px] text-body-text">
                  {comisionistas.length} comisionistas registrados
                </p>
              </div>
            </div>

            <label className="relative block w-full sm:w-[220px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-text">
                <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </span>
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar comisionista..."
                className={`${inputClass} pl-9`}
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full lg:min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                  <th className="px-6 py-3 font-semibold lg:px-7">Comisionista</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-semibold">Código</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-semibold">Sucursal</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-semibold">Estado</th>
                  <th className="sticky right-0 z-10 bg-light-50 dark:bg-dark-600 px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-body-text">Cargando…</td>
                  </tr>
                ) : visibles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-body-text">
                      {busqueda ? "Sin resultados para esa búsqueda" : "Sin comisionistas registrados"}
                    </td>
                  </tr>
                ) : (
                  visibles.map((c) => (
                    <tr key={c.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                      <td className="px-6 py-3.5 lg:px-7">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700 dark:bg-primary-500/20 dark:text-primary-100">
                            {iniciales(c.nombre)}
                          </span>
                          <span className="flex flex-col">
                            <Link href={`/comisionistas/${c.id}`} className="font-medium text-zinc-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-100">
                              {c.nombre}
                            </Link>
                            <span className="flex items-center gap-1.5 text-[11px] text-body-text">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full lg:hidden ${c.activo ? "bg-success-500" : "bg-body-text/60"}`} />
                              {c.usuario?.email ?? "Sin acceso"}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3.5">
                        <span className="rounded-md bg-light-50 px-2 py-1 font-mono text-[11px] text-body-text dark:bg-dark-600">
                          {c.codigo ?? "—"}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3.5 text-body-text">{c.sucursal?.nombre ?? "—"}</td>
                      <td className="hidden lg:table-cell px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            c.activo
                              ? "bg-success-500/10 text-success-600 dark:text-success-500"
                              : "bg-light-100 text-body-text dark:bg-dark-600"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${c.activo ? "bg-success-500" : "bg-body-text/60"}`} />
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end">
                          <AccionTabla
                            href={`/comisionistas/${c.id}`}
                            etiqueta={`${esSupervisor ? "Ver" : "Editar"} perfil de ${c.nombre}`}
                            icono={esSupervisor ? "ver" : "editar"}
                            variante="primario"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-light-100 px-6 py-4 dark:border-dark-600 lg:px-7">
            <span className="text-[11px] text-body-text">
              Mostrando {visibles.length} de {filtrados.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                className="rounded-lg border border-light-100 px-3 py-1.5 text-[11px] text-body-text disabled:opacity-40 dark:border-dark-600"
              >
                Anterior
              </button>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500 text-[11px] font-semibold text-white">
                {pagina}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className="rounded-lg border border-light-100 px-3 py-1.5 text-[11px] text-body-text disabled:opacity-40 dark:border-dark-600"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
