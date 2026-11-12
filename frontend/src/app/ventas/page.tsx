import { redirect } from "next/navigation";

// /ventas ya no existe como pantalla: las ventas se registran desde el
// perfil de cada comisionista, así que se redirige al listado del equipo.
export default function VentasPage() {
  redirect("/comisionistas");
}
