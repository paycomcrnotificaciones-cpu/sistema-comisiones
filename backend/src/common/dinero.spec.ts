import { describe, expect, it } from 'vitest';

import {
  aDecimal,
  aNumero,
  aTexto,
  comparar,
  porcentaje,
  sumarATexto,
} from './dinero.js';

// Pruebas del cálculo de dinero. Lo que se busca es que no aparezcan los
// errores de la coma flotante y que el redondeo sea siempre el mismo.
describe('dinero', () => {
  it('suma sin arrastrar el error de la coma flotante', () => {
    expect(aDecimal(0.1).plus(aDecimal(0.2)).toString()).toBe('0.3');
    expect(sumarATexto([0.1, 0.2])).toBe('0.3000');
  });

  it('suma muchos montos con decimales exactos', () => {
    const montos = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7'];
    expect(sumarATexto(montos)).toBe('2.8000');
  });

  it('calcula el porcentaje de una comisión', () => {
    expect(porcentaje('1234.56', 10)).toBe('123.4560');
    expect(porcentaje('100', 2.5)).toBe('2.5000');
  });

  it('redondea a 4 decimales con medio hacia arriba', () => {
    expect(aTexto('1.00005')).toBe('1.0001');
    expect(aTexto('1.00004')).toBe('1.0000');
    expect(aTexto('2.5')).toBe('2.5000');
  });

  it('mantiene la precisión en montos grandes', () => {
    // Con coma flotante este cálculo pierde centavos.
    expect(porcentaje('999999999.9999', 15)).toBe('150000000.0000');
    expect(sumarATexto(['999999999.9999', '0.0001'])).toBe('1000000000.0000');
  });

  it('compara montos sin errores de precisión', () => {
    expect(comparar('0.1', '0.10')).toBe(0);
    expect(comparar('1.0001', '1.0002')).toBe(-1);
    expect(comparar('2', '1.9999')).toBe(1);
  });

  it('convierte a número para un JSON con 2 decimales', () => {
    expect(aNumero('10.005')).toBe(10.01);
    expect(aNumero('10.004')).toBe(10);
    // 10.005 en coma flotante es 10.004999... y redondearía mal.
    expect(aNumero('1.005')).toBe(1.01);
  });

  it('trata nulos y vacíos como cero', () => {
    expect(aTexto(null)).toBe('0.0000');
    expect(sumarATexto([])).toBe('0.0000');
  });

  it('no pierde el signo en montos negativos', () => {
    expect(aTexto('-1.25')).toBe('-1.2500');
    expect(sumarATexto(['10', '-2.5'])).toBe('7.5000');
  });
});
