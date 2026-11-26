import { z } from 'zod';

// Aquí se definen las reglas de lo que se puede recibir en cada endpoint.
// Si un dato no cumple, la petición se rechaza antes de tocar la base.
// También sirve para limpiar: quita espacios, pasa correos a minúscula, etc.

// --- Login ---
// Nueva contraseña (mínimo 6 caracteres, como la clave temporal).
export const cambiarClaveSchema = z.object({
  nueva: z.string().min(10).max(72),
});

export type CambiarClaveInput = z.infer<typeof cambiarClaveSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

// --- Comisionistas ---
export const comisionistaCreateSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().optional(),
});

export type ComisionistaCreateInput = z.infer<typeof comisionistaCreateSchema>;

export const comisionistaUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  activo: z.boolean().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
});

export type ComisionistaUpdateInput = z.infer<typeof comisionistaUpdateSchema>;

// --- Ventas ---
// Los montos llegan como texto para no perder decimales.
const dinero = z.string().regex(/^\d+(\.\d{1,4})?$/, 'Monto Invalido');

export const ventaCreateSchema = z.object({
  comisionistaId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  documento: z.string().trim().max(40).optional(),
  cliente: z.string().trim().max(120).optional(),
  producto: z.string().trim().max(120).optional(),
  categoria: z.string().trim().max(120).optional(),
  catalogoId: z.string().uuid().nullable().optional(),
  bruto: dinero,
  neto: dinero,
  costo: dinero.optional(),
  comisionTipo: z.enum(['PORCENTAJE', 'MONTO_FIJO']).default('PORCENTAJE'),
  comisionValor: dinero.default('0')}).refine((v) => Number(v.neto) <= Number(v.bruto), {
  message: 'El neto no puede ser mayor que el bruto',
  path: ['neto']
}).refine((v) => v.comisionTipo !== 'PORCENTAJE' || Number(v.comisionValor) <= 100, {
  message: 'El porcentaje de comisión no puede ser mayor a 100',
  path: ['comisionValor']
})

export type VentaCreateInput = z.infer<typeof ventaCreateSchema>;

export const ventaUpdateSchema = z
  .object({
    comisionistaId: z.string().uuid().optional(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
      .optional(),
    documento: z.string().trim().max(40).nullable().optional(),
    cliente: z.string().trim().max(120).nullable().optional(),
    producto: z.string().trim().max(120).nullable().optional(),
    categoria: z.string().trim().max(120).nullable().optional(),
    catalogoId: z.string().uuid().nullable().optional(),
    bruto: dinero.optional(),
    neto: dinero.optional(),
    costo: dinero.optional(),
    comisionTipo: z.enum(['PORCENTAJE', 'MONTO_FIJO']).optional(),
    comisionValor: dinero.optional(),
  })
  .refine(
    (v) =>
      v.comisionTipo !== 'PORCENTAJE' ||
      v.comisionValor === undefined ||
      Number(v.comisionValor) <= 100,
    {
      message: 'El porcentaje de comisión no puede ser mayor a 100',
      path: ['comisionValor'],
    },
  );

export type VentaUpdateInput = z.infer<typeof ventaUpdateSchema>;

export const ventaQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  comisionistaId: z.string().uuid().optional(),
  estado: z.enum(['ACTIVA', 'ANULADA']).optional(),
  pago: z.enum(['PENDIENTE', 'PAGADA']).optional(),
  q: z.string().trim().max(100).optional(),
})

export type VentaQueryInput = z.infer<typeof ventaQuerySchema>;


// --- Usuarios ---
export const rolSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'COMISIONISTA',
]);

export const usuarioCreateSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    rol: rolSchema,
    comisionistaId: z.string().uuid().optional(),
  })
  .refine((v) => v.rol !== 'COMISIONISTA' || !!v.comisionistaId, {
    message: 'Selecciona el comisionista para este acceso',
    path: ['comisionistaId'],
  });

export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;

export const usuarioUpdateSchema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  rol: rolSchema.optional(),
  activo: z.boolean().optional(),
  comisionistaId: z.string().uuid().nullable().optional(),
});

export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;

// --- Activación de la cuenta ---
// El enlace trae el token; el usuario elige su propia contraseña.
// Nadie más la conoce: ni el administrador que generó el enlace.
export const activarSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(72),
});

export type ActivarInput = z.infer<typeof activarSchema>;

// --- Liquidaciones ---
const periodo = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido (YYYY-MM)');

// Solo el mes: sirve para preguntar quién tiene algo por liquidar.
export const liquidacionPendientesSchema = z.object({
  mes: periodo,
});

export type LiquidacionPendientesInput = z.infer<
  typeof liquidacionPendientesSchema
>;

export const liquidacionCreateSchema = z.object({
  comisionistaId: z.string().uuid(),
  mes: periodo,
  nota: z.string().trim().max(300).optional(),
});

export type LiquidacionCreateInput = z.infer<typeof liquidacionCreateSchema>;

export const liquidacionQuerySchema = z.object({
  mes: periodo.optional(),
  estado: z.enum(['BORRADOR', 'PAGADA']).optional(),
  comisionistaId: z.string().uuid().optional(),
});

export type LiquidacionQueryInput = z.infer<typeof liquidacionQuerySchema>;

export const liquidacionPagarSchema = z.object({
  metodoPago: z
    .enum(['EFECTIVO', 'SINPE', 'TRANSFERENCIA', 'OTRO'])
    .default('EFECTIVO'),
  nota: z.string().trim().max(300).optional(),
});

export type LiquidacionPagarInput = z.infer<typeof liquidacionPagarSchema>;

// --- Suscripciones ---
export const frecuenciaSchema = z.enum([
  'MENSUAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
  'UNICA',
]);

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');

export const suscripcionCreateSchema = z.object({
  comisionistaId: z.string().uuid(),
  cliente: z.string().trim().min(1).max(120),
  producto: z.string().trim().max(120).optional(),
  catalogoId: z.string().uuid().nullable().optional(),
  monto: dinero,
  frecuenciaCobro: frecuenciaSchema,
  comisionTipo: z.enum(['PORCENTAJE', 'MONTO_FIJO']),
  comisionValor: dinero,
  comisionFrecuencia: frecuenciaSchema,
  inicio: fecha,
  fin: fecha.optional(),
});

export type SuscripcionCreateInput = z.infer<typeof suscripcionCreateSchema>;

export const suscripcionUpdateSchema = suscripcionCreateSchema
  .omit({ comisionistaId: true })
  .partial()
  .extend({ fin: fecha.nullable().optional() });

export type SuscripcionUpdateInput = z.infer<typeof suscripcionUpdateSchema>;

export const suscripcionQuerySchema = z.object({
  estado: z.enum(['ACTIVA', 'PAUSADA', 'FINALIZADA']).optional(),
  comisionistaId: z.string().uuid().optional(),
});

export type SuscripcionQueryInput = z.infer<typeof suscripcionQuerySchema>;

// --- Catálogo de productos ---
// Solo nombre y si está activo. La comisión se define en cada venta.
export const catalogoSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  activo: z.boolean().default(true),
});

export const catalogoUpdateSchema = catalogoSchema.partial();

export type CatalogoInput = z.infer<typeof catalogoSchema>;
export type CatalogoUpdateInput = z.infer<typeof catalogoUpdateSchema>;
