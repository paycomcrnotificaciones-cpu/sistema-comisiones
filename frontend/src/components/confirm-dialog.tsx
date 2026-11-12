"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  detalle?: string | null;
  textoConfirmar?: string;
  variante?: "danger" | "primary";
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Ventana de confirmación que se usa en toda la app (borrar, anular, pagar).
// Evita el window.confirm del navegador y se puede cerrar con Escape
// o tocando el fondo. Mientras "cargando" está activo no deja cerrarla.
export function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  detalle,
  textoConfirmar = "Confirmar",
  variante = "danger",
  cargando = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!abierto) return;
    // Permite cerrar el modal con la tecla Escape.
  function alPresionar(event: KeyboardEvent) {
      if (event.key === "Escape" && !cargando) onCancelar();
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto, cargando, onCancelar]);

  if (!abierto) return null;

  const peligro = variante === "danger";

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!cargando) onCancelar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titulo"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-light-100 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(10,18,38,0.65)] dark:border-dark-600 dark:bg-dark-700"
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              peligro
                ? "bg-danger-500/10 text-danger-500"
                : "bg-primary-500/10 text-primary-600 dark:text-primary-100"
            }`}
          >
            <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
              {peligro ? (
                <>
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </>
              )}
            </svg>
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-titulo"
              className="font-display text-[19px] font-bold tracking-[-0.3px] text-zinc-900 dark:text-white"
            >
              {titulo}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-body-text">
              {mensaje}
            </p>
            {detalle && (
              <p className="mt-2 rounded-lg bg-light-50 px-3 py-2 text-[12px] font-medium text-zinc-900 dark:bg-dark-600 dark:text-white">
                {detalle}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
            className="h-[42px] rounded-xl border border-light-100 px-4 text-sm font-semibold text-body-text transition-colors hover:bg-light-50 disabled:opacity-50 dark:border-dark-600 dark:hover:bg-dark-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={cargando}
            className={`h-[42px] rounded-xl px-5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              peligro
                ? "bg-danger-500 hover:bg-danger-600"
                : "bg-primary-500 hover:bg-primary-600"
            }`}
          >
            {cargando ? "Procesando…" : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
