import { Suspense } from "react";

import { FormularioActivar } from "./formulario";

// El token llega por la dirección (/activar/<token>). Se lee dentro de
// <Suspense> porque es un dato que solo existe en tiempo de ejecución.
export default function ActivarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <FormularioActivar token={token} />;
}

function Cargando() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1528]">
      <p className="text-sm text-white/60">Cargando enlace…</p>
    </main>
  );
}
