import Link from "next/link";

// Página informativa de recuperación. El sistema no envía correos: el
// administrador genera un enlace de un solo uso y lo comparte en privado.
export default function RecuperarPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d1528] p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-brand-cyan-500/20 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[28px] bg-white p-7 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.65)] dark:bg-dark-700 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-primary-600 dark:text-primary-100">
          PayCom CR
        </p>
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.4px] text-zinc-900 dark:text-white">
          Recuperar acceso
        </h1>
        <p className="mt-4 text-sm text-body-text">
          Por seguridad, el sistema no envía contraseñas por correo. Pide a un
          administrador de tu empresa que te genere un{" "}
          <strong>enlace de acceso</strong> y te lo comparta por un medio
          privado.
        </p>
        <ol className="mt-5 space-y-2 text-sm text-body-text">
          <li>1. El administrador abre la pantalla de Usuarios.</li>
          <li>2. Pulsa el botón de enlace en tu cuenta.</li>
          <li>3. Te comparte el enlace y lo abres.</li>
          <li>4. Escribes la contraseña que tú elijas.</li>
        </ol>
        <p className="mt-5 text-[12px] text-body-text">
          El enlace caduca en 48 horas y solo funciona una vez.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
