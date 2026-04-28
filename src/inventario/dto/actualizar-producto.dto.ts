import { PartialType } from '@nestjs/swagger';
import { CrearProductoDto } from './crear-producto.dto';

// PartialType hace que todos los campos de CrearProductoDto sean opcionales para el UPDATE
export class ActualizarProductoDto extends PartialType(CrearProductoDto) {}