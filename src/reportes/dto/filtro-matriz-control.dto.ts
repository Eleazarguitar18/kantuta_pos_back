import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FiltroMatrizControlDto {
  @ApiProperty({ example: 3, description: 'Mes del reporte (1-12)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mes: number;

  @ApiProperty({ example: 2026, description: 'Año del reporte' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtra la matriz por caja física',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_caja?: number;
}
