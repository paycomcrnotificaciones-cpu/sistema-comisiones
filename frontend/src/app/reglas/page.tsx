"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, getSesion, getToken, type SesionJwt } from "@/lib/api";

type Ambito = "GLOBAL" | "PRODUCTO" | "COMISIONISTA" | "SUCURSAL";
type Tipo = "PORCENTAJE" | "MONTO_FIJO";

interface Regla {
  id: string;
  nombre: string;
  activa: boolean;
  tipo: Tipo;
  valor: string;
  ambito: Ambito;
  producto: string | null;
  prioridad: number;
  acumulable: boolean;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  comisionista: { id: string; nombre: string } | null;
  sucursal: { id: string; nombre: string } | null;
}

interface Opcion {
  id: string;
  nombre: string;
}

const formatoDinero = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  minimumFractionDigits: 2,
});

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white";

const labelClass =
  "space-y-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text";

const ambitos: { valor: Ambito; texto: string }[] = [
  { valor: "GLOBAL", texto: "Global" },
  { valor: "PRODUCTO", texto: "Por producto" },
  { valor: "COMISIONISTA", texto: "Por comisionista" },
  { valor: "SUCURSAL", texto: "Por sucursal" },
];

function detalleAmbito(r: Regla): string {
  if (r.ambito === "PRODUCTO") return r.producto ?? "—";
  if (r.ambito === "COMISIONISTA") return r.comisionista?.nombre ?? "—";
  if (r.ambito === "SUCURSAL") return r.sucursal?.nombre ?? "—";
  return "Todas las ventas";
}

function valorTexto(r: Regla): string {
  return r.tipo === "PORCENTAJE"
    ? `${Number(r.valor)}%`
    : formatoDinero.format(Number(r.valor));
}


// Pantalla de reglas de comisión. Sirven para que el formulario de venta
// proponga un porcentaje o monto fijo según el producto, la persona o la sucursal.
export default function ReglasPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esGestor = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  const [reglas, setReglas] = useState<Regla[]>([]);
  const [comisionistas, setComisionistas] = useState<Opcion[]>([]);
  const [sucursales, setSucursales] = useState<Opcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Regla | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Tipo>("PORCENTAJE");
  const [valor, setValor] = useState("");
  const [ambito, setAmbito] = useState<Ambito>("PRODUCTO");
  const [producto, setProducto] = useState("");
  const [comisionistaId, setComisionistaId] = useState("");
  const [sucursalId, setSucursalId] = useState("");
  const [prioridad, setPrioridad] = useState("100");
  const [acumulable, setAcumulable] = useState(false);
  const [activa, setActiva] = useState(true);
  const [vigenciaDesde, setVigenciaDesde] = useState("");
  const [vigenciaHasta, setVigenciaHasta] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  // Trae todas las reglas de la empresa.
  const cargar = useCallback(async () => {
    const [lista, gente, sedes] = await Promise.all([
      apiFetch<Regla[]>("/reglas"),
      apiFetch<Opcion[]>("/comisionistas"),
      apiFetch<Opcion[]>("/sucursales"),
    ]);
    setReglas(lista);
    setComisionistas(gente);
    setSucursales(sedes);
  }, []);

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
    let vivo = true;
    (async () => {
      try {
        await cargar();
        if (vivo) setCargando(false);
      } catch (err) {
        if (!vivo) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
        setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [cargar, esGestor, router, sesion]);

  // Deja el formulario en blanco para crear una regla nueva.
  function limpiar() {
    setEditandoId(null);
    setNombre("");
    setTipo("PORCENTAJE");
    setValor("");
    setAmbito("PRODUCTO");
    setProducto("");
    setComisionistaId("");
    setSucursalId("");
    setPrioridad("100");
    setAcumulable(false);
    setActiva(true);
    setVigenciaDesde("");
    setVigenciaHasta("");
  }

  // Carga una regla existente en el formulario para modificarla.
  function editar(r: Regla) {
    setEditandoId(r.id);
    setNombre(r.nombre);
    setTipo(r.tipo);
    setValor(String(Number(r.valor)));
    setAmbito(r.ambito);
    setProducto(r.producto ?? "");
    setComisionistaId(r.comisionista?.id ?? "");
    setSucursalId(r.sucursal?.id ?? "");
    setPrioridad(String(r.prioridad));
    setAcumulable(r.acumulable);
    setActiva(r.activa);
    setVigenciaDesde(r.vigenciaDesde ? r.vigenciaDesde.slice(0, 10) : "");
    setVigenciaHasta(r.vigenciaHasta ? r.vigenciaHasta.slice(0, 10) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Guarda la regla: crea una nueva o actualiza la que se está editando.
  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setTrabajando(true);
    try {
      const cuerpo = {
        nombre,
        tipo,
        valor: valor || "0",
        ambito,
        producto: ambito === "PRODUCTO" ? producto : null,
        comisionistaId: ambito === "COMISIONISTA" ? comisionistaId || null : null,
        sucursalId: ambito === "SUCURSAL" ? sucursalId || null : null,
        prioridad: Number(prioridad) || 100,
        acumulable,
        activa,
        vigenciaDesde: vigenciaDesde || null,
        vigenciaHasta: vigenciaHasta || null,
      };
      if (editandoId) {
        await apiFetch(`/reglas/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify(cuerpo),
        });
      } else {
        await apiFetch("/reglas", {
          method: "POST",
          body: JSON.stringify(cuerpo),
        });
      }
      limpiar();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la regla");
    } finally {
      setTrabajando(false);
    }
  }

  // Activa o desactiva la regla sin borrarla.
  async function alternar(r: Regla) {
    setError(null);
    try {
      await apiFetch(`/reglas/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activa: !r.activa }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  // Borra la regla elegida, después de confirmar en el modal.
  async function eliminar() {
    if (!porEliminar) return;
    setError(null);
    setEliminando(true);
    try {
      await apiFetch(`/reglas/${porEliminar.id}`, { method: "DELETE" });
      setPorEliminar(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setEliminando(false);
    }
  }

  if (!esGestor) return null;

  return (
    <AppShell titulo="Reglas">
      <div className="space-y-8">
        <section className="hero-panel p-6 lg:p-7">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
              Comisiones automáticas
            </p>
            <h1 className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.5px] text-white">
              Reglas de comisión
            </h1>
            <p className="mt-3 max-w-xl text-[14px] text-white/70">
              Define cuánto se paga según el producto, el comisionista o la sucursal.
              La regla más específica se sugiere al registrar la venta.
            </p>
          </div>
        </section>

        {error && <p className="text-sm text-danger-500">{error}</p>}

        <section className="surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              {editandoId ? "Editar regla" : "Nueva regla"}
            </h2>
            {editandoId && (
              <button type="button" onClick={limpiar} className="text-[12px] font-semibold text-body-text hover:text-primary-600">
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={`${labelClass} sm:col-span-2`}>
              <span>Nombre</span>
              <input
                required
                value={nombre}
                onChange={(e) => {
                  const valorNombre = e.target.value;
                  setNombre(valorNombre);
                  if (ambito === "PRODUCTO" && (producto === "" || producto === nombre)) {
                    setProducto(valorNombre);
                  }
                }}
                placeholder="Ej. Cámaras de seguridad"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              <span>Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className={inputClass}>
                <option value="PORCENTAJE">Porcentaje (%)</option>
                <option value="MONTO_FIJO">Monto fijo (₡)</option>
              </select>
            </label>
            <label className={labelClass}>
              <span>{tipo === "PORCENTAJE" ? "Valor (%)" : "Valor (₡)"}</span>
              <input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "PORCENTAJE" ? "5" : "0.00"} className={inputClass} />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              <span>Ámbito</span>
              <select value={ambito} onChange={(e) => setAmbito(e.target.value as Ambito)} className={inputClass}>
                {ambitos.map((a) => (
                  <option key={a.valor} value={a.valor}>{a.texto}</option>
                ))}
              </select>
              {ambito === "GLOBAL" && (
                <span className="block text-[11px] font-normal normal-case tracking-normal text-body-text">
                  Aplica a cualquier venta. Si es para un producto, usa “Por producto”.
                </span>
              )}
            </label>
            {ambito === "PRODUCTO" && (
              <label className={`${labelClass} sm:col-span-2`}>
                <span>Producto</span>
                <input required value={producto} onChange={(e) => setProducto(e.target.value)} placeholder="Ej. Cámara de seguridad" className={inputClass} />
              </label>
            )}
            {ambito === "COMISIONISTA" && (
              <label className={`${labelClass} sm:col-span-2`}>
                <span>Comisionista</span>
                <select required value={comisionistaId} onChange={(e) => setComisionistaId(e.target.value)} className={inputClass}>
                  <option value="">Selecciona…</option>
                  {comisionistas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
            )}
            {ambito === "SUCURSAL" && (
              <label className={`${labelClass} sm:col-span-2`}>
                <span>Sucursal</span>
                <select required value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={inputClass}>
                  <option value="">Selecciona…</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </label>
            )}
            <label className={labelClass}>
              <span>Prioridad</span>
              <input inputMode="numeric" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>Desde</span>
              <input type="date" value={vigenciaDesde} onChange={(e) => setVigenciaDesde(e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>Hasta</span>
              <input type="date" value={vigenciaHasta} onChange={(e) => setVigenciaHasta(e.target.value)} className={inputClass} />
            </label>
            <div className="flex flex-wrap items-center gap-5 pb-1 sm:col-span-2 lg:col-span-2">
              <label className="flex items-center gap-2 text-sm text-body-text">
                <input type="checkbox" checked={acumulable} onChange={(e) => setAcumulable(e.target.checked)} />
                Acumulable
              </label>
              <label className="flex items-center gap-2 text-sm text-body-text">
                <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
                Activa
              </label>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-2">
              <button type="submit" disabled={trabajando} className="h-[42px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60">
                {trabajando ? "Guardando…" : editandoId ? "Guardar cambios" : "Agregar regla"}
              </button>
            </div>
          </form>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b border-light-100 p-5 dark:border-dark-600">
            <h2 className="font-display text-[18px] font-bold text-zinc-900 dark:text-white">
              Reglas configuradas
            </h2>
            <p className="mt-1 text-[12px] text-body-text">
              Se aplica la más específica; si hay empate, la de menor prioridad.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full xl:min-w-[820px] text-left text-sm">
              <thead className="bg-light-50 text-[10px] uppercase tracking-[1.2px] text-body-text dark:bg-dark-600">
                <tr>
                  <th className="hidden xl:table-cell px-5 py-3">Prioridad</th>
                  <th className="px-3 py-3">Nombre</th>
                  <th className="hidden xl:table-cell px-3 py-3">Tipo</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="hidden xl:table-cell px-3 py-3">Ámbito</th>
                  <th className="hidden xl:table-cell px-3 py-3">Vigencia</th>
                  <th className="hidden xl:table-cell px-3 py-3">Estado</th>
                  <th className="sticky right-0 z-10 bg-light-50 dark:bg-dark-600 px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-body-text">Cargando…</td></tr>
                ) : reglas.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-body-text">Aún no hay reglas configuradas</td></tr>
                ) : (
                  reglas.map((r) => (
                    <tr key={r.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                      <td className="hidden xl:table-cell px-5 py-3 text-body-text">{r.prioridad}</td>
                      <td className="px-3 py-3 font-medium text-zinc-900 dark:text-white">
                        {r.nombre}
                        {r.acumulable && <span className="ml-1.5 text-[11px] text-body-text">· acumulable</span>}
                        <span className="mt-0.5 block text-[11px] font-normal text-body-text xl:hidden">
                          {detalleAmbito(r)}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3 text-body-text">{r.tipo === "PORCENTAJE" ? "Porcentaje" : "Monto fijo"}</td>
                      <td className="px-3 py-3 text-right font-semibold text-zinc-900 dark:text-white">{valorTexto(r)}</td>
                      <td className="hidden xl:table-cell px-3 py-3 text-body-text">{detalleAmbito(r)}</td>
                      <td className="hidden xl:table-cell px-3 py-3 text-body-text">
                        {r.vigenciaDesde || r.vigenciaHasta
                          ? `${r.vigenciaDesde?.slice(0, 10) ?? "—"} a ${r.vigenciaHasta?.slice(0, 10) ?? "—"}`
                          : "Siempre"}
                      </td>
                      <td className="hidden xl:table-cell px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          r.activa
                            ? "bg-success-500/10 text-success-600 dark:text-success-500"
                            : "bg-light-100 text-body-text dark:bg-dark-600"
                        }`}>
                          {r.activa ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => editar(r)}
                            title="Editar"
                            aria-label={`Editar ${r.nombre}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-100 text-body-text transition-colors hover:border-primary-500 hover:bg-primary-500/10 hover:text-primary-600 dark:border-dark-600 dark:hover:text-primary-100"
                          >
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                              <path d="M13.5 6.5l4 4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => alternar(r)}
                            title={r.activa ? "Desactivar" : "Activar"}
                            aria-label={r.activa ? `Desactivar ${r.nombre}` : `Activar ${r.nombre}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-100 text-body-text transition-colors hover:border-warning-500 hover:bg-warning-500/10 hover:text-warning-600 dark:border-dark-600"
                          >
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 3v9" />
                              <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPorEliminar(r)}
                            title="Eliminar"
                            aria-label={`Eliminar ${r.nombre}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-light-100 text-body-text transition-colors hover:border-danger-500 hover:bg-danger-500/10 hover:text-danger-500 dark:border-dark-600"
                          >
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 7h16" />
                              <path d="M9 7V4h6v3" />
                              <path d="M6 7l1 13h10l1-13" />
                              <path d="M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </div>
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
        abierto={porEliminar !== null}
        titulo="¿Eliminar la regla?"
        mensaje="Esta acción no se puede deshacer. Las ventas ya registradas conservan su comisión."
        detalle={porEliminar ? `${porEliminar.nombre} · ${valorTexto(porEliminar)}` : null}
        textoConfirmar="Eliminar"
        cargando={eliminando}
        onConfirmar={eliminar}
        onCancelar={() => setPorEliminar(null)}
      />
    </AppShell>
  );
}
