import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DesgloseCortesDto {
  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  billete_200?: number;

  @ApiProperty({ example: 2, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  billete_100?: number;

  @ApiProperty({ example: 3, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  billete_50?: number;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  billete_20?: number;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  billete_10?: number;

  @ApiProperty({ example: 4, description: 'Monedas de 5 Bs', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  moneda_5?: number;

  @ApiProperty({ example: 5, description: 'Monedas de 2 Bs', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  moneda_2?: number;

  @ApiProperty({ example: 10, description: 'Monedas de 1 Bs', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  moneda_1?: number;

  @ApiProperty({ example: 6, description: 'Monedas de 0.50 Bs', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  moneda_050?: number;

  @ApiProperty({ example: 10, description: 'Monedas de 0.20 Bs', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  moneda_020?: number;

  @ApiProperty({ example: 15, description: 'Monedas de 0.10 Bs', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  moneda_010?: number;

  @ApiProperty({ example: 5.5, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monedas_total?: number;

  @ApiProperty({ example: 555.5, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_total_desglose?: number;
}

export class DescuadreProductoItemDto {
  @ApiProperty({ example: 1, description: 'ID del producto verificado' })
  @IsInt()
  @IsNotEmpty()
  producto_id: number;

  @ApiProperty({ example: 5, description: 'Cantidad física real declarada por el operador' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  cantidad_declarada: number;

  @ApiProperty({ example: 'Faltante en mostrador', required: false })
  @IsString()
  @IsOptional()
  observacion?: string;
}

export class AbrirCajaDto {
  @ApiProperty({ example: 1, description: 'ID de la caja física seleccionada' })
  @IsInt()
  @IsNotEmpty()
  id_caja: number;

  @ApiProperty({ example: 100.0, description: 'Monto con el que se inicia la caja' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_inicial?: number;

  @ApiProperty({ example: 100.0, description: 'Monto inicial contado físicamente y declarado' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto_inicial_declarado?: number;

  @ApiProperty({ example: 2, description: 'ID del cajero que inicia sesión' })
  @IsInt()
  @IsNotEmpty()
  id_usuario: number;

  @ApiProperty({ example: 1, description: 'ID del usuario creador' })
  @IsInt()
  @IsNotEmpty()
  id_user_create: number;

  @ApiProperty({ description: 'Observaciones de apertura sobre diferencias encontradas', required: false })
  @IsString()
  @IsOptional()
  observaciones_apertura?: string;

  @ApiProperty({ description: 'Observaciones generales', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({
    description: 'Desglose detallado por cortes de billetes y monedas',
    type: DesgloseCortesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DesgloseCortesDto)
  desglose_cortes?: DesgloseCortesDto;

  @ApiProperty({
    description: 'Lista de auditoría de productos con descuadre detectado',
    type: [DescuadreProductoItemDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DescuadreProductoItemDto)
  descuadres_productos?: DescuadreProductoItemDto[];

  @ApiProperty({
    description: 'Alias lista_descuadres_productos',
    type: [DescuadreProductoItemDto],
    required: false,
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DescuadreProductoItemDto)
  lista_descuadres_productos?: DescuadreProductoItemDto[];

  @ApiProperty({ description: 'Snapshot/Desglose de arqueo inicial al abrir turno', required: false })
  @IsOptional()
  desglose_arqueo?: any;

  @ApiProperty({ description: 'ID del operador saliente responsable de descuadre', required: false })
  @IsInt()
  @IsOptional()
  operador_saliente_id?: number;

  @ApiProperty({ description: 'Alias del ID del operador responsable', required: false })
  @IsInt()
  @IsOptional()
  operador_responsable_id?: number;
}
