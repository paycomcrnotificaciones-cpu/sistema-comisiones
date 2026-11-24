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
}

interface PorVencer {
  id: string;
  cliente: string;
  fin: string | null;
  comisionista: { nombre: string } | null;
}

interface Resumen {
  mes: string;
  mesAnterior: string;
  totalVentas: number;
  montoVendido: number;
  totalComision: number;
  comisionistasActivos: number;
  comisionPendiente: number;
  comisionPagada: number;
  comisionSuscripciones: number;
  ingresoRecurrente: number;
  porComisionista: Fila[];
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
  meta: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
    "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
    "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  ],
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

// Panel del mes: totales, resumen del mes y ranking de comisionistas.
export default function ResumenPage() {
  const router = useRouter();
  const [mes, setMes] = useState("");
  const [data, setData] = useState<Resumen | null>(null);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [porVencer, setPorVencer] = useState<PorVencer[]>([]);

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
        sesion.comisionistaId ? `/comisionistas/${sesion.comisionistaId}` : "/login",
      );
      return;
    }
    let activo = true;
    (async () => {
      try {
        const [resumen, vencen] = await Promise.all([
          apiFetch<Resumen>(`/resumen?mes=${mes}`),
          apiFetch<PorVencer[]>("/suscripciones/por-vencer?dias=7"),
        ]);
        if (!activo) return;
        setData(resumen);
        setPorVencer(vencen);
        setError(null);
      } catch (err) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
      }
    })();
    return () => {
      activo = false;
    };
  }, [mes, router]);

  const kpis = [
    {
      etiqueta: "Monto vendido",
      detalle: "Total facturado en ventas este mes",
      valor: formatoDinero.format(data?.montoVendido ?? 0),
      tipo: "dinero",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
    },
    {
      etiqueta: "Comisión generada",
      detalle: "Comisión de ventas + comisión de suscripciones",
      valor: formatoDinero.format(data?.totalComision ?? 0),
      tipo: "comision",
      color: "text-primary-600 dark:text-primary-100",
      fondo: "bg-primary-500/10 text-primary-600 dark:text-primary-100",
    },
    {
      etiqueta: "Ventas activas",
      detalle: "Ventas del mes, sin las anuladas",
      valor: String(data?.totalVentas ?? 0),
      tipo: "ventas",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-info-500/10 text-info-600",
    },
    {
      etiqueta: "Comisionistas activos",
      detalle: "Fichas activas hoy (no depende del mes)",
      valor: String(data?.comisionistasActivos ?? 0),
      tipo: "equipo",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-brand-cyan-500/10 text-brand-cyan-600",
    },
    {
      etiqueta: "Comisión pendiente",
      detalle: "Generado y todavía sin pagar",
      valor: formatoDinero.format(data?.comisionPendiente ?? 0),
      tipo: "pendiente",
      color: "text-warning-600",
      fondo: "bg-warning-500/15 text-warning-600",
    },
    {
      etiqueta: "Comisión pagada",
      detalle: "Liquidaciones pagadas de este mes",
      valor: formatoDinero.format(data?.comisionPagada ?? 0),
      tipo: "pagada",
      color: "text-success-600 dark:text-success-500",
      fondo: "bg-success-500/10 text-success-600 dark:text-success-500",
    },
    {
      etiqueta: "Ingreso recurrente",
      detalle: "Facturación de las suscripciones",
      valor: formatoDinero.format(data?.ingresoRecurrente ?? 0),
      tipo: "recurrente",
      color: "text-zinc-900 dark:text-white",
      fondo: "bg-secondary-500/10 text-secondary-600",
    },
    {
      etiqueta: "Comisión recurrente",
      detalle: "Comisión que generan las suscripciones",
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

        {porVencer.length > 0 && (
          <section className="rounded-2xl border border-warning-500/40 bg-warning-500/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-500/20 text-warning-600">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-warning-600">
                  {porVencer.length === 1
                    ? "1 suscripción vence en los próximos 7 días"
                    : `${porVencer.length} suscripciones vencen en los próximos 7 días`}
                </p>
                <ul className="mt-2 space-y-1 text-[12px] text-body-text">
                  {porVencer.map((v) => (
                    <li key={v.id}>
                      <span className="font-medium text-zinc-900 dark:text-white">{v.cliente}</span>
                      {v.comisionista ? ` · ${v.comisionista.nombre}` : ""} · vence el{" "}
                      {v.fin?.slice(0, 10)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

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
              <p className="mt-2 text-[11px] leading-relaxed text-body-text">
                {kpi.detalle}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[11px] leading-relaxed text-body-text">
          <strong className="font-semibold text-zinc-900 dark:text-white">Cómo leer las tarjetas:</strong>{" "}
          todas se calculan con el mes elegido, excepto «Comisionistas activos», que muestra el estado de hoy.
          Comisión pendiente + Comisión pagada = Comisión generada.
        </p>

        <section className="rounded-2xl bg-[linear-gradient(135deg,#16224a_0%,#2f3f8f_60%,#4254ba_100%)] p-5 shadow-[0_18px_40px_-24px_rgba(10,18,38,0.7)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50">
                Resumen del mes
              </p>
              <p className="mt-1 font-display text-[28px] font-bold leading-tight text-white">
                {formatoDinero.format(data?.montoVendido ?? 0)}
              </p>
              <p className="mt-1 text-[12px] text-white/60">
                {data
                  ? `${data.totalVentas} ventas · ${formatoDinero.format(data.totalComision)} en comisión`
                  : "Sin movimientos aún"}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(74,196,243,1),rgba(255,255,255,0.9))]"
                  style={{
                    width: `${
                      data && data.montoVendido > 0
                        ? Math.min(100, (data.totalComision / data.montoVendido) * 100 * 4)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-right text-[10px] uppercase tracking-[1.2px] text-white/45">
                Comisión sobre ventas
              </p>
            </div>
          </div>
        </section>

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
                const colorPuesto =
                  indice === 0
                    ? "bg-primary-500 text-white"
                    : indice === 1
                      ? "bg-brand-cyan-500/20 text-brand-cyan-600 dark:text-brand-cyan-500"
                      : "bg-light-100 text-body-text dark:bg-dark-600";
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-light-50/70 dark:hover:bg-dark-600/40 sm:px-5"
                  >
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
                );
              })
            ) : (
              <p className="px-5 py-8 text-center text-sm text-body-text">Sin datos</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
