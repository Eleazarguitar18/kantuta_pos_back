import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAgenteDto {
  @ApiProperty({ example: 'Agente BCP Principal', required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ example: 1000.0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_total?: number;

  @ApiProperty({ example: 500.0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_efectivo?: number;

  @ApiProperty({ example: 400.0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_banco?: number;

  @ApiProperty({ example: 100.0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_cuentas_por_cobrar?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  id_user_update?: number;
}
