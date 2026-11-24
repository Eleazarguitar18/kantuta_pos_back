import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { EstadoPrestamoExterno } from '../entities/prestamo-externo.entity';

export class ActualizarEstadoPrestamoDto {
  @ApiProperty({ example: EstadoPrestamoExterno.PAGADO, enum: EstadoPrestamoExterno })
  @IsEnum(EstadoPrestamoExterno)
  @IsNotEmpty()
  estado: EstadoPrestamoExterno;

  @ApiProperty({
    example: 101,
    description:
      'ID de la sesión de caja que recibe la devolución (debe ser la sesión activa del usuario autenticado; si se omite se usa esa sesión)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  caja_sesion_id?: number;

  @ApiProperty({ example: 1, description: 'ID del usuario que actualiza el estado' })
  @IsInt()
  @IsNotEmpty()
  id_user_update: number;
}
