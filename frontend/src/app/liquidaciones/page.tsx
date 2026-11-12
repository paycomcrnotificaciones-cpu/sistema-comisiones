"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, getSesion, getToken, type SesionJwt } from "@/lib/api";

interface Comisionista {
  id: string;
  nombre: string;
}

interface Liquidacion {
  id: string;
  periodo: string;
  estado: "BORRADOR" | "PAGADA";
  comisionTotal: string;
  ventasCount: number;
  nota: string | null;
  creadaEn: string;
  pagadaEn: string | null;
  metodoPago: MetodoPago | null;
  comisionista: { id: string; nombre: string };
}

interface VentaLiquidada {
  id: string;
  fecha: string;
  producto: string | null;
  neto: string;
  comisionMonto: string;
  sucursal: { nombre: string };
}

interface ComisionSuscripcion {
  id: string;
  periodo: string;
  base: string;
  monto: string;
  suscripcion: { cliente: string; producto: string | null };
}

interface Detalle extends Liquidacion {
  ventas: VentaLiquidada[];
  comisiones: ComisionSuscripcion[];
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

const inputClass =
  "rounded-md border border-light-100 bg-white px-3 py-1.5 text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white";

type MetodoPago = "EFECTIVO" | "SINPE" | "TRANSFERENCIA" | "OTRO";

const metodosPago: { valor: MetodoPago; texto: string }[] = [
  { valor: "EFECTIVO", texto: "Efectivo" },
  { valor: "SINPE", texto: "SINPE Móvil" },
  { valor: "TRANSFERENCIA", texto: "Transferencia" },
  { valor: "OTRO", texto: "Otro" },
];

// Liquidaciones: cerrar el mes y registrar el pago al comisionista.
// Desde aquí se genera la liquidación, se marca como pagada o se anula.
export default function LiquidacionesPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const puedeGestionar = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [mes, setMes] = useState("");
  const [estado, setEstado] = useState("");
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [comisionistas, setComisionistas] = useState<Comisionista[]>([]);
  const [comisionistaId, setComisionistaId] = useState("");
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pagoId, setPagoId] = useState<string | null>(null);
  const [liqAnular, setLiqAnular] = useState<Liquidacion | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [notaPago, setNotaPago] = useState("");
  const [pagando, setPagando] = useState(false);

  // Carga las liquidaciones que cumplen el filtro de mes y estado.
  const cargar = useCallback(async () => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", mes);
    if (estado) params.set("estado", estado);
    const [lista, gente] = await Promise.all([
      apiFetch<Liquidacion[]>(`/liquidaciones?${params.toString()}`),
      apiFetch<Comisionista[]>("/comisionistas"),
    ]);
    setLiquidaciones(lista);
    setComisionistas(gente);
    setComisionistaId((actual) => actual || gente[0]?.id || "");
  }, [mes, estado]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (sesion?.rol === "COMISIONISTA") {
      router.replace(
        sesion.comisionistaId
          ? `/comisionistas/${sesion.comisionistaId}`
          : "/login",
      );
      return;
    }
    if (!mes) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMes(mesActual());
      return;
    }
    let activo = true;
    (async () => {
      try {
        await cargar();
        if (activo) setError(null);
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar, mes, router, sesion?.rol, sesion?.comisionistaId]);

  // Genera la liquidación de un comisionista para el mes elegido.
  async function generar() {
    if (!comisionistaId) return;
    setError(null);
    setMensaje(null);
    setTrabajando(true);
    try {
      await apiFetch("/liquidaciones", {
        method: "POST",
        body: JSON.stringify({ comisionistaId, mes }),
      });
      setMensaje("Borrador generado con las ventas pendientes del mes");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setTrabajando(false);
    }
  }

  // Genera de una vez la liquidación de todos los comisionistas del mes.
  async function generarTodos() {
    setError(null);
    setMensaje(null);
    setTrabajando(true);
    try {
      const resumen = await apiFetch<{ porComisionista: { id: string }[] }>(
        `/resumen?mes=${mes}`,
      );
      let creadas = 0;
      for (const fila of resumen.porComisionista) {
        try {
          await apiFetch("/liquidaciones", {
            method: "POST",
            body: JSON.stringify({ comisionistaId: fila.id, mes }),
          });
          creadas += 1;
        } catch {
          // Ya existía una liquidación para ese comisionista.
        }
      }
      setMensaje(
        creadas > 0
          ? `Se generaron ${creadas} borradores`
          : "No hay ventas pendientes por liquidar",
      );
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setTrabajando(false);
    }
  }

  // Marca la liquidación como pagada y guarda el método de pago.
  async function pagar(event: React.FormEvent) {
    event.preventDefault();
    if (!pagoId) return;
    setError(null);
    setPagando(true);
    try {
      await apiFetch(`/liquidaciones/${pagoId}/pagar`, {
        method: "POST",
        body: JSON.stringify({ metodoPago, ...(notaPago.trim() ? { nota: notaPago.trim() } : {}) }),
      });
      setPagoId(null);
      setNotaPago("");
      setMetodoPago("EFECTIVO");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al pagar");
    } finally {
      setPagando(false);
    }
  }

  // Anula una liquidación sin pagar y devuelve sus ventas a pendientes.
  async function anular() {
    if (!liqAnular) return;
    setError(null);
    setAnulando(true);
    try {
      await apiFetch(`/liquidaciones/${liqAnular.id}/anular`, { method: "POST" });
      setLiqAnular(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al anular");
    } finally {
      setAnulando(false);
    }
  }

  // Abre el detalle con las ventas y comisiones que incluye la liquidación.
  async function verDetalle(id: string) {
    if (abierta === id) {
      setAbierta(null);
      setDetalle(null);
      return;
    }
    setAbierta(id);
    setDetalle(null);
    try {
      const data = await apiFetch<Detalle>(`/liquidaciones/${id}`);
      setDetalle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el detalle");
    }
  }

  return (
    <AppShell titulo="Liquidaciones">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
              Pagos de comisión
            </p>
            <h1 className="mt-3 font-display text-[37px] font-bold leading-none tracking-[-0.4px] text-zinc-900 dark:text-white">
              Liquidaciones
            </h1>
            <p className="mt-3 text-[14px] text-body-text">
              Cierra el mes, revisa la comisión y márcala como pagada.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 text-sm text-body-text">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[1.2px]">Mes</span>
              <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[1.2px]">Estado</span>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputClass}>
                <option value="">Todos</option>
                <option value="BORRADOR">Borradores</option>
                <option value="PAGADA">Pagadas</option>
              </select>
            </label>
            {puedeGestionar && (
              <button
                type="button"
                onClick={generarTodos}
                disabled={trabajando}
                className="h-[36px] rounded-md bg-primary-500 px-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
              >
                Generar borradores del mes
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}
        {mensaje && <p className="text-sm text-success-600 dark:text-success-500">{mensaje}</p>}

        {puedeGestionar && (
          <section className="surface p-5">
            <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
              Generar borrador individual
            </h2>
            <p className="mt-1 text-[12px] text-body-text">
              Incluye las ventas activas del mes que aún no están liquidadas.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[10px] uppercase tracking-[1.2px] text-body-text">Comisionista</span>
                <select value={comisionistaId} onChange={(e) => setComisionistaId(e.target.value)} className={`${inputClass} min-w-[200px]`}>
                  {comisionistas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={generar}
                disabled={trabajando || !comisionistaId}
                className="h-[36px] rounded-md border border-primary-500 px-3 text-sm font-semibold text-primary-600 hover:bg-primary-500 hover:text-white disabled:opacity-60 dark:text-primary-100"
              >
                Generar borrador
              </button>
            </div>
          </section>
        )}

        <section className="overflow-hidden surface overflow-hidden">
          <div className="border-b border-light-100 p-5 dark:border-dark-600">
            <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
              Liquidaciones del período
            </h2>
            <p className="mt-1 text-[12px] text-body-text">{liquidaciones.length} registros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full xl:min-w-[820px] text-left text-sm">
              <thead className="bg-light-50 text-[10px] uppercase tracking-[1.2px] text-body-text dark:bg-dark-600">
                <tr>
                  <th className="px-5 py-3">Comisionista</th>
                  <th className="hidden xl:table-cell px-3 py-3">Período</th>
                  <th className="hidden xl:table-cell px-3 py-3 text-right">Ventas</th>
                  <th className="hidden xl:table-cell px-3 py-3 text-right">Comisión</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="hidden xl:table-cell px-3 py-3">Pago</th>
                  <th className="sticky right-0 z-10 bg-light-50 dark:bg-dark-600 px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-body-text">Cargando…</td></tr>
                ) : liquidaciones.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-body-text">Sin liquidaciones en este período</td></tr>
                ) : (
                  liquidaciones.map((l) => (
                    <Fragment key={l.id}>
                      <tr className="border-t border-light-100 dark:border-dark-600">
                        <td className="px-3 py-3 font-medium text-zinc-900 dark:text-white sm:px-5">
                          {l.comisionista.nombre}
                          <span className="mt-0.5 block text-[11px] font-semibold text-body-text xl:hidden">
                            {formatoDinero.format(Number(l.comisionTotal))} · {l.periodo}
                          </span>
                        </td>
                        <td className="hidden xl:table-cell px-3 py-3 text-body-text">{l.periodo}</td>
                        <td className="hidden xl:table-cell px-3 py-3 text-right text-body-text">{l.ventasCount}</td>
                        <td className="hidden xl:table-cell px-3 py-3 text-right font-semibold text-zinc-900 dark:text-white">
                          {formatoDinero.format(Number(l.comisionTotal))}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            l.estado === "PAGADA"
                              ? "bg-success-500/10 text-success-600 dark:text-success-500"
                              : "bg-warning-500/10 text-warning-600"
                          }`}>
                            {l.estado === "PAGADA" ? "Pagada" : "Borrador"}
                          </span>
                        </td>
                        <td className="hidden xl:table-cell px-3 py-3 text-body-text">
                          {l.pagadaEn ? l.pagadaEn.slice(0, 10) : "—"}
                          {l.metodoPago && (
                            <span className="ml-1.5 text-[11px] text-body-text/80">
                              · {metodosPago.find((m) => m.valor === l.metodoPago)?.texto ?? l.metodoPago}
                            </span>
                          )}
                        </td>
                        <td className="sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-3 py-3 text-right sm:px-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <AccionTabla
                              etiqueta={`${abierta === l.id ? "Ocultar" : "Ver"} detalle de ${l.comisionista.nombre}`}
                              icono="ver"
                              variante="primario"
                              onClick={() => verDetalle(l.id)}
                            />
                            {puedeGestionar && l.estado === "BORRADOR" && (
                              <>
                                <AccionTabla
                                  etiqueta={`Pagar a ${l.comisionista.nombre}`}
                                  icono="pagar"
                                  variante="exito"
                                  onClick={() => setPagoId(l.id)}
                                />
                                <AccionTabla
                                  etiqueta={`Anular liquidación de ${l.comisionista.nombre}`}
                                  icono="anular"
                                  variante="peligro"
                                  onClick={() => setLiqAnular(l)}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {abierta === l.id && (
                        <tr className="bg-light-50 dark:bg-dark-600">
                          <td colSpan={7} className="px-5 py-4">
                            {!detalle ? (
                              <p className="text-[12px] text-body-text">Cargando ventas…</p>
                            ) : (
                              <div className="space-y-1.5">
                                {detalle.ventas.length > 0 && (
                                  <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-body-text">Ventas</p>
                                )}
                                {detalle.ventas.map((v) => (
                                  <div key={v.id} className="flex flex-wrap justify-between gap-2 text-[12px] text-body-text">
                                    <span>{v.fecha.slice(0, 10)} · {v.producto ?? "Sin producto"} · {v.sucursal.nombre}</span>
                                    <span>Monto {formatoDinero.format(Number(v.neto))} · Comisión {formatoDinero.format(Number(v.comisionMonto))}</span>
                                  </div>
                                ))}
                                {detalle.comisiones.length > 0 && (
                                  <p className="pt-2 text-[10px] font-bold uppercase tracking-[1.2px] text-body-text">Suscripciones</p>
                                )}
                                {detalle.comisiones.map((c) => (
                                  <div key={c.id} className="flex flex-wrap justify-between gap-2 text-[12px] text-body-text">
                                    <span>{c.periodo} · {c.suscripcion.cliente} · {c.suscripcion.producto ?? "Suscripción"}</span>
                                    <span>Base {formatoDinero.format(Number(c.base))} · Comisión {formatoDinero.format(Number(c.monto))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ConfirmDialog
        abierto={liqAnular !== null}
        titulo="¿Anular el borrador?"
        mensaje="Las ventas incluidas volverán a quedar pendientes de liquidar."
        detalle={
          liqAnular
            ? `${liqAnular.comisionista.nombre} · ${liqAnular.periodo} · ${formatoDinero.format(Number(liqAnular.comisionTotal))}`
            : null
        }
        textoConfirmar="Anular borrador"
        cargando={anulando}
        onConfirmar={anular}
        onCancelar={() => setLiqAnular(null)}
      />

      {pagoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={pagar}
            className="w-full max-w-md rounded-2xl border border-light-100 bg-white p-6 shadow-2xl dark:border-dark-600 dark:bg-dark-700"
          >
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
              Confirmar pago
            </p>
            <h2 className="mt-2 font-display text-[22px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              ¿Cómo se pagó la comisión?
            </h2>
            <p className="mt-1 text-[13px] text-body-text">
              La liquidación quedará marcada como pagada con la fecha de hoy.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">
                <span>Método de pago</span>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                  className="w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-zinc-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white"
                >
                  {metodosPago.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.texto}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">
                <span>Nota (opcional)</span>
                <input
                  value={notaPago}
                  onChange={(e) => setNotaPago(e.target.value)}
                  placeholder="Ej. pago parcial acordado"
                  className="w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-zinc-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPagoId(null)}
                className="h-[42px] rounded-xl border border-light-100 px-4 text-sm font-semibold text-body-text dark:border-dark-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pagando}
                className="h-[42px] rounded-xl bg-success-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-success-500 disabled:opacity-60"
              >
                {pagando ? "Registrando…" : "Confirmar pago"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
