import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { ZodType } from 'zod';

// Revisa lo que llega del navegador antes de que entre al controlador.
// Si no cumple las reglas del esquema, devuelve un error con el detalle;
// si cumple, entrega los datos ya limpios (sin espacios de más, en minúscula, etc.).
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const detalle = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      throw new BadRequestException(detalle);
    }
    return result.data;
  }
}
