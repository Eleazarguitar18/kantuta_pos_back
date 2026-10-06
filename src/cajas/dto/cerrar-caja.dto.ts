import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DesgloseCortesDto, DescuadreProductoItemDto } from './abrir-caja.dto';

export class CerrarCajaDto {
  @ApiProperty({ example: 1450.80, description: 'Efectivo físico contado por el cajero' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_real_fisico?: number;

  @ApiProperty({ example: 1450.80, description: 'Alias de monto físico declarado al cierre' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_final_declarado?: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  id_user_update: number;

  @ApiProperty({ description: 'Observación opcional del cierre', required: false })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiProperty({ description: 'Observaciones generales', required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ description: 'Observación de cierre alias', required: false })
  @IsOptional()
  @IsString()
  observacion_cierre?: string;

  @ApiProperty({ description: 'Observaciones de cierre alias', required: false })
  @IsOptional()
  @IsString()
  observaciones_cierre?: string;

  @ApiProperty({
    description: 'Desglose detallado por cortes de billetes y monedas al cierre',
    type: DesgloseCortesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesgloseCortesDto)
  desglose_cortes?: DesgloseCortesDto;

  @ApiProperty({
    description: 'Lista de auditoría de productos con descuadre al cierre',
    type: [DescuadreProductoItemDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DescuadreProductoItemDto)
  descuadres_productos?: DescuadreProductoItemDto[];
}
