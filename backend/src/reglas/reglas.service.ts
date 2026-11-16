import { Injectable, NotFoundException } from '@nestjs/common';

import type {
  ReglaComisionInput,
  ReglaComisionUpdateInput,
  ReglaSugerirInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Quita tildes, espacios de los extremos y pasa a minúscula,
// para comparar "Aguacate" con "aguacate " sin que falle.
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// Distancia de Levenshtein: cuenta cuántas letras hay que cambiar para
// convertir un texto en otro. Sirve para tolerar errores de escritura
// ("aguacate" / "aguacatee") sin aceptar cualquier cosa.
function distancia(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  let previa = Array.from({ length: columnas }, (_, i) => i);
  for (let i = 1; i < filas; i++) {
    const actual = [i];
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(
        actual[j - 1] + 1,
        previa[j] + 1,
        previa[j - 1] + costo,
      );
    }
    previa = actual;
  }
  return previa[columnas - 1];
}

// Decide si dos textos se refieren a lo mismo: iguales, uno dentro del otro
// o con hasta dos letras de diferencia. Exige un mínimo de longitud para
// que palabras muy cortas no coincidan por casualidad.
function coincide(a: string, b: string): boolean {
  const textoA = normalizar(a);
  const textoB = normalizar(b);
  if (!textoA || !textoB) return false;
  if (textoA === textoB) return true;
  const corto = Math.min(textoA.length, textoB.length);
  if (corto >= 4 && (textoA.includes(textoB) || textoB.includes(textoA))) {
    return true;
  }
  return corto >= 5 && distancia(textoA, textoB) <= 2;
}

// Convierte un texto AAAA-MM-DD en fecha (a las 6 a.m. de Costa Rica).
// Respeta tres casos: no viene el dato, viene vacío, o viene con fecha.
function aFecha(valor?: string | null): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  return new Date(`${valor}T06:00:00Z`);
}

// Reglas de comisión: son una sugerencia para llenar el formulario de venta.
// No cambian liquidaciones ya hechas ni reemplazan el cálculo de la venta.
@Injectable()
export class ReglasService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista todas las reglas de la empresa, de mayor a menor prioridad
  // (prioridad menor = se revisa primero).
  listar(empresaId: string) {
    return this.prisma.reglaComision.findMany({
      where: { empresaId },
      orderBy: [{ prioridad: 'asc' }, { nombre: 'asc' }],
      include: {
        comisionista: { select: { id: true, nombre: true } },
        sucursal: { select: { id: true, nombre: true } },
      },
    });
  }

  // Nombres de producto que ya existen, sacados de las ventas y de las reglas.
  // El formulario los usa para ofrecer un select en vez de escribir a mano.
  async productos(empresaId: string) {
    const [ventas, reglas] = await Promise.all([
      this.prisma.venta.findMany({
        where: { empresaId, producto: { not: null } },
        select: { producto: true },
        distinct: ['producto'],
      }),
      this.prisma.reglaComision.findMany({
        where: { empresaId, producto: { not: null } },
        select: { producto: true },
        distinct: ['producto'],
      }),
    ]);

    // Se agrupa sin distinguir mayúsculas para no mostrar "aguacate" y
    // "agUACATE" como dos productos distintos; se conserva la primera grafía.
    const nombres = new Map<string, string>();
    for (const fila of [...ventas, ...reglas]) {
      const nombre = fila.producto?.trim();
      if (!nombre) continue;
      const clave = nombre.toLocaleLowerCase('es');
      if (!nombres.has(clave)) nombres.set(clave, nombre);
    }

    return [...nombres.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }

  // Crea una regla y deja vacíos los datos que no corresponden a su ámbito:
  // una regla global no guarda producto, comisionista ni sucursal.
  crear(empresaId: string, input: ReglaComisionInput) {
    return this.prisma.reglaComision.create({
      data: {
        empresaId,
        nombre: input.nombre,
        tipo: input.tipo,
        valor: input.valor,
        ambito: input.ambito,
        producto: input.ambito === 'PRODUCTO' ? (input.producto ?? null) : null,
        comisionistaId:
          input.ambito === 'COMISIONISTA' ? (input.comisionistaId ?? null) : null,
        sucursalId:
          input.ambito === 'SUCURSAL' ? (input.sucursalId ?? null) : null,
        prioridad: input.prioridad,
        acumulable: input.acumulable,
        activa: input.activa,
        vigenciaDesde: aFecha(input.vigenciaDesde) ?? null,
        vigenciaHasta: aFecha(input.vigenciaHasta) ?? null,
      },
    });
  }

  // Actualiza solo los campos que llegan; el resto se queda como estaba.
  async actualizar(
    empresaId: string,
    id: string,
    input: ReglaComisionUpdateInput,
  ) {
    const regla = await this.prisma.reglaComision.findFirst({
      where: { id, empresaId },
    });
    if (!regla) throw new NotFoundException('Regla no encontrada');

    return this.prisma.reglaComision.update({
      where: { id },
      data: {
        ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
        ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
        ...(input.valor !== undefined ? { valor: input.valor } : {}),
        ...(input.ambito !== undefined ? { ambito: input.ambito } : {}),
        ...(input.producto !== undefined
          ? { producto: input.producto || null }
          : {}),
        ...(input.comisionistaId !== undefined
          ? { comisionistaId: input.comisionistaId || null }
          : {}),
        ...(input.sucursalId !== undefined
          ? { sucursalId: input.sucursalId || null }
          : {}),
        ...(input.prioridad !== undefined ? { prioridad: input.prioridad } : {}),
        ...(input.acumulable !== undefined
          ? { acumulable: input.acumulable }
          : {}),
        ...(input.activa !== undefined ? { activa: input.activa } : {}),
        ...(input.vigenciaDesde !== undefined
          ? { vigenciaDesde: aFecha(input.vigenciaDesde) ?? null }
          : {}),
        ...(input.vigenciaHasta !== undefined
          ? { vigenciaHasta: aFecha(input.vigenciaHasta) ?? null }
          : {}),
      },
    });
  }

  // Borra la regla. No afecta ventas ni liquidaciones anteriores.
  async eliminar(empresaId: string, id: string) {
    const regla = await this.prisma.reglaComision.findFirst({
      where: { id, empresaId },
    });
    if (!regla) throw new NotFoundException('Regla no encontrada');
    await this.prisma.reglaComision.delete({ where: { id } });
    return { eliminada: true };
  }

  // Busca la mejor regla para una venta según el producto, el comisionista
  // y la sucursal. Primero descarta las vencidas; luego puntúa cada regla
  // (comisionista 100 > producto 90 > sucursal 80 > global 60) y, si hay
  // empate, gana la de menor prioridad. Las reglas "acumulables" del mismo
  // tipo que la ganadora se suman; las de otro tipo se ignoran.
  async sugerir(empresaId: string, query: ReglaSugerirInput) {
    const ahora = new Date();
    const reglas = await this.prisma.reglaComision.findMany({
      where: {
        empresaId,
        activa: true,
        AND: [
          { OR: [{ vigenciaDesde: null }, { vigenciaDesde: { lte: ahora } }] },
          { OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: ahora } }] },
        ],
      },
      orderBy: [{ prioridad: 'asc' }],
    });

    const producto = query.producto?.trim() ?? '';

    const conPuntaje = reglas
      .map((r) => {
        let puntaje = 0;
        if (r.ambito === 'COMISIONISTA') {
          if (query.comisionistaId && r.comisionistaId === query.comisionistaId) {
            puntaje = 100;
          }
        } else if (r.ambito === 'PRODUCTO') {
          if (producto && r.producto && coincide(r.producto, producto)) {
            puntaje = 90;
          }
        } else if (r.ambito === 'SUCURSAL') {
          if (query.sucursalId && r.sucursalId === query.sucursalId) {
            puntaje = 80;
          }
        } else if (r.ambito === 'GLOBAL') {
          puntaje = producto && coincide(r.nombre, producto) ? 60 : 10;
        }
        return { regla: r, puntaje };
      })
      .filter((item) => item.puntaje > 0);

    conPuntaje.sort((a, b) => {
      if (a.puntaje !== b.puntaje) return b.puntaje - a.puntaje;
      return a.regla.prioridad - b.regla.prioridad;
    });

    const aplicables = conPuntaje;

    const ganadora = aplicables[0]?.regla;
    if (!ganadora) return null;

    const detalle = [
      { nombre: ganadora.nombre, valor: Number(ganadora.valor), tipo: ganadora.tipo },
    ];

    for (const item of aplicables.slice(1)) {
      const otra = item.regla;
      if (!otra.acumulable) continue;
      if (otra.tipo !== ganadora.tipo) continue;
      detalle.push({ nombre: otra.nombre, valor: Number(otra.valor), tipo: otra.tipo });
    }

    const total = detalle.reduce((suma, parte) => suma + parte.valor, 0);

    return {
      id: ganadora.id,
      nombre: ganadora.nombre,
      tipo: ganadora.tipo,
      valor: total,
      ambito: ganadora.ambito,
      acumulable: ganadora.acumulable,
      detalle,
      acumuladas: detalle.length - 1,
    };
  }
}
