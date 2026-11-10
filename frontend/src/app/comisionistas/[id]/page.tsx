"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, descargarArchivo, getSesion, type SesionJwt } from "@/lib/api";

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

function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function fechaCorta(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function mesDePeriodo(periodo: Periodo): string | null {
  if (periodo === "todos" || periodo === "rango") return null;
  const hoy = new Date();
  const base = new Date(
    hoy.getFullYear(),
    hoy.getMonth() + (periodo === "anterior" ? -1 : 0),
    1,
  );
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

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

function PerfilComisionista() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esComisionista = sesion?.rol === "COMISIONISTA";
  const soloLectura = esComisionista || sesion?.rol === "SUPERVISOR";
  const esGestor = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [comisionista, setComisionista] = useState<Comisionista | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [exportando, setExportando] = useState(false);
  const [meta, setMeta] = useState<number | null>(null);
  const [metaInput, setMetaInput] = useState("");
  const [metaGuardando, setMetaGuardando] = useState(false);
  const [sugerencia, setSugerencia] = useState<{
    nombre: string;
    tipo: "PORCENTAJE" | "MONTO_FIJO";
    valor: number;
    detalle?: { nombre: string; valor: number }[];
  } | null>(null);
  const [ventaAnular, setVentaAnular] = useState<Venta | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [totales, setTotales] = useState({
    montoVendido: 0,
    totalComision: 0,
    comisionPendiente: 0,
    comisionPagada: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [ventaSucursalId, setVentaSucursalId] = useState("");
  const [activo, setActivo] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [mensajePerfil, setMensajePerfil] = useState<string | null>(null);

  const [fecha, setFecha] = useState("");
  const [producto, setProducto] = useState("");
  const [monto, setMonto] = useState("");
  const [comisionTipo, setComisionTipo] = useState<"PORCENTAJE" | "MONTO_FIJO">(
    "PORCENTAJE",
  );
  const [comisionValor, setComisionValor] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardandoVenta, setGuardandoVenta] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFecha(fechaHoy());
  }, []);

  const mesMeta = mesDePeriodo(periodo);

  useEffect(() => {
    if (!mesMeta) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeta(null);
      return;
    }
    let vivo = true;
    (async () => {
      try {
        const data = await apiFetch<{
          general: number | null;
          comisionistas: { comisionistaId: string; monto: number }[];
        }>(`/metas?mes=${mesMeta}`);
        if (!vivo) return;
        const propia = data.comisionistas.find((c) => c.comisionistaId === id);
        const valor = propia?.monto ?? data.general ?? null;
        setMeta(valor);
        setMetaInput(valor === null ? "" : String(valor));
      } catch {
        if (vivo) setMeta(null);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [mesMeta, id]);

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
        if (ventaSucursalId) params.set("sucursalId", ventaSucursalId);
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
  }, [producto, ventaSucursalId, id, editandoId]);

  async function guardarMeta(monto: number | null) {
    if (!mesMeta) return;
    setMetaGuardando(true);
    try {
      await apiFetch("/metas", {
        method: "PUT",
        body: JSON.stringify({ mes: mesMeta, monto, comisionistaId: id }),
      });
      setMeta(monto);
      setMetaInput(monto === null ? "" : String(monto));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la meta");
    } finally {
      setMetaGuardando(false);
    }
  }

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
          apiFetch<Sucursal[]>("/sucursales"),
        ]);
        if (!vivo) return;
        setComisionista(c);
        setSucursales(s);
        setNombre(c.nombre);
        setCodigo(c.codigo ?? "");
        setSucursalId(c.sucursal?.id ?? s[0]?.id ?? "");
        setVentaSucursalId(c.sucursal?.id ?? s[0]?.id ?? "");
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
          codigo: codigo || null,
          sucursalId,
          activo,
          ...(email ? { email } : {}),
          ...(password ? { password } : {}),
        }),
      });
      setComisionista(actualizado);
      setEmail(actualizado.usuario?.email ?? "");
      setPassword("");
      setMensajePerfil("Perfil actualizado correctamente");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el perfil",
      );
    } finally {
      setGuardandoPerfil(false);
    }
  }

  function resetVenta() {
    setEditandoId(null);
    setFecha(fechaHoy());
    setProducto("");
    setMonto("");
    setComisionTipo("PORCENTAJE");
    setComisionValor("");
  }

  function editarVenta(v: Venta) {
    setEditandoId(v.id);
    setFecha(v.fecha.slice(0, 10));
    setProducto(v.producto ?? "");
    setMonto(v.neto);
    setComisionTipo(v.comisionTipo);
    setComisionValor(v.comisionValor);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
        sucursalId: ventaSucursalId,
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
      await cargarVentas(periodo, desde, hasta, estadoFiltro, busqueda);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la venta");
    } finally {
      setGuardandoVenta(false);
    }
  }

  async function anularVenta() {
    if (!ventaAnular) return;
    setError(null);
    setAnulando(true);
    try {
      await apiFetch(`/ventas/${ventaAnular.id}/anular`, { method: "POST" });
      setVentaAnular(null);
      await cargarVentas(periodo, desde, hasta, estadoFiltro, busqueda);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo anular");
    } finally {
      setAnulando(false);
    }
  }

  const comisionCalculada =
    comisionTipo === "PORCENTAJE"
      ? (Number(monto) * Number(comisionValor)) / 100
      : Number(comisionValor);

  function cambiarPeriodo(nuevo: Periodo) {
    setPeriodo(nuevo);
    if (nuevo !== "rango") {
      void cargarVentas(nuevo, desde, hasta, estadoFiltro, busqueda);
    }
  }

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

  function cambiarEstado(nuevo: string) {
    setEstadoFiltro(nuevo);
    void cargarVentas(periodo, desde, hasta, nuevo, busqueda);
  }

  function aplicarBusqueda(event: React.FormEvent) {
    event.preventDefault();
    void cargarVentas(periodo, desde, hasta, estadoFiltro, busqueda);
  }

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
                  {comisionista?.sucursal?.nombre ?? "Sin sucursal"}
                  {comisionista?.codigo ? ` · ${comisionista.codigo}` : ""}
                </p>
              </div>
            </div>
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
                    {exportando ? "Exportando…" : "Exportar CSV"}
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
                  { etiqueta: "Monto vendido", valor: totales.montoVendido, clase: "text-zinc-900 dark:text-white", borde: "border-t-primary-500" },
                  { etiqueta: "Comisión generada", valor: totales.totalComision, clase: "text-primary-600 dark:text-primary-100", borde: "border-t-brand-cyan-500" },
                  { etiqueta: "Pendiente de pago", valor: totales.comisionPendiente, clase: "text-warning-600", borde: "border-t-warning-500" },
                  { etiqueta: "Comisión pagada", valor: totales.comisionPagada, clase: "text-success-600 dark:text-success-500", borde: "border-t-success-500" },
                ].map((item) => (
                  <div key={item.etiqueta} className={`rounded-xl border border-t-2 border-light-100 bg-light-50/70 p-4 dark:border-dark-600 dark:bg-dark-600/60 ${item.borde}`}>
                    <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">{item.etiqueta}</p>
                    <p className={`mt-1 font-display text-[22px] font-bold ${item.clase}`}>
                      {formatoDinero.format(item.valor)}
                    </p>
                  </div>
                ))}
              </div>

              {mesMeta && (
                <div className="mt-3 rounded-xl border border-light-100 bg-light-50/70 p-4 dark:border-dark-600 dark:bg-dark-600/60">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Meta del mes</p>
                      <p className="mt-1 font-display text-[22px] font-bold text-zinc-900 dark:text-white">
                        {meta === null ? "Sin meta" : formatoDinero.format(meta)}
                      </p>
                    </div>
                    <p className="text-[12px] text-body-text">
                      {meta && meta > 0
                        ? `${formatoDinero.format(totales.montoVendido)} vendido · ${Math.round((totales.montoVendido / meta) * 1000) / 10}% de la meta`
                        : "Fija una meta para medir el avance del mes"}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-light-100 dark:bg-dark-500">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-cyan-500),var(--color-primary-500))] transition-all"
                      style={{ width: `${meta && meta > 0 ? Math.min(100, (totales.montoVendido / meta) * 100) : 0}%` }}
                    />
                  </div>
                  {esGestor && (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className={`${labelClass} w-40`}>
                        <span>Meta (₡)</span>
                        <input
                          inputMode="decimal"
                          placeholder="0.00"
                          value={metaInput}
                          onChange={(e) => setMetaInput(e.target.value)}
                          className={inputClass}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={metaGuardando || !metaInput}
                        onClick={() => guardarMeta(Number(metaInput) || 0)}
                        className="h-[42px] rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                      >
                        {metaGuardando ? "Guardando…" : "Guardar meta"}
                      </button>
                      {meta !== null && (
                        <button
                          type="button"
                          disabled={metaGuardando}
                          onClick={() => guardarMeta(null)}
                          className="h-[42px] rounded-xl border border-light-100 px-4 text-sm font-semibold text-body-text transition-colors hover:border-danger-500 hover:text-danger-500 dark:border-dark-600"
                        >
                          Quitar meta
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                    <dt>Código</dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-white">
                      {comisionista?.codigo ?? "—"}
                    </dd>
                  </div>
                  <div className={labelClass}>
                    <dt>Sucursal</dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-white">
                      {comisionista?.sucursal?.nombre ?? "—"}
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
                  <span>Código</span>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span>Sucursal</span>
                  <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={inputClass}>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
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
                <label className={labelClass}>
                  <span>Nueva contraseña</span>
                  <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Dejar vacío para no cambiar" className={inputClass} />
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

            {!soloLectura && (
            <section className="surface overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-100 p-6 dark:border-dark-600">
                <div className="flex items-center gap-3">
                  <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">02</span>
                  <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                    {editandoId ? "Editar venta" : "Agregar venta"}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[1.5px] text-body-text">Comisión del período</p>
                  <p className="font-display text-[22px] font-bold text-zinc-900 dark:text-white">
                    {formatoDinero.format(totales.totalComision)}
                  </p>
                </div>
              </div>

              <form onSubmit={guardarVenta} className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
                  <span>¿Qué vendió?</span>
                  <input required value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej. Cámara de seguridad" className={inputClass} />
                </label>
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
                  <span className="font-display text-[11px] font-bold tracking-[1px] text-primary-500">03</span>
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
                      {formatoDinero.format(totales.totalComision)}
                    </p>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                      <th className="px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">¿Qué vendió?</th>
                      <th className="px-4 py-3 text-right font-semibold">Monto</th>
                      <th className="px-4 py-3 text-right font-semibold">Comisión</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-body-text">
                          Todavía no tiene ventas registradas.
                        </td>
                      </tr>
                    ) : (
                      ventas.map((v) => (
                        <tr key={v.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                          <td className="px-6 py-3.5 text-body-text">{v.fecha.slice(0, 10)}</td>
                          <td className="px-4 py-3.5 text-zinc-900 dark:text-white">{v.producto ?? "—"}</td>
                          <td className="px-4 py-3.5 text-right text-body-text">{formatoDinero.format(Number(v.neto))}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="font-medium text-zinc-900 dark:text-white">{formatoDinero.format(Number(v.comisionMonto))}</span>
                            <span className="ml-2 text-[11px] text-body-text">
                              ({v.comisionTipo === "PORCENTAJE" ? `${Number(v.comisionValor).toFixed(2)}%` : "fijo"})
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
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
                          <td className="px-4 py-3.5">
                            {!soloLectura && (
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
                            )}
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
    </AppShell>
  );
}

export default function PerfilComisionistaPage() {
  return (
    <Suspense fallback={null}>
      <PerfilComisionista />
    </Suspense>
  );
}
