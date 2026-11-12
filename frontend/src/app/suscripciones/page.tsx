"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, getSesion, getToken, type SesionJwt } from "@/lib/api";

type Frecuencia = "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICA";
type Estado = "ACTIVA" | "PAUSADA" | "FINALIZADA";

interface Comisionista {
  id: string;
  nombre: string;
}

interface Suscripcion {
  id: string;
  cliente: string;
  producto: string | null;
  monto: string;
  frecuenciaCobro: Frecuencia;
  comisionTipo: "PORCENTAJE" | "MONTO_FIJO";
  comisionValor: string;
  comisionFrecuencia: Frecuencia;
  inicio: string;
  fin: string | null;
  estado: Estado;
  comisionista: { id: string; nombre: string };
}

const frecuenciaLabel: Record<Frecuencia, string> = {
  MENSUAL: "Mensual",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
  UNICA: "Única",
};

const formatoDinero = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
});

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-body-text/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white";

// Fecha de hoy en formato AAAA-MM-DD.
function fechaHoy(): string {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Suscripciones: clientes que pagan cada cierto tiempo y dejan una comisión
// recurrente. Cada mes se genera sola la comisión que corresponde.
export default function SuscripcionesPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const puedeGestionar = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [comisionistas, setComisionistas] = useState<Comisionista[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{
    id: string;
    accion: "pausar" | "finalizar" | "reactivar";
    cliente: string;
    titulo: string;
    mensaje: string;
    texto: string;
  } | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [comisionistaId, setComisionistaId] = useState("");
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [monto, setMonto] = useState("");
  const [frecuenciaCobro, setFrecuenciaCobro] = useState<Frecuencia>("MENSUAL");
  const [comisionTipo, setComisionTipo] = useState<"PORCENTAJE" | "MONTO_FIJO">("PORCENTAJE");
  const [comisionValor, setComisionValor] = useState("");
  const [comisionFrecuencia, setComisionFrecuencia] = useState<Frecuencia>("MENSUAL");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");

  // Trae las suscripciones según el filtro de estado.
  const cargar = useCallback(async () => {
    const params = new URLSearchParams();
    if (estadoFiltro) params.set("estado", estadoFiltro);
    const [s, c] = await Promise.all([
      apiFetch<Suscripcion[]>(`/suscripciones?${params.toString()}`),
      apiFetch<Comisionista[]>("/comisionistas"),
    ]);
    setSuscripciones(s);
    setComisionistas(c);
    setComisionistaId((actual) => actual || c[0]?.id || "");
  }, [estadoFiltro]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
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
  }, [cargar, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInicio((actual) => actual || fechaHoy());
  }, []);

  function limpiar() {
    setEditandoId(null);
    setCliente("");
    setProducto("");
    setMonto("");
    setComisionValor("");
    setFin("");
    setInicio(fechaHoy());
  }

  // Pone una suscripción en el formulario para editarla.
  function editar(s: Suscripcion) {
    setEditandoId(s.id);
    setComisionistaId(s.comisionista.id);
    setCliente(s.cliente);
    setProducto(s.producto ?? "");
    setMonto(String(Number(s.monto)));
    setFrecuenciaCobro(s.frecuenciaCobro);
    setComisionTipo(s.comisionTipo);
    setComisionValor(String(Number(s.comisionValor)));
    setComisionFrecuencia(s.comisionFrecuencia);
    setInicio(s.inicio.slice(0, 10));
    setFin(s.fin ? s.fin.slice(0, 10) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Crea o actualiza la suscripción.
  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const base = {
        cliente,
        producto: producto || undefined,
        monto,
        frecuenciaCobro,
        comisionTipo,
        comisionValor,
        comisionFrecuencia,
        inicio,
      };
      if (editandoId) {
        await apiFetch(`/suscripciones/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...base, fin: fin || null }),
        });
        setMensaje("Suscripción actualizada");
      } else {
        await apiFetch("/suscripciones", {
          method: "POST",
          body: JSON.stringify({
            ...base,
            comisionistaId,
            ...(fin ? { fin } : {}),
          }),
        });
        setMensaje("Suscripción creada");
      }
      limpiar();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  // Pausa, reactiva o finaliza la suscripción elegida.
  async function cambiarEstado() {
    if (!confirmacion) return;
    setError(null);
    setCambiando(true);
    try {
      await apiFetch(`/suscripciones/${confirmacion.id}/${confirmacion.accion}`, {
        method: "POST",
      });
      setConfirmacion(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setCambiando(false);
    }
  }

  // Pide confirmación antes de pausar, reactivar o finalizar.
  function pedirCambio(
    id: string,
    accion: "pausar" | "finalizar" | "reactivar",
    cliente: string,
  ) {
    setConfirmacion({
      id,
      accion,
      cliente,
      titulo:
        accion === "pausar"
          ? "¿Pausar la suscripción?"
          : accion === "finalizar"
            ? "¿Finalizar la suscripción?"
            : "¿Reactivar la suscripción?",
      mensaje:
        accion === "pausar"
          ? "Dejará de generar comisiones mientras esté pausada."
          : accion === "finalizar"
            ? "Se cerrará definitivamente y no volverá a generar comisiones."
            : "Volverá a generar comisiones recurrentes.",
      texto: accion === "pausar" ? "Pausar" : accion === "finalizar" ? "Finalizar" : "Reactivar",
    });
  }

  return (
    <AppShell titulo="Suscripciones">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
              Ingreso recurrente
            </p>
            <h1 className="mt-3 font-display text-[37px] font-bold leading-none tracking-[-0.4px] text-zinc-900 dark:text-white">
              Suscripciones
            </h1>
            <p className="mt-3 text-[14px] text-body-text">
              Clientes que pagan mes a mes o al año, y la comisión que generan.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm text-body-text">
            <span className="text-[10px] uppercase tracking-[1.2px]">Estado</span>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="rounded-md border border-light-100 bg-white px-3 py-1.5 text-sm dark:border-dark-600 dark:bg-dark-700 dark:text-white"
            >
              <option value="">Todas</option>
              <option value="ACTIVA">Activas</option>
              <option value="PAUSADA">Pausadas</option>
              <option value="FINALIZADA">Finalizadas</option>
            </select>
          </label>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}
        {mensaje && <p className="text-sm text-success-600 dark:text-success-500">{mensaje}</p>}

        {puedeGestionar && (
          <section className="surface p-6 lg:p-7">
            <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              {editandoId ? "Editar suscripción" : "Nueva suscripción"}
            </h2>
            <p className="mt-1 text-[12px] text-body-text">
              Define cómo paga el cliente y cómo gana el comisionista.
            </p>

            <form onSubmit={guardar} className="mt-5 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Comisionista</span>
                <select value={comisionistaId} onChange={(e) => setComisionistaId(e.target.value)} className={inputClass}>
                  {comisionistas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Cliente</span>
                <input required value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ej. Restaurante La Esquina" className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Producto</span>
                <input value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej. Factelec" className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Monto por cobro (₡)</span>
                <input required inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="30000" className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Cada cuánto paga el cliente</span>
                <select value={frecuenciaCobro} onChange={(e) => setFrecuenciaCobro(e.target.value as Frecuencia)} className={inputClass}>
                  {Object.entries(frecuenciaLabel).map(([valor, texto]) => (
                    <option key={valor} value={valor}>{texto}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Inicio</span>
                <input type="date" required value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Fin (opcional)</span>
                <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Tipo de comisión</span>
                <select value={comisionTipo} onChange={(e) => setComisionTipo(e.target.value as "PORCENTAJE" | "MONTO_FIJO")} className={inputClass}>
                  <option value="PORCENTAJE">Porcentaje (%)</option>
                  <option value="MONTO_FIJO">Monto fijo (₡)</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">
                  {comisionTipo === "PORCENTAJE" ? "Porcentaje" : "Monto fijo"}
                </span>
                <input required inputMode="decimal" value={comisionValor} onChange={(e) => setComisionValor(e.target.value)} placeholder={comisionTipo === "PORCENTAJE" ? "10" : "5000"} className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text">Cada cuánto gana la comisión</span>
                <select value={comisionFrecuencia} onChange={(e) => setComisionFrecuencia(e.target.value as Frecuencia)} className={inputClass}>
                  {Object.entries(frecuenciaLabel).map(([valor, texto]) => (
                    <option key={valor} value={valor}>{texto}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <button type="submit" className="h-[46px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600">
                  {editandoId ? "Guardar cambios" : "Crear suscripción"}
                </button>
                {editandoId && (
                  <button type="button" onClick={limpiar} className="h-[46px] rounded-xl border border-light-100 px-4 text-sm font-medium text-body-text dark:border-dark-600">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden surface overflow-hidden">
          <div className="border-b border-light-100 p-6 dark:border-dark-600">
            <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              Suscripciones registradas
            </h2>
            <p className="mt-1 text-[12px] text-body-text">{suscripciones.length} registros</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full xl:min-w-[900px] text-left text-sm">
              <thead className="bg-light-50 text-[10px] uppercase tracking-[1.2px] text-body-text dark:bg-dark-600">
                <tr>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="hidden xl:table-cell px-3 py-3">Comisionista</th>
                  <th className="hidden xl:table-cell px-3 py-3 text-right">Cobro</th>
                  <th className="hidden xl:table-cell px-3 py-3">Comisión</th>
                  <th className="hidden xl:table-cell px-3 py-3">Vigencia</th>
                  <th className="hidden xl:table-cell px-3 py-3">Estado</th>
                  <th className="sticky right-0 z-10 bg-light-50 dark:bg-dark-600 px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-body-text">Cargando…</td></tr>
                ) : suscripciones.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-body-text">Sin suscripciones registradas</td></tr>
                ) : (
                  suscripciones.map((s) => (
                    <tr key={s.id} className="border-t border-light-100 dark:border-dark-600">
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-zinc-900 dark:text-white">{s.cliente}</p>
                        <p className="text-[11px] text-body-text">{s.producto ?? "—"}</p>
                        <p className="mt-0.5 block text-[11px] font-semibold text-zinc-900 dark:text-white xl:hidden">
                          {formatoDinero.format(Number(s.monto))} · {frecuenciaLabel[s.frecuenciaCobro]}
                        </p>
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3.5 text-body-text">{s.comisionista.nombre}</td>
                      <td className="hidden xl:table-cell px-3 py-3.5 text-right">
                        <p className="font-medium text-zinc-900 dark:text-white">{formatoDinero.format(Number(s.monto))}</p>
                        <p className="text-[11px] text-body-text">{frecuenciaLabel[s.frecuenciaCobro]}</p>
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3.5">
                        <p className="text-zinc-900 dark:text-white">
                          {s.comisionTipo === "PORCENTAJE"
                            ? `${Number(s.comisionValor)} %`
                            : formatoDinero.format(Number(s.comisionValor))}
                        </p>
                        <p className="text-[11px] text-body-text">{frecuenciaLabel[s.comisionFrecuencia]}</p>
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3.5 text-[12px] text-body-text">
                        {s.inicio.slice(0, 10)} → {s.fin ? s.fin.slice(0, 10) : "indefinida"}
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          s.estado === "ACTIVA"
                            ? "bg-success-500/10 text-success-600 dark:text-success-500"
                            : s.estado === "PAUSADA"
                              ? "bg-warning-500/10 text-warning-600"
                              : "bg-light-100 text-body-text dark:bg-dark-600"
                        }`}>
                          {s.estado === "ACTIVA" ? "Activa" : s.estado === "PAUSADA" ? "Pausada" : "Finalizada"}
                        </span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-6 py-3.5 text-right">
                        {puedeGestionar && s.estado !== "FINALIZADA" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <AccionTabla
                              etiqueta={`Editar suscripción de ${s.cliente}`}
                              icono="editar"
                              variante="primario"
                              onClick={() => editar(s)}
                            />
                            {s.estado === "ACTIVA" ? (
                              <AccionTabla
                                etiqueta={`Pausar suscripción de ${s.cliente}`}
                                icono="pausar"
                                variante="aviso"
                                onClick={() => pedirCambio(s.id, "pausar", s.cliente)}
                              />
                            ) : (
                              <AccionTabla
                                etiqueta={`Reactivar suscripción de ${s.cliente}`}
                                icono="reactivar"
                                variante="exito"
                                onClick={() => pedirCambio(s.id, "reactivar", s.cliente)}
                              />
                            )}
                            <AccionTabla
                              etiqueta={`Finalizar suscripción de ${s.cliente}`}
                              icono="finalizar"
                              variante="peligro"
                              onClick={() => pedirCambio(s.id, "finalizar", s.cliente)}
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
      <ConfirmDialog
        abierto={confirmacion !== null}
        titulo={confirmacion?.titulo ?? ""}
        mensaje={confirmacion?.mensaje ?? ""}
        detalle={confirmacion?.cliente ?? null}
        textoConfirmar={confirmacion?.texto ?? "Confirmar"}
        variante={confirmacion?.accion === "reactivar" ? "primary" : "danger"}
        cargando={cambiando}
        onConfirmar={cambiarEstado}
        onCancelar={() => setConfirmacion(null)}
      />
    </AppShell>
  );
}
