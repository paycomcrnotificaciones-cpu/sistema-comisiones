export function mesActualCostaRica(): string {
  const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0');
  return `${ahora.getUTCFullYear()}-${mes}`;
}

export function rangoMes(mes: string): { desde: Date; hasta: Date } {
  const [anio, numeroMes] = mes.split('-').map(Number);
  return {
    desde: new Date(Date.UTC(anio, numeroMes - 1, 1, 6, 0, 0)),
    hasta: new Date(Date.UTC(anio, numeroMes, 1, 6, 0, 0)),
  };
}

export function mesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}
