import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class PagarPrestamoExternoDto {
  @ApiProperty({ example: 1, description: 'ID del usuario que registra la devolución' })
  @IsInt()
  @IsNotEmpty()
  id_user_update: number;

  @ApiProperty({
    example: 101,
    description:
      'ID de la sesión de caja que recibe la devolución (si se omite se usa la del préstamo)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  caja_sesion_id?: number;
}
