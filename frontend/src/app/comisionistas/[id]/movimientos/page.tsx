"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, getSesion, type SesionJwt } from "@/lib/api";

type Frecuencia = "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICA";
type EstadoSuscripcion = "ACTIVA" | "PAUSADA" | "FINALIZADA";

interface Venta {
  id: string;
  fecha: string;
  documento: string | null;
  cliente: string | null;
  producto: string | null;
  categoria: string | null;
  bruto: string;
  neto: string;
  costo: string;
  comisionTipo: "PORCENTAJE" | "MONTO_FIJO";
  comisionValor: string;
  comisionMonto: string;
  estado: "ACTIVA" | "ANULADA";
  liquidacion: { id: string; estado: "BORRADOR" | "PAGADA" } | null;
}

interface RespuestaVentas {
  total: number;
  datos: Venta[];
  montoVendido: string;
  totalComision: string;
  comisionPendiente: string;
  comisionPagada: string;
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
  estado: EstadoSuscripcion;
}

const frecuenciaLabel: Record<Frecuencia, string> = {
  MENSUAL: "Mensual",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
  UNICA: "Única",
};

const estadoSuscripcionLabel: Record<EstadoSuscripcion, string> = {
  ACTIVA: "Activa",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
};

const formatoDinero = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
});

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-body-text/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/25 dark:border-dark-600 dark:bg-dark-600 dark:text-white";

const labelClass =
  "space-y-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text";

// Fecha de hoy en formato AAAA-MM-DD.
function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

// Suscripciones y ventas del comisionista: aquí se registran y corrigen
// las ventas, y se consultan sus suscripciones. La ficha vive en la
// pantalla anterior (/comisionistas/[id]).
function MovimientosComisionista() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esComisionista = sesion?.rol === "COMISIONISTA";
  const esGestor = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [comisionista, setComisionista] = useState<{ nombre: string } | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [totales, setTotales] = useState({
    montoVendido: 0,
    totalComision: 0,
    comisionPendiente: 0,
    comisionPagada: 0,
  });
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState("");
  const [producto, setProducto] = useState("");
  // Productos que ya tienen una regla activa: se ofrecen como atajo.
  const [productosConRegla, setProductosConRegla] = useState<string[]>([]);
  const [monto, setMonto] = useState("");
  const [comisionTipo, setComisionTipo] = useState<"PORCENTAJE" | "MONTO_FIJO">(
    "PORCENTAJE",
  );
  const [comisionValor, setComisionValor] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [sugerencia, setSugerencia] = useState<{
    nombre: string;
    tipo: "PORCENTAJE" | "MONTO_FIJO";
    valor: number;
    detalle?: { nombre: string; valor: number }[];
  } | null>(null);
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [anulando, setAnulando] = useState(false);

  // Formulario y acciones de suscripciones del comisionista de la URL.
  const [subEditandoId, setSubEditandoId] = useState<string | null>(null);
  const [subCliente, setSubCliente] = useState("");
  const [subProducto, setSubProducto] = useState("");
  const [subMonto, setSubMonto] = useState("");
  const [subFrecuenciaCobro, setSubFrecuenciaCobro] =
    useState<Frecuencia>("MENSUAL");
  const [subComisionTipo, setSubComisionTipo] =
    useState<"PORCENTAJE" | "MONTO_FIJO">("PORCENTAJE");
  const [subComisionValor, setSubComisionValor] = useState("");
  const [subComisionFrecuencia, setSubComisionFrecuencia] =
    useState<Frecuencia>("MENSUAL");
  const [subInicio, setSubInicio] = useState("");
  const [subFin, setSubFin] = useState("");
  const [subGuardando, setSubGuardando] = useState(false);
  const [subMensaje, setSubMensaje] = useState<string | null>(null);
  const formSuscripcionRef = useRef<HTMLElement | null>(null);
  const [subConfirmacion, setSubConfirmacion] = useState<{
    id: string;
    accion: "pausar" | "finalizar" | "reactivar" | "eliminar";
    titulo: string;
    mensaje: string;
    texto: string;
    cliente: string;
  } | null>(null);
  const [subCambiando, setSubCambiando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFecha(fechaHoy());
    setSubInicio(fechaHoy());
  }, []);

  // Carga las ventas del comisionista (últimas 100) y sus suscripciones.
  const cargarVentas = useCallback(async () => {
    const params = new URLSearchParams({
      comisionistaId: id,
      limite: "100",
    });
    const data = await apiFetch<RespuestaVentas>(
      `/ventas?${params.toString()}`,
    );
    setVentas(data.datos);
    setTotales({
      montoVendido: Number(data.montoVendido),
      totalComision: Number(data.totalComision),
      comisionPendiente: Number(data.comisionPendiente),
      comisionPagada: Number(data.comisionPagada),
    });
  }, [id]);

  // Recarga solo las suscripciones del comisionista.
  const cargarSuscripciones = useCallback(async () => {
    const parametros = new URLSearchParams({ comisionistaId: id });
    const s = await apiFetch<Suscripcion[]>(
      `/suscripciones?${parametros.toString()}`,
    );
    setSuscripciones(s);
  }, [id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const parametros = new URLSearchParams({ comisionistaId: id });
        const [c, s, catalogo] = await Promise.all([
          apiFetch<{ nombre: string }>(`/comisionistas/${id}`),
          apiFetch<Suscripcion[]>(`/suscripciones?${parametros.toString()}`),
          apiFetch<string[]>("/reglas/productos?conRegla=1"),
        ]);
        if (!vivo) return;
        setComisionista(c);
        setSuscripciones(s);
        setProductosConRegla(catalogo);
        await cargarVentas();
        if (!vivo) return;
        setCargando(false);
      } catch (err) {
        if (!vivo) return;
        setError(
          err instanceof Error ? err.message : "No se pudo cargar la información",
        );
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id, cargarVentas]);

  // Busca la regla que aplica al producto escrito y sugiere la comisión.
  useEffect(() => {
    const texto = producto.trim();
    if (texto.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSugerencia(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          producto: texto,
          comisionistaId: id,
        });
        const regla = await apiFetch<{
          nombre: string;
          tipo: "PORCENTAJE" | "MONTO_FIJO";
          valor: number;
          detalle?: { nombre: string; valor: number }[];
        } | null>(`/reglas/sugerir?${params.toString()}`);
        setSugerencia(regla);
        if (regla && !editandoId) {
          setComisionTipo(regla.tipo);
          setComisionValor(String(regla.valor));
        }
      } catch {
        setSugerencia(null);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [producto, id, editandoId]);

  // Deja el formulario listo para registrar una venta nueva.
  function resetVenta() {
    setEditandoId(null);
    setFecha(fechaHoy());
    setProducto("");
    setMonto("");
    setComisionTipo("PORCENTAJE");
    setComisionValor("");
    setSugerencia(null);
  }

  // Carga una venta existente en el formulario para corregirla.
  function editarVenta(v: Venta) {
    setEditandoId(v.id);
    setFecha(v.fecha.slice(0, 10));
    setProducto(v.producto ?? "");
    setMonto(v.neto);
    setComisionTipo(v.comisionTipo);
    setComisionValor(v.comisionValor);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Registra o actualiza la venta.
  async function guardarVenta(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!monto || Number(monto) <= 0) {
      setError("Indica el monto de la venta");
      return;
    }
    setGuardandoVenta(true);
    try {
      const cuerpo = {
        comisionistaId: id,
        fecha,
        producto: producto || null,
        bruto: monto,
        neto: monto,
        costo: "0",
        comisionTipo,
        comisionValor: comisionValor || "0",
      };
      if (editandoId) {
        await apiFetch(`/ventas/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify(cuerpo),
        });
      } else {
        await apiFetch("/ventas", {
          method: "POST",
          body: JSON.stringify(cuerpo),
        });
      }
      resetVenta();
      await cargarVentas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la venta");
    } finally {
      setGuardandoVenta(false);
    }
  }

  // Anula la venta elegida. Queda en el historial, no se borra.
  async function anularVenta() {
    if (!ventaAnular) return;
    setError(null);
    setAnulando(true);
    try {
      await apiFetch(`/ventas/${ventaAnular.id}/anular`, { method: "POST" });
      setVentaAnular(null);
      await cargarVentas();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo anular");
    } finally {
      setAnulando(false);
    }
  }

  // Deja el formulario listo para crear una suscripción nueva.
  function resetSuscripcion() {
    setSubEditandoId(null);
    setSubCliente("");
    setSubProducto("");
    setSubMonto("");
    setSubFrecuenciaCobro("MENSUAL");
    setSubComisionTipo("PORCENTAJE");
    setSubComisionValor("");
    setSubComisionFrecuencia("MENSUAL");
    setSubInicio(fechaHoy());
    setSubFin("");
  }

  // Carga una suscripción existente en el formulario para editarla.
  function editarSuscripcion(s: Suscripcion) {
    setSubEditandoId(s.id);
    setSubCliente(s.cliente);
    setSubProducto(s.producto ?? "");
    setSubMonto(String(Number(s.monto)));
    setSubFrecuenciaCobro(s.frecuenciaCobro);
    setSubComisionTipo(s.comisionTipo);
    setSubComisionValor(String(Number(s.comisionValor)));
    setSubComisionFrecuencia(s.comisionFrecuencia);
    setSubInicio(s.inicio.slice(0, 10));
    setSubFin(s.fin ? s.fin.slice(0, 10) : "");
    setSubMensaje(null);
    requestAnimationFrame(() =>
      formSuscripcionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      }),
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Crea o actualiza la suscripción del comisionista de la URL.
  async function guardarSuscripcion(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubMensaje(null);
    setSubGuardando(true);
    try {
      const base = {
        cliente: subCliente,
        producto: subProducto || undefined,
        monto: subMonto,
        frecuenciaCobro: subFrecuenciaCobro,
        comisionTipo: subComisionTipo,
        comisionValor: subComisionValor,
        comisionFrecuencia: subComisionFrecuencia,
        inicio: subInicio,
      };
      if (subEditandoId) {
        await apiFetch(`/suscripciones/${subEditandoId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...base, fin: subFin || null }),
        });
        setSubMensaje("Suscripción actualizada");
      } else {
        await apiFetch("/suscripciones", {
          method: "POST",
          body: JSON.stringify({
            ...base,
            comisionistaId: id,
            ...(subFin ? { fin: subFin } : {}),
          }),
        });
        setSubMensaje("Suscripción creada");
      }
      resetSuscripcion();
      await cargarSuscripciones();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la suscripción",
      );
    } finally {
      setSubGuardando(false);
    }
  }

  // Pausa, reactiva, finaliza o borra la suscripción elegida.
  async function cambiarEstadoSuscripcion() {
    if (!subConfirmacion) return;
    setError(null);
    setSubMensaje(null);
    setSubCambiando(true);
    try {
      if (subConfirmacion.accion === "eliminar") {
        await apiFetch(`/suscripciones/${subConfirmacion.id}`, {
          method: "DELETE",
        });
        setSubMensaje("Suscripción borrada");
      } else {
        await apiFetch(
          `/suscripciones/${subConfirmacion.id}/${subConfirmacion.accion}`,
          { method: "POST" },
        );
      }
      setSubConfirmacion(null);
      await cargarSuscripciones();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar la suscripción",
      );
    } finally {
      setSubCambiando(false);
    }
  }

  // Pide confirmación antes de cambiar el estado de una suscripción.
  function pedirCambioSuscripcion(
    suscripcion: Suscripcion,
    accion: "pausar" | "finalizar" | "reactivar" | "eliminar",
  ) {
    const textos: Record<
      "pausar" | "finalizar" | "reactivar" | "eliminar",
      { titulo: string; mensaje: string; texto: string }
    > = {
      pausar: {
        titulo: "¿Pausar la suscripción?",
        mensaje: "Dejará de generar comisiones mientras esté pausada.",
        texto: "Pausar",
      },
      finalizar: {
        titulo: "¿Finalizar la suscripción?",
        mensaje: "Se cerrará definitivamente y no volverá a generar comisiones.",
        texto: "Finalizar",
      },
      reactivar: {
        titulo: "¿Reactivar la suscripción?",
        mensaje: "Volverá a generar comisiones recurrentes.",
        texto: "Reactivar",
      },
      eliminar: {
        titulo: "¿Borrar la suscripción?",
        mensaje:
          "Se eliminará del sistema junto con sus comisiones. Esta acción no se puede deshacer.",
        texto: "Borrar",
      },
    };
    setSubConfirmacion({
      id: suscripcion.id,
      accion,
      cliente: suscripcion.cliente,
      ...textos[accion],
    });
  }

  const comisionCalculada =
    comisionTipo === "PORCENTAJE"
      ? (Number(monto) * Number(comisionValor)) / 100
      : Number(comisionValor);

  return (
    <AppShell titulo="Suscripciones y ventas">
      <div className="space-y-8">
        <section className="hero-panel p-6 lg:p-7">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
            <div>
              <Link
                href={`/comisionistas/${id}`}
                className="text-[11px] font-semibold text-white/55 transition-colors hover:text-white"
              >
                ← Volver a la ficha
              </Link>
              <h1 className="mt-1 font-display text-[30px] font-bold leading-none tracking-[-0.5px] text-white">
                Suscripciones y ventas
              </h1>
              <p className="mt-2 text-[13px] text-white/65">
                {comisionista?.nombre ?? "Cargando…"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15">
                <p className="text-[10px] uppercase tracking-[1.5px] text-white/55">Monto vendido</p>
                <p className="font-display text-[18px] font-bold text-white">
                  {formatoDinero.format(totales.montoVendido)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15">
                <p className="text-[10px] uppercase tracking-[1.5px] text-white/55">Comisión</p>
                <p className="font-display text-[18px] font-bold text-[#7ef0e4]">
                  {formatoDinero.format(totales.totalComision)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-danger-500">{error}</p>}
        {subMensaje && (
          <p className="text-sm text-success-600 dark:text-success-500">
            {subMensaje}
          </p>
        )}

        {cargando ? (
          <p className="text-sm text-body-text">Cargando movimientos…</p>
        ) : (
          <>
            {esGestor && (
              <section className="surface overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">01</span>
                    <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                      {editandoId ? "Editar venta" : "Registrar venta"}
                    </h2>
                  </div>
                  <p className="text-[12px] text-body-text">
                    La comisión se sugiere según la regla del producto.
                  </p>
                </div>

                <form onSubmit={guardarVenta} className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
                    <label className="space-y-1.5">
                      <span className="block">¿Qué vendió?</span>
                      <input
                        required
                        value={producto}
                        onChange={(e) => setProducto(e.target.value)}
                        placeholder="Escribe el artículo"
                        className={inputClass}
                      />
                    </label>
                    <label className="mt-3 block space-y-1.5">
                      <span className="block normal-case tracking-normal text-[11px] font-medium text-body-text">
                        O elige un producto que ya tiene regla
                      </span>
                      <select
                        value={productosConRegla.includes(producto) ? producto : ""}
                        onChange={(e) => {
                          if (e.target.value) setProducto(e.target.value);
                        }}
                        className={inputClass}
                      >
                        <option value="">
                          {productosConRegla.length
                            ? "Sin regla específica (se escribe arriba)"
                            : "Todavía no hay productos con regla"}
                        </option>
                        {productosConRegla.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className={`${labelClass} sm:col-span-1 lg:col-span-2`}>
                    <span>Fecha</span>
                    <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
                  </label>
                  <label className={`${labelClass} sm:col-span-1 lg:col-span-2`}>
                    <span>¿Cómo se le paga?</span>
                    <select
                      value={comisionTipo}
                      onChange={(e) => setComisionTipo(e.target.value as "PORCENTAJE" | "MONTO_FIJO")}
                      className={inputClass}
                    >
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="MONTO_FIJO">Monto fijo (₡)</option>
                    </select>
                  </label>
                  <label className={`${labelClass} sm:col-span-1 lg:col-span-2`}>
                    <span>Monto de la venta</span>
                    <input required inputMode="decimal" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} className={inputClass} />
                  </label>
                  <label className={`${labelClass} sm:col-span-1 lg:col-span-2`}>
                    <span>{comisionTipo === "PORCENTAJE" ? "Porcentaje de comisión (%)" : "Monto fijo de comisión (₡)"}</span>
                    <input required inputMode="decimal" placeholder={comisionTipo === "PORCENTAJE" ? "5" : "0.00"} value={comisionValor} onChange={(e) => setComisionValor(e.target.value)} className={inputClass} />
                  </label>
                  <div className="flex flex-col justify-end gap-1 pb-2 text-sm text-body-text sm:col-span-2">
                    {sugerencia && (
                      <span className="text-[12px] font-medium text-primary-600 dark:text-primary-100">
                        Regla aplicada:{" "}
                        {sugerencia.detalle && sugerencia.detalle.length > 1
                          ? `${sugerencia.detalle.map((parte) => `${parte.nombre} (${sugerencia.tipo === "PORCENTAJE" ? `${parte.valor}%` : formatoDinero.format(parte.valor)})`).join(" + ")} = ${sugerencia.tipo === "PORCENTAJE" ? `${sugerencia.valor}%` : formatoDinero.format(sugerencia.valor)}`
                          : sugerencia.nombre}
                      </span>
                    )}
                    {comisionTipo === "PORCENTAJE"
                      ? `El ${Number(comisionValor) || 0}% de ${formatoDinero.format(Number(monto) || 0)} = ${formatoDinero.format(comisionCalculada)}`
                      : `Monto fijo: ${formatoDinero.format(comisionCalculada)}`}
                  </div>

                  <div className="flex items-end gap-3 sm:col-span-2">
                    <button type="submit" disabled={guardandoVenta} className="h-[46px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
                      {guardandoVenta ? "Guardando…" : editandoId ? "Guardar cambios" : "Agregar venta"}
                    </button>
                    {editandoId && (
                      <button type="button" onClick={resetVenta} className="h-[46px] rounded-xl border border-light-100 px-5 text-sm font-semibold text-body-text dark:border-dark-600">
                        Cancelar
                      </button>
                    )}
                  </div>

                  <p className="text-[12px] leading-relaxed text-body-text sm:col-span-4">
                    <strong>Monto de la venta:</strong> lo que pagó el cliente.
                    <br />
                    <strong>Comisión:</strong> lo que gana el comisionista por esa venta.
                  </p>
                </form>
              </section>
            )}

            <section className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">{esGestor ? "02" : "01"}</span>
                  <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                    {esComisionista ? "Mis ventas" : "Ventas del comisionista"}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisión acumulada</p>
                  <p className="font-display text-[22px] font-bold text-zinc-900 dark:text-white">
                    {formatoDinero.format(totales.totalComision)}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full xl:min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                      <th className="hidden xl:table-cell px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">¿Qué vendió?</th>
                      <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Monto</th>
                      <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Comisión</th>
                      <th className="hidden xl:table-cell px-4 py-3 font-semibold">Estado</th>
                      {esGestor && (
                        <th className="lg:sticky lg:right-0 lg:z-10 bg-light-50 dark:bg-dark-600 px-4 py-3 text-right font-semibold">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.length === 0 ? (
                      <tr>
                        <td colSpan={esGestor ? 6 : 5} className="px-6 py-8 text-center text-body-text">
                          Todavía no tiene ventas registradas.
                        </td>
                      </tr>
                    ) : (
                      ventas.map((v) => (
                        <tr key={v.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                          <td className="hidden xl:table-cell px-6 py-3.5 text-body-text">{v.fecha.slice(0, 10)}</td>
                          <td className="px-4 py-3.5 text-zinc-900 dark:text-white">
                            {v.producto ?? "—"}
                            <span className="mt-0.5 block text-[11px] font-medium xl:hidden">
                              {formatoDinero.format(Number(v.comisionMonto))}
                              {" · "}
                              <span
                                className={
                                  v.estado === "ANULADA"
                                    ? "text-body-text"
                                    : v.liquidacion?.estado === "PAGADA"
                                      ? "text-success-600 dark:text-success-500"
                                      : "text-warning-600"
                                }
                              >
                                {v.estado === "ANULADA"
                                  ? "Anulada"
                                  : v.liquidacion?.estado === "PAGADA"
                                    ? "Pagada"
                                    : "Pendiente"}
                              </span>
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3.5 text-right text-body-text">{formatoDinero.format(Number(v.neto))}</td>
                          <td className="hidden xl:table-cell px-4 py-3.5 text-right">
                            <span className="font-medium text-zinc-900 dark:text-white">{formatoDinero.format(Number(v.comisionMonto))}</span>
                            <span className="ml-2 text-[11px] text-body-text">
                              ({v.comisionTipo === "PORCENTAJE" ? `${Number(v.comisionValor).toFixed(2)}%` : "fijo"})
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              v.estado === "ANULADA"
                                ? "bg-light-100 text-body-text dark:bg-dark-600"
                                : v.liquidacion?.estado === "PAGADA"
                                  ? "bg-success-500/10 text-success-600 dark:text-success-500"
                                  : "bg-warning-500/10 text-warning-600"
                            }`}>
                              {v.estado === "ANULADA"
                                ? "Anulada"
                                : v.liquidacion?.estado === "PAGADA"
                                  ? "Pagada"
                                  : "Pendiente"}
                            </span>
                          </td>
                          {esGestor && (
                            <td className="lg:sticky lg:right-0 lg:z-10 bg-white lg:shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <AccionTabla
                                  etiqueta={`Editar venta de ${v.producto ?? "producto"}`}
                                  icono="editar"
                                  variante="primario"
                                  onClick={() => editarVenta(v)}
                                />
                                {v.estado === "ACTIVA" && (
                                  <AccionTabla
                                    etiqueta={`Anular venta de ${v.producto ?? "producto"}`}
                                    icono="anular"
                                    variante="peligro"
                                    onClick={() => setVentaAnular(v)}
                                  />
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {esGestor && (
              <section
                ref={formSuscripcionRef}
                className={`surface overflow-hidden scroll-mt-24 transition-shadow ${
                  subEditandoId ? "ring-2 ring-primary-500/40" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">03</span>
                    <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                      {subEditandoId ? "Editar suscripción" : "Nueva suscripción"}
                    </h2>
                  </div>
                  <p className="text-[12px] text-body-text">
                    {subEditandoId
                      ? `Editando: ${subCliente || "suscripción"}`
                      : "La comisión se genera según la frecuencia indicada."}
                  </p>
                </div>

                <form onSubmit={guardarSuscripcion} className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelClass}>
                    <span>Cliente</span>
                    <input required value={subCliente} onChange={(e) => setSubCliente(e.target.value)} placeholder="Ej. Restaurante La Esquina" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    <span>Producto</span>
                    <input value={subProducto} onChange={(e) => setSubProducto(e.target.value)} placeholder="Ej. Plan Básico" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    <span>Monto por cobro (₡)</span>
                    <input required inputMode="decimal" value={subMonto} onChange={(e) => setSubMonto(e.target.value)} placeholder="30000" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    <span>Cada cuánto paga el cliente</span>
                    <select value={subFrecuenciaCobro} onChange={(e) => setSubFrecuenciaCobro(e.target.value as Frecuencia)} className={inputClass}>
                      {Object.entries(frecuenciaLabel).map(([valor, texto]) => (
                        <option key={valor} value={valor}>{texto}</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Inicio</span>
                    <input type="date" required value={subInicio} onChange={(e) => setSubInicio(e.target.value)} className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    <span>Fin (opcional)</span>
                    <input type="date" value={subFin} onChange={(e) => setSubFin(e.target.value)} className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    <span>Tipo de comisión</span>
                    <select value={subComisionTipo} onChange={(e) => setSubComisionTipo(e.target.value as "PORCENTAJE" | "MONTO_FIJO")} className={inputClass}>
                      <option value="PORCENTAJE">Porcentaje (%)</option>
                      <option value="MONTO_FIJO">Monto fijo (₡)</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>{subComisionTipo === "PORCENTAJE" ? "Porcentaje de comisión (%)" : "Monto fijo de comisión (₡)"}</span>
                    <input required inputMode="decimal" value={subComisionValor} onChange={(e) => setSubComisionValor(e.target.value)} placeholder={subComisionTipo === "PORCENTAJE" ? "10" : "5000"} className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    <span>Cada cuánto gana la comisión</span>
                    <select value={subComisionFrecuencia} onChange={(e) => setSubComisionFrecuencia(e.target.value as Frecuencia)} className={inputClass}>
                      {Object.entries(frecuenciaLabel).map(([valor, texto]) => (
                        <option key={valor} value={valor}>{texto}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
                    <button type="submit" disabled={subGuardando} className="h-[46px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
                      {subGuardando ? "Guardando…" : subEditandoId ? "Guardar cambios" : "Crear suscripción"}
                    </button>
                    {subEditandoId && (
                      <button type="button" onClick={resetSuscripcion} className="h-[46px] rounded-xl border border-light-100 px-5 text-sm font-semibold text-body-text dark:border-dark-600">
                        Cancelar
                      </button>
                    )}
                  </div>
                  <p className="text-[12px] leading-relaxed text-body-text sm:col-span-2 lg:col-span-3">
                    <strong>Cliente:</strong> quién paga cada cierto tiempo. La comisión se calcula con el tipo y la frecuencia elegidos.
                  </p>
                </form>
              </section>
            )}

            <section className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">{esGestor ? "04" : "02"}</span>
                  <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                    {esComisionista ? "Mis suscripciones" : "Suscripciones del comisionista"}
                  </h2>
                </div>
                <p className="text-[12px] text-body-text">
                  {suscripciones.length} registros
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full xl:min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                      <th className="px-6 py-3 font-semibold">Cliente</th>
                      <th className="hidden xl:table-cell px-4 py-3 font-semibold">Producto</th>
                      <th className="px-4 py-3 text-right font-semibold">Cobro</th>
                      <th className="hidden xl:table-cell px-4 py-3 font-semibold">Comisión</th>
                      <th className="hidden xl:table-cell px-4 py-3 font-semibold">Vigencia</th>
                      <th className="px-6 py-3 font-semibold">Estado</th>
                      {esGestor && (
                        <th className="lg:sticky lg:right-0 lg:z-10 bg-light-50 dark:bg-dark-600 px-4 py-3 text-right font-semibold">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {suscripciones.length === 0 ? (
                      <tr>
                        <td colSpan={esGestor ? 7 : 6} className="px-6 py-8 text-center text-body-text">
                          Todavía no tiene suscripciones registradas.
                        </td>
                      </tr>
                    ) : (
                      suscripciones.map((s) => (
                        <tr key={s.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                          <td className="px-6 py-3.5 text-zinc-900 dark:text-white">
                            {s.cliente}
                            <span className="mt-0.5 block text-[11px] font-medium text-body-text xl:hidden">
                              {s.producto ?? "—"}
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3.5 text-body-text">{s.producto ?? "—"}</td>
                          <td className="px-4 py-3.5 text-right text-zinc-900 dark:text-white">
                            {formatoDinero.format(Number(s.monto))}
                            <span className="mt-0.5 block text-[11px] font-normal text-body-text">
                              {frecuenciaLabel[s.frecuenciaCobro]}
                            </span>
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3.5 text-body-text">
                            {s.comisionTipo === "PORCENTAJE"
                              ? `${Number(s.comisionValor).toFixed(2)}% · ${frecuenciaLabel[s.comisionFrecuencia]}`
                              : `${formatoDinero.format(Number(s.comisionValor))} · ${frecuenciaLabel[s.comisionFrecuencia]}`}
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3.5 text-[12px] text-body-text">
                            {s.inicio.slice(0, 10)}
                            {s.fin ? ` → ${s.fin.slice(0, 10)}` : " → vigente"}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              s.estado === "ACTIVA"
                                ? "bg-success-500/10 text-success-600 dark:text-success-500"
                                : s.estado === "PAUSADA"
                                  ? "bg-warning-500/10 text-warning-600"
                                  : "bg-light-100 text-body-text dark:bg-dark-600"
                            }`}>
                              {estadoSuscripcionLabel[s.estado]}
                            </span>
                          </td>
                          {esGestor && (
                            <td className="lg:sticky lg:right-0 lg:z-10 bg-white lg:shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-4 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                {s.estado === "FINALIZADA" ? (
                                  <AccionTabla
                                    etiqueta={`Borrar suscripción de ${s.cliente}`}
                                    icono="anular"
                                    variante="peligro"
                                    onClick={() => pedirCambioSuscripcion(s, "eliminar")}
                                  />
                                ) : (
                                  <>
                                    <AccionTabla
                                      etiqueta={`Editar suscripción de ${s.cliente}`}
                                      icono="editar"
                                      variante="primario"
                                      onClick={() => editarSuscripcion(s)}
                                    />
                                    {s.estado === "ACTIVA" ? (
                                      <AccionTabla
                                        etiqueta={`Pausar suscripción de ${s.cliente}`}
                                        icono="pausar"
                                        variante="aviso"
                                        onClick={() => pedirCambioSuscripcion(s, "pausar")}
                                      />
                                    ) : (
                                      <AccionTabla
                                        etiqueta={`Reactivar suscripción de ${s.cliente}`}
                                        icono="reactivar"
                                        variante="exito"
                                        onClick={() => pedirCambioSuscripcion(s, "reactivar")}
                                      />
                                    )}
                                    <AccionTabla
                                      etiqueta={`Finalizar suscripción de ${s.cliente}`}
                                      icono="finalizar"
                                      variante="peligro"
                                      onClick={() => pedirCambioSuscripcion(s, "finalizar")}
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        abierto={ventaAnular !== null}
        titulo="¿Anular esta venta?"
        mensaje="La venta dejará de contar para el monto vendido y la comisión del período."
        detalle={
          ventaAnular
            ? `${ventaAnular.producto ?? "Venta"} · ${formatoDinero.format(Number(ventaAnular.neto))}`
            : null
        }
        textoConfirmar="Anular venta"
        cargando={anulando}
        onConfirmar={anularVenta}
        onCancelar={() => setVentaAnular(null)}
      />

      <ConfirmDialog
        abierto={subConfirmacion !== null}
        titulo={subConfirmacion?.titulo ?? ""}
        mensaje={subConfirmacion?.mensaje ?? ""}
        detalle={subConfirmacion?.cliente ?? null}
        textoConfirmar={subConfirmacion?.texto ?? "Confirmar"}
        variante={subConfirmacion?.accion === "reactivar" ? "primary" : "danger"}
        cargando={subCambiando}
        onConfirmar={cambiarEstadoSuscripcion}
        onCancelar={() => setSubConfirmacion(null)}
      />
    </AppShell>
  );
}

// Envoltura de la página: Suspense es necesario porque se lee el id
// del comisionista desde la dirección.
export default function MovimientosComisionistaPage() {
  return (
    <Suspense fallback={null}>
      <MovimientosComisionista />
    </Suspense>
  );
}
