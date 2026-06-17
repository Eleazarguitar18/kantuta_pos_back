import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsInt, Min, IsNotEmpty, IsOptional } from 'class-validator';

export class AbrirCajaDto {
  @ApiProperty({ example: 1, description: 'ID de la caja física seleccionada' })
  @IsInt()
  @IsNotEmpty()
  id_caja: number;

  @ApiProperty({ example: 100.00, description: 'Monto con el que se inicia la caja (opcional para Operadores)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_inicial?: number;

  @ApiProperty({ example: 2, description: 'ID del cajero que inicia sesión' })
  @IsInt()
  @IsNotEmpty()
  id_usuario: number;

  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}