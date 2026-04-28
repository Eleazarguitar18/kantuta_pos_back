import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsInt, Min, IsNotEmpty } from 'class-validator';

export class AbrirCajaDto {
  @ApiProperty({ example: 1, description: 'ID de la caja física seleccionada' })
  @IsInt()
  @IsNotEmpty()
  cajaId: number;

  @ApiProperty({ example: 100.00, description: 'Monto con el que se inicia la caja' })
  @IsNumber()
  @Min(0)
  monto_inicial: number;

  @ApiProperty({ example: 2, description: 'ID del cajero que inicia sesión' })
  @IsInt()
  @IsNotEmpty()
  usuarioId: number;
}