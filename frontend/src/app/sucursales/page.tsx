"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, getSesion, type SesionJwt } from "@/lib/api";

interface Sucursal {
  id: string;
  nombre: string;
  lugar: string | null;
  _count?: { comisionistas: number; ventas: number; reglas: number };
}

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-body-text/60 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white";
const etiquetaClass =
  "text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text";

// Sucursales: puntos de venta. Cada una agrupa comisionistas, ventas y
// reglas propias, y es lo que usa el resumen para comparar.
export default function SucursalesPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esGestor = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(getSesion());
  }, []);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [lugar, setLugar] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [porEliminar, setPorEliminar] = useState<Sucursal | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  // Trae las sucursales con la cantidad de comisionistas, ventas y reglas.
  const cargar = useCallback(async () => {
    const data = await apiFetch<Sucursal[]>("/sucursales");
    setSucursales(data);
  }, []);

  useEffect(() => {
    if (!sesion) return;
    if (!esGestor) {
      router.replace("/resumen");
      return;
    }
    let activo = true;
    (async () => {
      try {
        await cargar();
        if (activo) setCargando(false);
      } catch (err) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : "Error al cargar");
        setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [cargar, esGestor, router, sesion]);

  // Abre el formulario vacío para crear una sucursal.
  function abrirNueva() {
    setEditandoId(null);
    setNombre("");
    setLugar("");
    setError(null);
    setMensaje(null);
    setModalAbierto(true);
  }

  // Abre el formulario con los datos de una sucursal para editarla.
  function abrirEdicion(s: Sucursal) {
    setEditandoId(s.id);
    setNombre(s.nombre);
    setLugar(s.lugar ?? "");
    setError(null);
    setMensaje(null);
    setModalAbierto(true);
  }

  // Guarda la sucursal: crea una nueva o actualiza la que se está editando.
  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const cuerpo = { nombre, lugar: lugar.trim() || null };
      if (editandoId) {
        await apiFetch(`/sucursales/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify(cuerpo),
        });
        setMensaje("Sucursal actualizada");
      } else {
        await apiFetch("/sucursales", {
          method: "POST",
          body: JSON.stringify(cuerpo),
        });
        setMensaje("Sucursal creada");
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  // Elimina la sucursal si no tiene comisionistas, ventas ni reglas.
  async function confirmarEliminar() {
    if (!porEliminar) return;
    setErrorEliminar(null);
    setEliminando(true);
    try {
      await apiFetch(`/sucursales/${porEliminar.id}`, { method: "DELETE" });
      setMensaje(`Sucursal "${porEliminar.nombre}" eliminada`);
      setPorEliminar(null);
      await cargar();
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : "No se pudo eliminar la sucursal",
      );
    } finally {
      setEliminando(false);
    }
  }

  if (!esGestor) return null;

  return (
    <AppShell titulo="Sucursales">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
              Puntos de venta
            </p>
            <h1 className="mt-3 font-display text-[30px] font-bold leading-none tracking-[-0.4px] text-zinc-900 dark:text-white sm:text-[37px]">
              Sucursales
            </h1>
            <p className="mt-3 text-[14px] text-body-text">
              Cada sucursal agrupa comisionistas, ventas y reglas propias.
            </p>
          </div>
          <button
            type="button"
            onClick={abrirNueva}
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 sm:w-auto"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva sucursal
          </button>
        </div>

        {error && <p className="text-sm text-danger-500">{error}</p>}
        {mensaje && (
          <p className="text-sm text-success-600 dark:text-success-500">{mensaje}</p>
        )}

        <section className="surface overflow-hidden">
          <div className="border-b border-light-100 p-4 dark:border-dark-600 sm:p-6">
            <h2 className="font-display text-[18px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white sm:text-[20px]">
              Sucursales registradas
            </h2>
            <p className="mt-1 text-[12px] text-body-text">
              {sucursales.length}{" "}
              {sucursales.length === 1 ? "sucursal" : "sucursales"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                  <th className="px-4 py-3 font-semibold sm:px-6">Sucursal</th>
                  <th className="hidden xl:table-cell px-4 py-3 font-semibold">Lugar</th>
                  <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Comisionistas</th>
                  <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Ventas</th>
                  <th className="hidden xl:table-cell px-4 py-3 text-right font-semibold">Reglas</th>
                  <th className="sticky right-0 z-10 bg-light-50 px-4 py-3 text-right font-semibold dark:bg-dark-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-body-text sm:px-6">
                      Cargando…
                    </td>
                  </tr>
                ) : sucursales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-body-text sm:px-6">
                      Todavía no hay sucursales. Crea la primera con el botón de arriba.
                    </td>
                  </tr>
                ) : (
                  sucursales.map((s) => (
                    <tr
                      key={s.id}
                      className="table-row-hover border-t border-light-100 dark:border-dark-600"
                    >
                      <td className="px-4 py-3.5 sm:px-6">
                        <p className="font-medium text-zinc-900 dark:text-white">{s.nombre}</p>
                        <p className="mt-0.5 text-[11px] text-body-text xl:hidden">
                          {s.lugar ?? "Sin lugar"} ·{" "}
                          {s._count?.comisionistas ?? 0} comisionistas ·{" "}
                          {s._count?.ventas ?? 0} ventas
                        </p>
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5 text-body-text">
                        {s.lugar ?? "—"}
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5 text-right text-body-text">
                        {s._count?.comisionistas ?? 0}
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5 text-right text-body-text">
                        {s._count?.ventas ?? 0}
                      </td>
                      <td className="hidden xl:table-cell px-4 py-3.5 text-right text-body-text">
                        {s._count?.reglas ?? 0}
                      </td>
                      <td className="sticky right-0 z-10 bg-white px-3 py-3.5 lg:shadow-[-8px_0_12px_-12px_rgba(10,18,38,0.5)] dark:bg-dark-700 sm:px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <AccionTabla
                            etiqueta="Editar"
                            icono="editar"
                            variante="primario"
                            onClick={() => abrirEdicion(s)}
                          />
                          <AccionTabla
                            etiqueta="Eliminar"
                            icono="anular"
                            variante="peligro"
                            onClick={() => {
                              setErrorEliminar(null);
                              setPorEliminar(s);
                            }}
                          />
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

      {modalAbierto && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => {
            if (!guardando) setModalAbierto(false);
          }}
        >
          <form
            onSubmit={guardar}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-light-100 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(10,18,38,0.65)] dark:border-dark-600 dark:bg-dark-700 sm:p-6"
          >
            <h2 className="font-display text-[19px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              {editandoId ? "Editar sucursal" : "Nueva sucursal"}
            </h2>
            <p className="mt-1 text-[12px] text-body-text">
              El lugar es opcional y sirve para ubicarla.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className={etiquetaClass}>Nombre</span>
                <input
                  required
                  maxLength={120}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Sucursal Cartago"
                  className={inputClass}
                  autoFocus
                />
              </label>
              <label className="block space-y-1.5">
                <span className={etiquetaClass}>Lugar</span>
                <input
                  maxLength={120}
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Cartago centro"
                  className={inputClass}
                />
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-danger-500">{error}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                disabled={guardando}
                className="h-[42px] rounded-xl border border-light-100 px-4 text-sm font-semibold text-body-text transition-colors hover:bg-light-50 disabled:opacity-50 dark:border-dark-600 dark:hover:bg-dark-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="h-[42px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
              >
                {guardando
                  ? "Guardando…"
                  : editandoId
                    ? "Guardar cambios"
                    : "Crear sucursal"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        abierto={porEliminar !== null}
        titulo="Eliminar sucursal"
        mensaje="Esta acción no se puede deshacer."
        detalle={
          errorEliminar ??
          (porEliminar
            ? `${porEliminar.nombre} · ${porEliminar._count?.comisionistas ?? 0} comisionistas · ${porEliminar._count?.ventas ?? 0} ventas`
            : null)
        }
        textoConfirmar="Eliminar"
        cargando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setPorEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </AppShell>
  );
}
