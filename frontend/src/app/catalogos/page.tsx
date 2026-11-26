"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccionTabla } from "@/components/accion-tabla";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch, getSesion, type SesionJwt } from "@/lib/api";

interface Catalogo {
  id: string;
  nombre: string;
  activo: boolean;
}

const inputClass =
  "w-full rounded-xl border border-light-100 bg-light-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-600 dark:text-white";

const labelClass =
  "space-y-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-body-text";

// Catálogo de productos: la lista de la que se elige al registrar una venta
// o una suscripción. Solo lleva nombre y si está activo.
export default function CatalogosPage() {
  const router = useRouter();
  const [sesion, setSesion] = useState<SesionJwt | null>(null);
  const esGestor = sesion?.rol === "ADMIN" || sesion?.rol === "SUPER_ADMIN";

  const [productos, setProductos] = useState<Catalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [activo, setActivo] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [porEliminar, setPorEliminar] = useState<Catalogo | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const actual = getSesion();
    if (!actual) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion(actual);
  }, [router]);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const lista = await apiFetch<Catalogo[]>("/catalogos");
      setProductos(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sesion) cargar();
  }, [sesion, cargar]);

  function limpiar() {
    setEditandoId(null);
    setNombre("");
    setActivo(true);
  }

  function editar(p: Catalogo) {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setActivo(p.activo);
    setMensaje(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    if (!nombre.trim()) {
      setError("Escribe el nombre del producto");
      return;
    }
    setGuardando(true);
    try {
      if (editandoId) {
        await apiFetch(`/catalogos/${editandoId}`, {
          method: "PATCH",
          body: JSON.stringify({ nombre: nombre.trim(), activo }),
        });
        setMensaje("Producto actualizado");
      } else {
        await apiFetch("/catalogos", {
          method: "POST",
          body: JSON.stringify({ nombre: nombre.trim(), activo }),
        });
        setMensaje("Producto agregado");
      }
      limpiar();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo(p: Catalogo) {
    setError(null);
    setMensaje(null);
    try {
      await apiFetch(`/catalogos/${p.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo: !p.activo }),
      });
      setMensaje(p.activo ? "Producto desactivado" : "Producto activado");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar");
    }
  }

  async function eliminar() {
    if (!porEliminar) return;
    setEliminando(true);
    try {
      await apiFetch(`/catalogos/${porEliminar.id}`, { method: "DELETE" });
      setPorEliminar(null);
      setMensaje("Producto eliminado");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <AppShell titulo="Catálogos">
      <div className="space-y-8">
        <section className="hero-panel p-6 lg:p-7">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[2.4px] text-brand-cyan-500">
              Productos y servicios
            </p>
            <h1 className="mt-2 font-display text-[32px] font-bold leading-none tracking-[-0.5px] text-white">
              Catálogos
            </h1>
            <p className="mt-3 max-w-xl text-[14px] text-white/70">
              Esta es la lista de productos que aparece al registrar una venta
              o una suscripción.
            </p>
          </div>
        </section>

        {error && <p className="text-sm text-danger-500">{error}</p>}
        {mensaje && (
          <p className="text-sm text-success-600 dark:text-success-500">{mensaje}</p>
        )}

        {esGestor && (
          <section className="surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
                {editandoId ? "Editar producto" : "Nuevo producto"}
              </h2>
              {editandoId && (
                <button
                  type="button"
                  onClick={limpiar}
                  className="text-[12px] font-semibold text-body-text hover:text-primary-600"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className={`${labelClass} sm:col-span-2`}>
                <span>Nombre del producto</span>
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Plan Básico"
                  className={inputClass}
                />
              </label>
              <label className={`${labelClass} justify-end`}>
                <span>Estado</span>
                <select
                  value={activo ? "1" : "0"}
                  onChange={(e) => setActivo(e.target.value === "1")}
                  className={inputClass}
                >
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </label>
              <div className="flex items-end sm:col-span-3">
                <button
                  type="submit"
                  disabled={guardando}
                  className="h-[46px] rounded-xl bg-primary-500 px-5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
                >
                  {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Agregar producto"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-light-100 p-6 dark:border-dark-600">
            <h2 className="font-display text-[20px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white">
              Productos
            </h2>
            <p className="text-[12px] text-body-text">
              {productos.length} {productos.length === 1 ? "registro" : "registros"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-light-50 text-[10px] uppercase tracking-[1.5px] text-body-text dark:bg-dark-600">
                  <th className="px-6 py-3 font-semibold">Producto</th>
                  <th className="px-6 py-3 font-semibold">Estado</th>
                  {esGestor && (
                    <th className="px-6 py-3 text-right font-semibold">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={esGestor ? 3 : 2} className="px-6 py-8 text-center text-body-text">
                      Cargando productos…
                    </td>
                  </tr>
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={esGestor ? 3 : 2} className="px-6 py-8 text-center text-body-text">
                      Todavía no hay productos en el catálogo.
                    </td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id} className="table-row-hover border-t border-light-100 dark:border-dark-600">
                      <td className="px-6 py-3.5 text-zinc-900 dark:text-white">
                        {p.nombre}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            p.activo
                              ? "bg-success-500/10 text-success-600 dark:text-success-500"
                              : "bg-light-100 text-body-text dark:bg-dark-600"
                          }`}
                        >
                          {p.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      {esGestor && (
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <AccionTabla
                              etiqueta={`Editar ${p.nombre}`}
                              icono="editar"
                              variante="primario"
                              onClick={() => editar(p)}
                            />
                            <AccionTabla
                              etiqueta={p.activo ? `Desactivar ${p.nombre}` : `Activar ${p.nombre}`}
                              icono={p.activo ? "pausar" : "reactivar"}
                              variante={p.activo ? "aviso" : "exito"}
                              onClick={() => cambiarActivo(p)}
                            />
                            <AccionTabla
                              etiqueta={`Eliminar ${p.nombre}`}
                              icono="anular"
                              variante="peligro"
                              onClick={() => setPorEliminar(p)}
                            />
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
      </div>

      <ConfirmDialog
        abierto={porEliminar !== null}
        titulo="¿Eliminar el producto?"
        mensaje="Se quitará del catálogo. Las ventas y suscripciones ya registradas conservan su nombre."
        detalle={porEliminar?.nombre ?? null}
        textoConfirmar="Eliminar"
        cargando={eliminando}
        onConfirmar={eliminar}
        onCancelar={() => setPorEliminar(null)}
      />
    </AppShell>
  );
}
