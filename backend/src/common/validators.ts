import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const comisionistaCreateSchema = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    codigo: z.string().trim().max(40).optional(),
    sucursalId: z.string().uuid(),
    email: z.string().trim().toLowerCase().email().optional(),
    password: z.string().min(8).max(72).optional(),
  })
  .refine((v) => (!v.email && !v.password) || (!!v.email && !!v.password), {
    message: 'Indica email y contraseña para crear el acceso',
    path: ['email'],
  });

export type ComisionistaCreateInput = z.infer<typeof comisionistaCreateSchema>;

export const comisionistaUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  codigo: z.string().trim().max(40).nullable().optional(),
  sucursalId: z.string().uuid().optional(),
  activo: z.boolean().optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(72).optional(),
});

export type ComisionistaUpdateInput = z.infer<typeof comisionistaUpdateSchema>;

const dinero = z.string().regex(/^\d+(\.\d{1,4})?$/, 'Monto Invalido');

export const ventaCreateSchema = z.object({
  sucursalId: z.string().uuid(),
  comisionistaId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  documento: z.string().trim().max(40).optional(),
  cliente: z.string().trim().max(120).optional(),
  producto: z.string().trim().max(120).optional(),
  categoria: z.string().trim().max(120).optional(),
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
    sucursalId: z.string().uuid().optional(),
    comisionistaId: z.string().uuid().optional(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
      .optional(),
    documento: z.string().trim().max(40).nullable().optional(),
    cliente: z.string().trim().max(120).nullable().optional(),
    producto: z.string().trim().max(120).nullable().optional(),
    categoria: z.string().trim().max(120).nullable().optional(),
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
  sucursalId: z.string().uuid().optional(),
  estado: z.enum(['ACTIVA', 'ANULADA']).optional(),
  pago: z.enum(['PENDIENTE', 'PAGADA']).optional(),
  q: z.string().trim().max(100).optional(),
})

export type VentaQueryInput = z.infer<typeof ventaQuerySchema>;


export const rolSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'COMISIONISTA',
]);

export const usuarioCreateSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72),
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
  password: z.string().min(8).max(72).optional(),
  rol: rolSchema.optional(),
  activo: z.boolean().optional(),
});

export type UsuarioUpdateInput = z.infer<typeof usuarioUpdateSchema>;

export const sucursalCreateSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  codigo: z.string().trim().max(40).optional(),
});

export type SucursalCreateInput = z.infer<typeof sucursalCreateSchema>;

export const sucursalUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  codigo: z.string().trim().max(40).nullable().optional(),
});

export type SucursalUpdateInput = z.infer<typeof sucursalUpdateSchema>;

const periodo = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido (YYYY-MM)');

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

export const metaQuerySchema = z.object({
  mes: periodo,
});

export type MetaQueryInput = z.infer<typeof metaQuerySchema>;

export const metaUpsertSchema = z.object({
  mes: periodo,
  monto: z.coerce.number().min(0).nullable(),
  comisionistaId: z.string().uuid().nullable().optional(),
});

export type MetaUpsertInput = z.infer<typeof metaUpsertSchema>;

const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

const reglaComisionBase = z.object({
  nombre: z.string().trim().min(1).max(120),
  tipo: z.enum(['PORCENTAJE', 'MONTO_FIJO']),
  valor: z.coerce.number().min(0),
  ambito: z
    .enum(['GLOBAL', 'PRODUCTO', 'COMISIONISTA', 'SUCURSAL'])
    .default('GLOBAL'),
  producto: z.string().trim().max(120).nullable().optional(),
  comisionistaId: z.string().uuid().nullable().optional(),
  sucursalId: z.string().uuid().nullable().optional(),
  prioridad: z.coerce.number().int().min(1).max(999).default(100),
  acumulable: z.boolean().default(false),
  activa: z.boolean().default(true),
  vigenciaDesde: fechaOpcional,
  vigenciaHasta: fechaOpcional,
});

export const reglaComisionSchema = reglaComisionBase
  .refine((v) => v.ambito !== 'PRODUCTO' || !!v.producto, {
    message: 'Indica el producto de la regla',
    path: ['producto'],
  })
  .refine((v) => v.ambito !== 'COMISIONISTA' || !!v.comisionistaId, {
    message: 'Indica el comisionista de la regla',
    path: ['comisionistaId'],
  })
  .refine((v) => v.ambito !== 'SUCURSAL' || !!v.sucursalId, {
    message: 'Indica la sucursal de la regla',
    path: ['sucursalId'],
  });

export const reglaComisionUpdateSchema = reglaComisionBase.partial();

export type ReglaComisionInput = z.infer<typeof reglaComisionSchema>;
export type ReglaComisionUpdateInput = z.infer<
  typeof reglaComisionUpdateSchema
>;

export const reglaSugerirSchema = z.object({
  producto: z.string().trim().max(120).optional(),
  comisionistaId: z.string().uuid().optional(),
  sucursalId: z.string().uuid().optional(),
});

export type ReglaSugerirInput = z.infer<typeof reglaSugerirSchema>;
