import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ResolverDescuadreDto {
  @ApiProperty({ example: 'RESUELTO', enum: ['RESUELTO', 'JUSTIFICADO'] })
  @IsIn(['RESUELTO', 'JUSTIFICADO'])
  estado_resolucion: 'RESUELTO' | 'JUSTIFICADO';

  @ApiProperty({
    example: 50,
    description: 'Monto recuperado. Si se omite en RESUELTO se usa la deuda estimada',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_recuperado?: number;

  @ApiProperty({
    example: '2026-11-02T10:30:00.000Z',
    description: 'Fecha de resolución',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fecha_resolucion?: string;

  @ApiProperty({ example: 'Se descontó de nómina', required: false })
  @IsString()
  @IsOptional()
  observacion_resolucion?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  id_user_update: number;
}
