"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type IconoAccion =
  | "editar"
  | "ver"
  | "clave"
  | "activar"
  | "desactivar"
  | "pausar"
  | "reactivar"
  | "finalizar"
  | "pagar"
  | "anular";

type Variante = "primario" | "exito" | "aviso" | "peligro" | "neutro";

const variantes: Record<Variante, string> = {
  primario:
    "hover:border-primary-500 hover:bg-primary-500/10 hover:text-primary-600 dark:hover:text-primary-100",
  exito:
    "hover:border-success-500 hover:bg-success-500/10 hover:text-success-600 dark:hover:text-success-500",
  aviso:
    "hover:border-warning-500 hover:bg-warning-500/10 hover:text-warning-600",
  peligro:
    "hover:border-danger-500 hover:bg-danger-500/10 hover:text-danger-500",
  neutro:
    "hover:border-dark-500/40 hover:bg-light-50 hover:text-zinc-900 dark:hover:bg-dark-600 dark:hover:text-white",
};

// Dibujo de cada icono según la acción que representa.
function trazos(nombre: IconoAccion): ReactNode {
  switch (nombre) {
    case "editar":
      return (
        <>
          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </>
      );
    case "ver":
      return (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case "clave":
      return (
        <>
          <circle cx="8" cy="15" r="4" />
          <path d="M11 12l9-9" />
          <path d="M17 6l2 2" />
        </>
      );
    case "activar":
    case "desactivar":
      return (
        <>
          <path d="M12 3v9" />
          <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
        </>
      );
    case "pausar":
      return <path d="M9 5v14M15 5v14" />;
    case "reactivar":
      return <path d="M7 4l13 8-13 8V4z" />;
    case "finalizar":
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </>
      );
    case "pagar":
      return (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <path d="M2.5 10h19" />
        </>
      );
    case "anular":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V4h6v3" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M10 11v6M14 11v6" />
        </>
      );
  }
}

interface AccionTablaProps {
  etiqueta: string;
  icono: IconoAccion;
  variante?: Variante;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

// Botón pequeño de acción para las tablas (editar, ver, pagar, anular...).
// Todos usan el mismo tamaño para que las filas se vean parejas;
// cambia el color según la acción y muestra el nombre al pasar el mouse.
export function AccionTabla(props: AccionTablaProps) {
  const { etiqueta, icono, variante = "neutro", onClick, href, disabled } = props;

  const clases = `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-light-100 text-body-text transition-colors dark:border-dark-600 ${variantes[variante]} disabled:cursor-not-allowed disabled:opacity-40`;

  const contenido = (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill={icono === "reactivar" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazos(icono)}
    </svg>
  );

  if (href) {
    return (
      <Link href={href} title={etiqueta} aria-label={etiqueta} className={clases}>
        {contenido}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={etiqueta}
      aria-label={etiqueta}
      className={clases}
    >
      {contenido}
    </button>
  );
}
