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

interface Resumen {
  mes: string;
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

function mesActual(): string {
  const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, "0")}`;
}

const nombreMes = new Intl.DateTimeFormat("es-CR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function rangoMes(mes: string): { desde: string; hasta: string } {
  const [anio, numero] = mes.split("-").map(Number);
  const dias = new Date(anio, numero, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(dias).padStart(2, "0")}` };
}

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
};

function IconoKpi({ tipo }: { tipo: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
      {trazosKpi[tipo].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default function ResumenPage() {
  const router = useRouter();
  const [mes, setMes] = useState("");
  const [data, setData] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <section className="hero-panel p-6 lg:p-8">
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
                Panel del mes
              </p>
              <h1 className="mt-2 font-display text-[34px] font-bold leading-none tracking-[-0.5px] text-white">
                Resumen
              </h1>
              <p className="mt-3 max-w-xl text-[14px] text-white/70">
                {mes ? tituloMes(mes) : "Cargando…"} · ventas, comisiones y desempeño del equipo.
              </p>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50">
                  Mes
                </span>
                <input
                  type="month"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none backdrop-blur transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20 [color-scheme:dark]"
                />
              </label>
              <button
                type="button"
                onClick={exportarCsv}
                disabled={exportando || !mes}
                className="h-[38px] rounded-xl border border-white/20 bg-white/10 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                {exportando ? "Exportando…" : "Exportar CSV"}
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
              <p className={`mt-3 font-display text-[25px] font-bold tracking-[-0.3px] ${kpi.color}`}>
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
            <div className="mt-5 flex h-40 items-end gap-1">
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
                  <span className="mt-1 text-[8px] text-body-text">{dia.fecha.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-body-text">Sin ventas registradas en este mes.</p>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="surface overflow-hidden">
            <div className="border-b border-light-100 p-5 dark:border-dark-600">
              <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
                Top comisionistas
              </h2>
              <p className="mt-1 text-[12px] text-body-text">Ordenados por comisión generada.</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-light-50 text-[10px] uppercase tracking-[1.2px] text-body-text dark:bg-dark-600">
                <tr>
                  <th className="px-5 py-2.5">Comisionista</th>
                  <th className="px-3 py-2.5 text-right">Ventas</th>
                  <th className="px-3 py-2.5 text-right">Vendido</th>
                  <th className="px-5 py-2.5 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {data?.porComisionista.length ? (
                  data.porComisionista.map((f) => (
                    <tr key={f.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                      <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{f.nombre}</td>
                      <td className="px-3 py-3 text-right text-body-text">{f.ventas}</td>
                      <td className="px-3 py-3 text-right text-body-text">{formatoDinero.format(f.montoVendido)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-900 dark:text-white">{formatoDinero.format(f.comision)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-body-text">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="surface overflow-hidden">
            <div className="border-b border-light-100 p-5 dark:border-dark-600">
              <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
                Por sucursal
              </h2>
              <p className="mt-1 text-[12px] text-body-text">Ventas y comisión por punto de venta.</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-light-50 text-[10px] uppercase tracking-[1.2px] text-body-text dark:bg-dark-600">
                <tr>
                  <th className="px-5 py-2.5">Sucursal</th>
                  <th className="px-3 py-2.5 text-right">Ventas</th>
                  <th className="px-3 py-2.5 text-right">Vendido</th>
                  <th className="px-5 py-2.5 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {data?.porSucursal.length ? (
                  data.porSucursal.map((f) => (
                    <tr key={f.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                      <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">{f.nombre}</td>
                      <td className="px-3 py-3 text-right text-body-text">{f.ventas}</td>
                      <td className="px-3 py-3 text-right text-body-text">{formatoDinero.format(f.montoVendido)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-zinc-900 dark:text-white">{formatoDinero.format(f.comision)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-body-text">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
