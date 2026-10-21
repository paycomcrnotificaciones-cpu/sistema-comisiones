import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const comisionistaCreateSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  codigo: z.string().trim().max(40).optional(),
  sucursalId: z.string().uuid(),
});

export type ComisionistaCreateInput = z.infer<typeof comisionistaCreateSchema>;
