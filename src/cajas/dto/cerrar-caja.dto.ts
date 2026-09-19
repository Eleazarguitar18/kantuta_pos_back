import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CerrarCajaDto {
  @ApiProperty({ example: 1450.80, description: 'Efectivo físico contado por el cajero' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monto_real_fisico: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  id_user_update: number;

  @ApiProperty({ description: 'Observación opcional del cierre', required: false })
  @IsOptional()
  @IsString()
  observacion?: string;
}