import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
} from 'class-validator';

export class CrearAgenteDto {
  @ApiProperty({
    example: 'Banco BCP',
    description: 'Nombre del banco o agente',
  })
  @IsString()
  @IsNotEmpty()
  nombre_banco: string;

  @ApiProperty({
    example: 1000.0,
    description: 'Capital inicial total asignado al banco',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_total?: number;

  @ApiProperty({
    example: 1000.0,
    description: 'Alias de capital total inicial',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_total_inicial?: number;

  @ApiProperty({
    example: 0.0,
    description: 'Monto en efectivo inicial',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_efectivo?: number;

  @ApiProperty({
    example: 1000.0,
    description: 'Monto inicial en cuenta bancaria',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_banco?: number;

  @ApiProperty({
    example: 'Banco principal de operaciones',
    description: 'Descripción u observaciones del banco',
    required: false,
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'ID del usuario creador',
  })
  @IsNumber()
  @IsOptional()
  id_user_create?: number;
}
