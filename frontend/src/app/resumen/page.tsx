"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { apiFetch, getSesion, getToken } from "@/lib/api";

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

function tituloMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return nombreMes.format(new Date(Date.UTC(anio, numero - 1, 15)));
}

const tarjeta =
  "rounded-2xl border border-light-100 bg-white p-5 shadow-sm dark:border-dark-600 dark:bg-dark-700";

export default function ResumenPage() {
  const router = useRouter();
  const [mes, setMes] = useState("");
  const [data, setData] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const maxDia = Math.max(1, ...(data?.porDia.map((d) => d.monto) ?? [0]));

  return (
    <AppShell titulo="Resumen">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
              Panel del mes
            </p>
            <h1 className="mt-3 font-display text-[37px] font-bold leading-none tracking-[-0.4px] text-zinc-900 dark:text-white">
              Resumen
            </h1>
            <p className="mt-3 text-[14px] text-body-text">
              {mes ? tituloMes(mes) : "Cargando…"} · ventas, comisiones y desempeño del equipo.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm text-body-text">
            <span className="text-[10px] uppercase tracking-[1.2px]">Mes</span>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-md border border-light-100 bg-white px-3 py-1.5 text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white"
            />
          </label>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Monto vendido</p>
            <p className="mt-2 font-display text-[26px] font-bold text-zinc-900 dark:text-white">
              {formatoDinero.format(data?.montoVendido ?? 0)}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisión generada</p>
            <p className="mt-2 font-display text-[26px] font-bold text-primary-600 dark:text-primary-100">
              {formatoDinero.format(data?.totalComision ?? 0)}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Ventas activas</p>
            <p className="mt-2 font-display text-[26px] font-bold text-zinc-900 dark:text-white">
              {data?.totalVentas ?? 0}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisionistas activos</p>
            <p className="mt-2 font-display text-[26px] font-bold text-zinc-900 dark:text-white">
              {data?.comisionistasActivos ?? 0}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisión pendiente</p>
            <p className="mt-2 font-display text-[26px] font-bold text-warning-600">
              {formatoDinero.format(data?.comisionPendiente ?? 0)}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisión pagada</p>
            <p className="mt-2 font-display text-[26px] font-bold text-success-600 dark:text-success-500">
              {formatoDinero.format(data?.comisionPagada ?? 0)}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Ingreso recurrente</p>
            <p className="mt-2 font-display text-[26px] font-bold text-zinc-900 dark:text-white">
              {formatoDinero.format(data?.ingresoRecurrente ?? 0)}
            </p>
          </div>
          <div className={tarjeta}>
            <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisión recurrente</p>
            <p className="mt-2 font-display text-[26px] font-bold text-primary-600 dark:text-primary-100">
              {formatoDinero.format(data?.comisionSuscripciones ?? 0)}
            </p>
          </div>
        </div>

        <section className={tarjeta}>
          <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
            Ventas por día
          </h2>
          <p className="mt-1 text-[12px] text-body-text">Monto vendido cada día del mes.</p>
          {cargando ? (
            <p className="mt-4 text-sm text-body-text">Cargando…</p>
          ) : data && data.porDia.length > 0 ? (
            <div className="mt-5 flex h-40 items-end gap-1.5">
              {data.porDia.map((dia) => (
                <div key={dia.fecha} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full max-w-10 rounded-t-md bg-primary-500/80 transition-colors group-hover:bg-primary-500"
                    style={{ height: `${Math.max(4, (dia.monto / maxDia) * 100)}%` }}
                    title={`${dia.fecha}: ${formatoDinero.format(dia.monto)}`}
                  />
                  <span className="mt-1 text-[9px] text-body-text">{dia.fecha.slice(8, 10)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-body-text">Sin ventas registradas en este mes.</p>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-light-100 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-700">
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
                    <tr key={f.id} className="border-t border-light-100 dark:border-dark-600">
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

          <section className="overflow-hidden rounded-2xl border border-light-100 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-700">
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
                    <tr key={f.id} className="border-t border-light-100 dark:border-dark-600">
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
