"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { apiFetch, descargarArchivo, getSesion, getToken } from "@/lib/api";

interface Fila {
  id: string;
  nombre: string;
  ventas: number;
  montoVendido: number;
  comision: number;
  meta?: number | null;
  avance?: number | null;
  montoAnterior?: number;
  variacion?: number | null;
}

interface Resumen {
  mes: string;
  mesAnterior: string;
  metaGeneral: number | null;
  totalVentas: number;
  montoVendido: number;
  totalComision: number;
  comisionistasActivos: number;
  comisionPendiente: number;
  comisionPagada: number;
  comisionSuscripciones: number;
  ingresoRecurrente: number;
  porComisionista: Fila[];
  porSucursal: Fila[];
  porDia: { fecha: string; monto: number; comision: number }[];
}

const formatoDinero = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
});

// Mes actual en formato AAAA-MM, con la hora de Costa Rica.
function mesActual(): string {
  const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, "0")}`;
}

const nombreMes = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Primer y último día del mes, para los filtros de la pantalla.
function rangoMes(mes: string): { desde: string; hasta: string } {
  const [anio, numero] = mes.split("-").map(Number);
  const dias = new Date(anio, numero, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(dias).padStart(2, "0")}` };
}

// Convierte 2026-11 en "noviembre de 2026" para mostrarlo bonito.
function tituloMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return nombreMes.format(new Date(Date.UTC(anio, numero - 1, 15)));
}

const tarjeta = "surface p-5";

const trazosKpi: Record<string, string[]> = {
  dinero: ["M3 6h18v12H3z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  comision: ["M6 18 18 6", "M7 6h.01", "M17 18h.01"],
  ventas: ["M4 19V5", "M4 19h16", "M7 15l4-5 3 3 5-7"],
  equipo: [
    "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20",
    "M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
    "M17 11l2 2 3-4",
  ],
  pendiente: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 7v5l3 2"],
  pagada: ["M20 6 9 17l-5-5"],
  recurrente: [
    "M17 2l4 4-4 4",
    "M3 11V9a4 4 0 0 1 4-4h14",
    "M7 22l-4-4 4-4",
    "M21 13v2a4 4 0 0 1-4 4H3",
  ],
  grafico: ["M4 19V5", "M4 19h16", "M8 16v-5", "M12 16V8", "M16 16v-9"],
  meta: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10", "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2"],
};

// Icono que acompaña a cada tarjeta de totales.
function IconoKpi({ tipo }: { tipo: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
      {trazosKpi[tipo].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// Panel del mes: tarjetas con los totales, ranking de comisionistas,
// comparación por sucursal y gráfica de ventas por día.
export default function ResumenPage() {
  const router = useRouter();
  const [mes, setMes] = useState("");
  const [data, setData] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Descarga las ventas del mes filtrado en un archivo CSV.
  async function exportarCsv() {
    if (!mes) return;
    setExportando(true);
    try {
      const { desde, hasta } = rangoMes(mes);
      await descargarArchivo(
        `/ventas/export?desde=${desde}&hasta=${hasta}`,
        `ventas-${mes}.csv`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar");
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    if (!mes) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMes(mesActual());
      return;
    }
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    const sesion = getSesion();
    if (sesion?.rol === "COMISIONISTA") {
      router.replace(
        sesion.comisionistaId
          ? `/comisionistas/${sesion.comisionistaId}`
          : "/login",
      );
      return;
    }
    let activo = true;
    (async () => {
      try {
        const resumen = await apiFetch<Resumen>(`/resumen?mes=${mes}`);
        if (!activo) return;
        setData(resumen);
        setError(null);
      } catch (err) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [mes, router]);

  const mapaDias = new Map((data?.porDia ?? []).map((d) => [d.fecha, d]));
  const diasDelMes = mes
    ? new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate()
    : 0;
  const serieDias = mes
    ? Array.from({ length: diasDelMes }, (_, i) => {
        const fecha = `${mes}-${String(i + 1).padStart(2, "0")}`;
        return mapaDias.get(fecha) ?? { fecha, monto: 0, comision: 0 };
      })
    : [];
  const maxDia = Math.max(1, ...serieDias.map((d) => d.monto));

  const kpis = [
    {
      etiqueta: "Monto vendido",
      valor: formatoDinero.format(data?.montoVendido ?? 0),
      tipo: "dinero",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
    },
    {
      etiqueta: "Comisión generada",
      valor: formatoDinero.format(data?.totalComision ?? 0),
      tipo: "comision",
      color: "text-primary-600 dark:text-primary-100",
      fondo: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
    },
    {
      etiqueta: "Ventas activas",
      valor: String(data?.totalVentas ?? 0),
      tipo: "ventas",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-info-500/10 text-info-600",
    },
    {
      etiqueta: "Comisionistas activos",
      valor: String(data?.comisionistasActivos ?? 0),
      tipo: "equipo",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-brand-cyan-500/10 text-brand-cyan-600",
    },
    {
      etiqueta: "Comisión pendiente",
      valor: formatoDinero.format(data?.comisionPendiente ?? 0),
      tipo: "pendiente",
      color: "text-warning-600",
      fondo: "bg-warning-500/15 text-warning-600",
    },
    {
      etiqueta: "Comisión pagada",
      valor: formatoDinero.format(data?.comisionPagada ?? 0),
      tipo: "pagada",
      color: "text-success-600 dark:text-success-500",
      fondo: "bg-success-500/10 text-success-600 dark:text-success-500",
    },
    {
      etiqueta: "Ingreso recurrente",
      valor: formatoDinero.format(data?.ingresoRecurrente ?? 0),
      tipo: "recurrente",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-secondary-500/10 text-secondary-600",
    },
    {
      etiqueta: "Meta general",
      valor: data?.metaGeneral
        ? formatoDinero.format(data.metaGeneral)
        : "Sin meta",
      tipo: "meta",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
    },
    {
      etiqueta: "Comisión recurrente",
      valor: formatoDinero.format(data?.comisionSuscripciones ?? 0),
      tipo: "grafico",
      color: "text-primary-600 dark:text-primary-100",
      fondo: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
    },
  ];

  return (
    <AppShell titulo="Resumen">
      <div className="space-y-8">
        <section className="hero-panel p-5 sm:p-6 lg:p-8">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
                Panel del mes
              </p>
              <h1 className="mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.5px] text-white sm:text-[34px]">
                Resumen
              </h1>
              <p className="mt-3 max-w-xl text-[14px] text-white/70">
                {mes ? tituloMes(mes) : "Cargando…"} · ventas, comisiones y desempeño del equipo.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
              <label className="flex w-full flex-col gap-1.5 text-sm sm:w-auto">
                <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50">
                  Mes
                </span>
                <input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none sm:w-auto backdrop-blur transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 [color-scheme:dark]"
                />
              </label>
              <button
                type="button"
                onClick={exportarCsv}
                disabled={exportando || !mes}
                className="h-[38px] w-full rounded-xl border border-white/20 bg-white/10 px-4 text-[13px] font-semibold text-white sm:w-auto transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                {exportando ? "Exportando…" : "Exportar"}
              </button>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.etiqueta} className={`${tarjeta} surface-hover`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[1.4px] text-body-text">
                  {kpi.etiqueta}
                </p>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kpi.fondo}`}>
                  <IconoKpi tipo={kpi.tipo} />
                </span>
              </div>
              <p className={`mt-3 font-display text-[22px] font-bold tracking-[-0.3px] sm:text-[25px] ${kpi.color}`}>
                {kpi.valor}
              </p>
            </div>
          ))}
        </div>

        <section className="surface p-6">
          <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
            Ventas por día
          </h2>
          <p className="mt-1 text-[12px] text-body-text">Monto vendido cada día del mes.</p>
          {cargando ? (
            <p className="mt-4 text-sm text-body-text">Cargando…</p>
          ) : serieDias.length > 0 ? (
            <div className="mt-5 flex h-36 items-end gap-[2px] sm:h-40 sm:gap-1">
              {serieDias.map((dia) => (
                <div key={dia.fecha} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className={
                      dia.monto > 0
                        ? "w-full max-w-8 rounded-t-md bg-[linear-gradient(180deg,var(--color-brand-cyan-500),var(--color-primary-500))] opacity-85 transition-all group-hover:opacity-100 group-hover:shadow-[0_0_18px_rgba(74,196,243,0.35)]"
                        : "w-full max-w-8 rounded-t-sm bg-light-100 dark:bg-dark-600"
                    }
                    style={{ height: dia.monto > 0 ? `${Math.max(6, (dia.monto / maxDia) * 140)}px` : "2px" }}
                    title={`${dia.fecha}: ${formatoDinero.format(dia.monto)}`}
                  />
                  <span className="mt-1 hidden text-[8px] text-body-text sm:block">{dia.fecha.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-body-text">Sin ventas registradas en este mes.</p>
          )}
        </section>

        <div className="grid gap-6 2xl:grid-cols-2">
          <section className="surface min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-light-100 p-4 dark:border-dark-600 sm:p-5">
              <div className="min-w-0">
                <h2 className="font-display text-[17px] font-bold text-zinc-900 dark:text-white sm:text-[18px]">
                  Top comisionistas
                </h2>
                <p className="mt-1 text-[12px] text-body-text">Ordenados por comisión generada.</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-100">
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 21h8M12 17v4" />
                  <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
                  <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
                </svg>
              </span>
            </div>

            <div className="divide-y divide-light-100 dark:divide-dark-600">
              {data?.porComisionista.length ? (
                data.porComisionista.map((f, indice) => {
                  const avance = f.avance ?? null;
                  const meta = f.meta ?? null;
                  const colorPuesto =
                    indice === 0
                      ? "bg-primary-500 text-white"
                      : indice === 1
                        ? "bg-brand-cyan-500/20 text-brand-cyan-600 dark:text-brand-cyan-500"
                        : "bg-light-100 text-body-text dark:bg-dark-600";
                  return (
                    <div
                      key={f.id}
                      className="px-4 py-4 transition-colors hover:bg-light-50/70 dark:hover:bg-dark-600/40 sm:px-5"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${colorPuesto}`}>
                          {indice + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-white">
                            {f.nombre}
                          </p>
                          <p className="text-[11px] text-body-text">
                            {f.ventas} {f.ventas === 1 ? "venta" : "ventas"} ·{" "}
                            {formatoDinero.format(f.montoVendido)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-body-text">
                            Comisión
                          </p>
                          <p className="text-[14px] font-bold text-zinc-900 dark:text-white">
                            {formatoDinero.format(f.comision)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-light-100 dark:bg-dark-600">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-cyan-500),var(--color-primary-500))]"
                            style={{ width: `${Math.min(100, Math.max(0, avance ?? 0))}%` }}
                          />
                        </div>
                        <span
                          className={`w-12 shrink-0 text-right text-[11px] font-semibold ${
                            avance !== null && avance >= 100
                              ? "text-success-600 dark:text-success-500"
                              : "text-body-text"
                          }`}
                        >
                          {avance !== null ? `${avance}%` : "—"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-body-text">
                        {meta ? `Meta ${formatoDinero.format(meta)}` : "Sin meta asignada"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-8 text-center text-sm text-body-text">Sin datos</p>
              )}
            </div>
          </section>

          <section className="surface min-w-0 overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-light-100 p-4 dark:border-dark-600 sm:p-5">
              <div className="min-w-0">
                <h2 className="font-display text-[17px] font-bold text-zinc-900 dark:text-white sm:text-[18px]">
                  Por sucursal
                </h2>
                <p className="mt-1 text-[12px] text-body-text">
                  Ventas por punto de venta frente al mes anterior.
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cyan-500/10 text-brand-cyan-600 dark:text-brand-cyan-500">
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 21V8l8-4 8 4v13" />
                  <path d="M9 21v-5h6v5" />
                </svg>
              </span>
            </div>

            <div className="divide-y divide-light-100 dark:divide-dark-600">
              {data?.porSucursal.length ? (
                data.porSucursal.map((f) => {
                  const variacion = f.variacion ?? null;
                  return (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-light-50/70 dark:hover:bg-dark-600/40 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-zinc-900 dark:text-white">
                          {f.nombre}
                        </p>
                        <p className="text-[11px] text-body-text">
                          {f.ventas} {f.ventas === 1 ? "venta" : "ventas"} · mes anterior{" "}
                          {formatoDinero.format(f.montoAnterior ?? 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-body-text">
                          Vendido
                        </p>
                        <p className="text-[14px] font-bold text-zinc-900 dark:text-white">
                          {formatoDinero.format(f.montoVendido)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          variacion === null
                            ? "bg-light-100 text-body-text dark:bg-dark-600"
                            : variacion > 0
                              ? "bg-success-500/10 text-success-600 dark:text-success-500"
                              : variacion < 0
                                ? "bg-danger-500/10 text-danger-500"
                                : "bg-light-100 text-body-text dark:bg-dark-600"
                        }`}
                      >
                        {variacion === null ? "—" : `${variacion > 0 ? "▲ +" : ""}${variacion}%`}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-8 text-center text-sm text-body-text">Sin datos</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
