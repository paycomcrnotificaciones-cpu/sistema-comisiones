"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { apiFetch, descargarArchivo, getSesion, type SesionJwt } from "@/lib/api";

interface Comisionista {
  id: string;
  nombre: string;
  activo: boolean;
  usuario: { email: string; activo: boolean } | null;
}

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
  comisionSuscripciones: string;
  comisionSuscripcionesPendiente: string;
}

type Frecuencia = "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICA";
type EstadoSuscripcion = "ACTIVA" | "PAUSADA" | "FINALIZADA";

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

type Periodo = "mes" | "anterior" | "todos" | "rango";

// La libreta del comisionista: su perfil, sus ventas y el resumen del
// período. El registro de ventas y sus suscripciones viven en
// /comisionistas/[id]/movimientos.

// Fecha corta para mostrar en la tabla (dd/mm/aa).
function fechaCorta(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Devuelve las fechas desde/hasta según el filtro, incluido el rango manual.
function rangoDePeriodo(periodo: Periodo, desde: string, hasta: string) {
  if (periodo === "todos") return {};
  if (periodo === "rango") return { desde, hasta };
  const hoy = new Date();
  const base = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + (periodo === "anterior" ? -1 : 0),
    1,
  );
  const fin = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { desde: fechaCorta(base), hasta: fechaCorta(fin) };
}

// Pantalla completa del perfil. Incluye:
// - resumen de ventas y comisión del período
// - tabla de ventas con filtros, estados y exportación
function PerfilComisionista() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esComisionista = sesion?.rol === "COMISIONISTA";
  const soloLectura = esComisionista || sesion?.rol === "SUPERVISOR";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [comisionista, setComisionista] = useState<Comisionista | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [exportando, setExportando] = useState(false);
  const [totales, setTotales] = useState({
    montoVendido: 0,
    totalComision: 0,
    comisionPendiente: 0,
    comisionPagada: 0,
    comisionSuscripciones: 0,
    comisionSuscripcionesPendiente: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [activo, setActivo] = useState(true);
  const [email, setEmail] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);

  const paramsVentas = useCallback(
    (
      periodoAct: Periodo,
      desdeAct: string,
      hastaAct: string,
      estadoAct = "",
      qAct = "",
    ) => {
      const params = new URLSearchParams({
        comisionistaId: id,
        limite: "100",
      });
      const rango = rangoDePeriodo(periodoAct, desdeAct, hastaAct);
      if (rango.desde) params.set("desde", rango.desde);
      if (rango.hasta) params.set("hasta", rango.hasta);
      if (estadoAct === "ANULADA") params.set("estado", "ANULADA");
      else if (estadoAct) params.set("pago", estadoAct);
      if (qAct.trim()) params.set("q", qAct.trim());
      return params;
    },
    [id],
  );

  // Carga las ventas del período y la comisión acumulada.
  const cargarVentas = useCallback(
    async (
      periodoAct: Periodo,
      desdeAct: string,
      hastaAct: string,
      estadoAct = "",
      qAct = "",
    ) => {
      const params = paramsVentas(periodoAct, desdeAct, hastaAct, estadoAct, qAct);
      const data = await apiFetch<RespuestaVentas>(
        `/ventas?${params.toString()}`,
      );
      setVentas(data.datos);
      setTotales({
        montoVendido: Number(data.montoVendido),
        totalComision: Number(data.totalComision),
        comisionPendiente: Number(data.comisionPendiente),
        comisionPagada: Number(data.comisionPagada),
        comisionSuscripciones: Number(data.comisionSuscripciones ?? 0),
        comisionSuscripcionesPendiente: Number(data.comisionSuscripcionesPendiente ?? 0),
      });
    },
    [paramsVentas],
  );

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          apiFetch<Comisionista>(`/comisionistas/${id}`),
          apiFetch<Suscripcion[]>(
            `/suscripciones?${new URLSearchParams({ comisionistaId: id }).toString()}`,
          ),
        ]);
        if (!vivo) return;
        setComisionista(c);
        setSuscripciones(s);
        setNombre(c.nombre);
        setActivo(c.activo);
        setEmail(c.usuario?.email ?? "");
        await cargarVentas("mes", "", "");
        if (!vivo) return;
        setCargando(false);
      } catch (err) {
        if (!vivo) return;
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el perfil",
        );
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id, cargarVentas]);

  // Guarda los cambios del perfil: nombre y estado.
  async function guardarPerfil(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensajePerfil(null);
    setGuardandoPerfil(true);
    try {
      const actualizado = await apiFetch<Comisionista>(`/comisionistas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre,
          activo,
          ...(email ? { email } : {}),
        }),
      });
      setComisionista(actualizado);
      setEmail(actualizado.usuario?.email ?? "");
      setMensajePerfil("Perfil actualizado correctamente");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el perfil",
      );
    } finally {
      setGuardandoPerfil(false);
    }
  }

  // Cambia entre este mes, el anterior, todos o un rango manual.
  function cambiarPeriodo(nuevo: Periodo) {
    setPeriodo(nuevo);
    if (nuevo !== "rango") {
      void cargarVentas(nuevo, desde, hasta, estadoFiltro, busqueda);
    }
  }

  // Valida el rango de fechas elegido y recarga las ventas.
  async function aplicarRango() {
    if (!desde || !hasta) {
      setError("Selecciona la fecha inicial y la fecha final");
      return;
    }
    if (desde > hasta) {
      setError("La fecha inicial no puede ser mayor que la final");
      return;
    }
    setError(null);
    await cargarVentas("rango", desde, hasta, estadoFiltro, busqueda);
  }

  // Filtra la tabla por estado de la venta (activa o anulada).
  function cambiarEstado(nuevo: string) {
    setEstadoFiltro(nuevo);
    void cargarVentas(periodo, desde, hasta, nuevo, busqueda);
  }

  // Aplica la búsqueda por producto o cliente.
  function aplicarBusqueda(event: React.FormEvent) {
    event.preventDefault();
    void cargarVentas(periodo, desde, hasta, estadoFiltro, busqueda);
  }

  // Descarga las ventas del filtro actual en CSV.
  async function exportarCsv() {
    setExportando(true);
    try {
      const params = paramsVentas(periodo, desde, hasta, estadoFiltro, busqueda);
      params.delete("limite");
      const nombre = `ventas-${(comisionista?.nombre ?? "comisionista").replace(/\s+/g, "-").toLowerCase()}.csv`;
      await descargarArchivo(`/ventas/export?${params.toString()}`, nombre);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar");
    } finally {
      setExportando(false);
    }
  }

  // En la ficha se suman ventas y suscripciones, y se muestra el desglose.
  const comisionGenerada = totales.totalComision + totales.comisionSuscripciones;
  const comisionPendiente =
    totales.comisionPendiente + totales.comisionSuscripcionesPendiente;

  const iniciales = (comisionista?.nombre ?? "??")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <AppShell titulo="Perfil del comisionista">
      <div className="space-y-8">
        <section className="hero-panel p-6 lg:p-7">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold text-white ring-1 ring-white/20">
                {iniciales}
              </span>
              <div>
                {!esComisionista && (
                  <Link
                    href="/comisionistas"
                    className="text-[11px] font-semibold text-white/55 transition-colors hover:text-white"
                  >
                    ← Volver a comisionistas
                  </Link>
                )}
                <h1 className={`font-display text-[30px] font-bold leading-none tracking-[-0.5px] text-white ${esComisionista ? "" : "mt-1"}`}>
                  {comisionista?.nombre ?? "Cargando…"}
                </h1>
                <p className="mt-2 text-[13px] text-white/65">
                  {comisionista?.usuario?.email ?? "Sin acceso al sistema"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/comisionistas/${id}/movimientos`}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                Suscripciones y ventas →
              </Link>
              <span
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                  comisionista?.activo
                    ? "bg-success-500/20 text-[#7ef0e4] ring-1 ring-success-500/30"
                    : "bg-white/10 text-white/70 ring-1 ring-white/15"
                }`}
              >
                {comisionista?.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        {cargando ? (
          <p className="text-sm text-body-text">Cargando perfil…</p>
        ) : (
          <>
            <section className="surface p-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
                    Control del período
                  </p>
                  <h2 className="mt-1 font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                    Resumen de ventas
                  </h2>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className={labelClass}>
                    <span>Período</span>
                    <select
                      value={periodo}
                      onChange={(e) => cambiarPeriodo(e.target.value as Periodo)}
                      className={inputClass}
                    >
                      <option value="mes">Este mes</option>
                      <option value="anterior">Mes anterior</option>
                      <option value="todos">Todas las ventas</option>
                      <option value="rango">Rango personalizado</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    <span>Estado</span>
                    <select
                      value={estadoFiltro}
                      onChange={(e) => cambiarEstado(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Todas</option>
                      <option value="PENDIENTE">Pendientes</option>
                      <option value="PAGADA">Pagadas</option>
                      <option value="ANULADA">Anuladas</option>
                    </select>
                  </label>
                  <form onSubmit={aplicarBusqueda} className="flex items-end gap-2">
                    <label className={labelClass}>
                      <span>Buscar</span>
                      <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Producto…"
                        className={inputClass}
                      />
                    </label>
                    <button
                      type="submit"
                      className="h-[42px] rounded-xl border border-light-100 bg-light-50 px-4 text-sm font-semibold text-body-text transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-600"
                    >
                      Buscar
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={exportarCsv}
                    disabled={exportando}
                    className="h-[42px] rounded-xl border border-light-100 bg-white px-4 text-sm font-semibold text-primary-600 transition-colors hover:border-primary-500 disabled:opacity-50 dark:border-dark-600 dark:bg-dark-700 dark:text-primary-100"
                  >
                    {exportando ? "Exportando…" : "Exportar"}
                  </button>
                  {periodo === "rango" && (
                    <>
                      <label className={labelClass}>
                        <span>Desde</span>
                        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
                      </label>
                      <label className={labelClass}>
                        <span>Hasta</span>
                        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
                      </label>
                      <button type="button" onClick={aplicarRango} className="h-[42px] rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600">
                        Aplicar
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { etiqueta: "Monto vendido", valor: totales.montoVendido, detalle: "Total facturado en ventas del rango", clase: "text-zinc-900 dark:text-white", borde: "border-t-primary-500" },
                  { etiqueta: "Comisión generada", valor: comisionGenerada, detalle: `Ventas ${formatoDinero.format(totales.totalComision)} · Suscripciones ${formatoDinero.format(totales.comisionSuscripciones)}`, clase: "text-primary-600 dark:text-primary-100", borde: "border-t-brand-cyan-500" },
                  { etiqueta: "Pendiente de pago", valor: comisionPendiente, detalle: `Ventas ${formatoDinero.format(totales.comisionPendiente)} · Suscripciones ${formatoDinero.format(totales.comisionSuscripcionesPendiente)}`, clase: "text-warning-600", borde: "border-t-warning-500" },
                  { etiqueta: "Comisión pagada", valor: totales.comisionPagada, detalle: "Liquidaciones pagadas del rango", clase: "text-success-600 dark:text-success-500", borde: "border-t-success-500" },
                ].map((item) => (
                  <div key={item.etiqueta} className={`rounded-xl border border-t-2 border-light-100 bg-light-50/70 p-4 dark:border-dark-600 dark:bg-dark-600/60 ${item.borde}`}>
                    <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">{item.etiqueta}</p>
                    <p className={`mt-1 font-display text-[22px] font-bold ${item.clase}`}>
                      {formatoDinero.format(item.valor)}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-body-text">
                      {item.detalle}
                    </p>
                  </div>
                ))}
              </div>

            </section>

            <section className="surface overflow-hidden">
              <div className="flex items-center gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">
                  01
                </span>
                <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                  {esComisionista ? "Mis datos" : "Datos del comisionista"}
                </h2>
              </div>
              {soloLectura ? (
                <dl className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div className={labelClass}>
                    <dt>Nombre completo</dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-white">
                      {comisionista?.nombre ?? "—"}
                    </dd>
                  </div>
                  <div className={labelClass}>
                    <dt>Estado</dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-white">
                      {comisionista?.activo ? "Activo" : "Inactivo"}
                    </dd>
                  </div>
                  <div className={labelClass}>
                    <dt>Correo</dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-white">
                      {comisionista?.usuario?.email ?? "Sin acceso"}
                    </dd>
                  </div>
                </dl>
              ) : (
              <form onSubmit={guardarPerfil} className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <label className={labelClass}>
                  <span>Nombre completo</span>
                  <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span>Estado</span>
                  <select value={activo ? "1" : "0"} onChange={(e) => setActivo(e.target.value === "1")} className={inputClass}>
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </label>

                <label className={labelClass}>
                  <span>Email de acceso</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="comisionista@empresa.com" className={inputClass} />
                </label>

                <div className="flex items-end gap-3 sm:col-span-2">
                  <button type="submit" disabled={guardandoPerfil} className="h-[46px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60">
                    {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
                  </button>
                  {mensajePerfil && <span className="text-sm text-success-600 dark:text-success-500">{mensajePerfil}</span>}
                </div>
              </form>
              )}
            </section>


            <section className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">02</span>
                  <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                    {esComisionista ? "Mis ventas" : "Ventas del comisionista"}
                  </h2>
                </div>
                {soloLectura && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">
                      Comisión del período
                    </p>
                    <p className="font-display text-[22px] font-bold text-zinc-900 dark:text-white">
                      {formatoDinero.format(comisionGenerada)}
                    </p>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full xl:min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                      <th className="hidden xl:table-cell px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">¿Qué vendió?</th>
                      <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Monto</th>
                      <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Comisión</th>
                      <th className="hidden xl:table-cell px-4 py-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-body-text">
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">03</span>
                  <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                    {esComisionista ? "Mis suscripciones" : "Suscripciones del comisionista"}
                  </h2>
                </div>
                <Link
                  href={`/comisionistas/${id}/movimientos`}
                  className="text-[12px] font-semibold text-primary-600 transition-colors hover:text-primary-500 dark:text-primary-100"
                >
                  Gestionar →
                </Link>
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
                    </tr>
                  </thead>
                  <tbody>
                    {suscripciones.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-body-text">
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
    </AppShell>
  );
}

// Envoltura de la página. Suspense es necesario porque adentro se leen
// parámetros de la dirección (el id del comisionista).
export default function PerfilComisionistaPage() {
  return (
    <Suspense fallback={null}>
      <PerfilComisionista />
    </Suspense>
  );
}
