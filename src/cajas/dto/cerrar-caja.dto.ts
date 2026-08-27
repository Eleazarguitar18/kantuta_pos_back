import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsNotEmpty, IsOptional } from 'class-validator';

export class CerrarCajaDto {
  @ApiProperty({ example: 1450.80, description: 'Total de efectivo físico contado' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monto_final_real: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  id_user_update: number;

  @ApiProperty({ description: 'Desglose detallado del arqueo de caja', required: false })
  @IsOptional()
  desglose_arqueo?: any;
}