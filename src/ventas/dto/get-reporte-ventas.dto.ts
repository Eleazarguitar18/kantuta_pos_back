import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetReporteVentasDto {
  @ApiProperty({
    example: '2026-06-01',
    description: 'Fecha de inicio del reporte (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida en el body' })
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fechaInicio: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Fecha de fin del reporte (YYYY-MM-DD)',
  })
  @IsNotEmpty({ message: 'La fecha de fin es requerida en el body' })
  @IsDateString(
    {},
    { message: 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fechaFin: string;
}
