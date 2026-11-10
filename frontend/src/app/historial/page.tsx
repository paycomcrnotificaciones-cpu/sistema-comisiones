"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { apiFetch, getSesion, getToken, type SesionJwt } from "@/lib/api";

interface Registro {
  id: string;
  usuario: string;
  rol: string | null;
  accion: string;
  entidad: string | null;
  metodo: string;
  estado: number;
  creadoEn: string;
}

interface Respuesta {
  total: number;
  pagina: number;
  limite: number;
  datos: Registro[];
}

const acciones = [
  "Registró una venta",
  "Editó una venta",
  "Anuló una venta",
  "Generó una liquidación",
  "Pagó una liquidación",
  "Anuló una liquidación",
  "Creó un comisionista",
  "Editó un comisionista",
  "Creó un usuario",
  "Editó un usuario",
  "Fijó una meta",
  "Creó una suscripción",
  "Editó una suscripción",
];

const formatoFecha = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const inputClass =
  "rounded-xl border border-light-100 bg-light-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white";

const PAGE_SIZE = 30;

export default function HistorialPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esGestor = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [accion, setAccion] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const cargar = useCallback(async (pag: number) => {
    const params = new URLSearchParams({ pagina: String(pag), limite: String(PAGE_SIZE) });
    if (accion) params.set("accion", accion);
    if (busqueda.trim()) params.set("q", busqueda.trim());
    const data = await apiFetch<Respuesta>(`/auditoria?${params.toString()}`);
    setRegistros(data.datos);
    setTotal(data.total);
  }, [accion, busqueda]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (!sesion) return;
    if (!esGestor) {
      router.replace("/comisionistas");
      return;
    }
    let activo = true;
    (async () => {
      try {
        await cargar(1);
        if (activo) {
          setPagina(1);
          setCargando(false);
        }
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

  async function irPagina(nueva: number) {
    try {
      await cargar(nueva);
      setPagina(nueva);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!esGestor) return null;

  return (
    <AppShell titulo="Historial">
      <div className="space-y-8">
        <section className="hero-panel p-6 lg:p-7">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
              Control y trazabilidad
            </p>
            <h1 className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.5px] text-white">
              Historial de cambios
            </h1>
            <p className="mt-3 max-w-xl text-[14px] text-white/70">
              Quién registró, editó, pagó o anuló cada cosa dentro del sistema.
            </p>
          </div>
        </section>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <section className="surface overflow-hidden">
          <div className="flex flex-wrap items-end gap-3 border-b border-light-100 p-5 dark:border-dark-600">
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">
              <span>Acción</span>
              <select value={accion} onChange={(e) => setAccion(e.target.value)} className={inputClass}>
                <option value="">Todas</option>
                {acciones.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">
              <span>Buscar</span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Usuario o acción…"
                className={inputClass}
              />
            </label>
            <span className="ml-auto text-[12px] text-body-text">{total} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-light-50 text-[10px] uppercase tracking-[1.2px] text-body-text dark:bg-dark-600">
                <tr>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-3 py-3">Usuario</th>
                  <th className="px-3 py-3">Acción</th>
                  <th className="px-3 py-3">Entidad</th>
                  <th className="px-5 py-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-body-text">Cargando…</td></tr>
                ) : registros.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-body-text">Sin movimientos registrados</td></tr>
                ) : (
                  registros.map((r) => (
                    <tr key={r.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                      <td className="px-5 py-3 whitespace-nowrap text-body-text">{formatoFecha.format(new Date(r.creadoEn))}</td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-zinc-900 dark:text-white">{r.usuario}</span>
                        {r.rol && <span className="ml-1.5 text-[11px] text-body-text">{r.rol}</span>}
                      </td>
                      <td className="px-3 py-3 text-zinc-900 dark:text-white">{r.accion}</td>
                      <td className="px-3 py-3 text-body-text">{r.entidad ?? "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          r.estado < 400
                            ? "bg-success-500/10 text-success-600 dark:text-success-500"
                            : "bg-danger-500/10 text-danger-500"
                        }`}>
                          {r.estado < 400 ? "Correcto" : `Error ${r.estado}`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-light-100 px-5 py-3 dark:border-dark-600">
            <span className="text-[12px] text-body-text">Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-2">
              <button type="button" disabled={pagina <= 1} onClick={() => irPagina(pagina - 1)} className="h-[34px] rounded-lg border border-light-100 px-3 text-[12px] font-semibold text-body-text disabled:opacity-40 dark:border-dark-600">Anterior</button>
              <button type="button" disabled={pagina >= totalPaginas} onClick={() => irPagina(pagina + 1)} className="h-[34px] rounded-lg border border-light-100 px-3 text-[12px] font-semibold text-body-text disabled:opacity-40 dark:border-dark-600">Siguiente</button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
