import { redirect } from "next/navigation";

// La raíz del sitio no tiene pantalla propia: entra directo al resumen.
export default function Home() {
  redirect("/resumen");
}
