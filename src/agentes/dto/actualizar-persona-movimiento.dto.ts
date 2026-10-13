import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ActualizarPersonaMovimientoDto {
  @ApiProperty({ example: 'Ruddy', description: 'Nombre corregido de quien retiró el dinero', required: false })
  @IsString()
  @IsOptional()
  persona_retiro?: string;

  @ApiProperty({ example: 'María', description: 'Nombre corregido de quien devolvió el dinero', required: false })
  @IsString()
  @IsOptional()
  persona_devolucion?: string;

  @ApiProperty({ example: 1, description: 'ID del usuario que realiza la corrección' })
  @IsInt()
  @IsNotEmpty()
  id_user_update: number;
}
