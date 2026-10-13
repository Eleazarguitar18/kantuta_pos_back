import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AjustarCapitalDto {
  @ApiProperty({ example: 2500.0, description: 'Nuevo capital total del banco/agente' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monto_total: number;

  @ApiProperty({ example: 'Corrección autorizada por arqueo administrativo', description: 'Motivo del ajuste de capital' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ example: 'BANCO', enum: ['EFECTIVO', 'BANCO'], description: 'Componente donde se aplica la diferencia del ajuste', required: false })
  @IsString()
  @IsOptional()
  destino_ajuste?: string;

  @ApiProperty({ example: 1, description: 'ID del administrador que autoriza el ajuste' })
  @IsInt()
  @IsNotEmpty()
  id_admin: number;
}
