import { Decimal } from 'decimal.js';

// Operaciones con dinero. Todo pasa por Decimal para no arrastrar los
// errores de la coma flotante: 0.1 + 0.2 no es 0.30000000000000004.
// Los montos se guardan en la base con 4 decimales.
export const DECIMALES = 4;

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type Monto = Decimal | string | number;

// Convierte cualquier valor a Decimal sin perder precisión.
// Acepta unknown porque los agregados de Prisma llegan sin tipo.
export function aDecimal(valor: unknown): Decimal {
  return new Decimal((valor ?? 0) as Decimal.Value);
}

// Deja el monto con los 4 decimales que usa la base.
export function redondear(valor: Monto): Decimal {
  return aDecimal(valor).toDecimalPlaces(DECIMALES, Decimal.ROUND_HALF_UP);
}

// Texto con 4 decimales, listo para guardar en una columna Decimal.
export function aTexto(valor: Monto): string {
  return redondear(valor).toFixed(DECIMALES);
}

// Suma una lista de montos y devuelve el texto con 4 decimales.
export function sumarATexto(valores: Monto[]): string {
  return valores
    .reduce<Decimal>((total, valor) => total.plus(aDecimal(valor)), new Decimal(0))
    .toDecimalPlaces(DECIMALES, Decimal.ROUND_HALF_UP)
    .toFixed(DECIMALES);
}

// Comisión en porcentaje sobre una base. Ej: 10 % de 12 345,67.
export function porcentaje(base: Monto, valor: Monto): string {
  return aTexto(aDecimal(base).times(aDecimal(valor)).dividedBy(100));
}

// Compara dos montos: -1 si a < b, 0 si son iguales, 1 si a > b.
export function comparar(a: Monto, b: Monto): number {
  return aDecimal(a).comparedTo(aDecimal(b));
}

// Para mostrar o devolver en un JSON: número con 2 decimales.
export function aNumero(valor: Monto, decimales = 2): number {
  return aDecimal(valor).toDecimalPlaces(decimales, Decimal.ROUND_HALF_UP).toNumber();
}
