import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsNotEmpty } from 'class-validator';

export class CerrarCajaDto {
  @ApiProperty({ example: 1450.80, description: 'Total de efectivo físico contado' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monto_final_real: number;
}