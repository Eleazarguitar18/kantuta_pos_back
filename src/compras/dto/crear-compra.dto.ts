import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleCompraDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  id_producto: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 45.00 })
  @IsNumber()
  @Min(0)
  costo_unitario: number;
}

export class CrearCompraDto {
  @ApiProperty({ example: 'Proveedor Central', required: false })
  @IsString()
  @IsOptional()
  proveedor?: string;

  @ApiProperty({ example: true, description: '¿Se paga con dinero de la caja?' })
  @IsBoolean()
  pagar_con_caja: boolean;

  @ApiProperty({ example: 101, required: false })
  @IsInt()
  @IsOptional()
  id_sesion_caja?: number;

  @ApiProperty({ type: [DetalleCompraDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleCompraDto)
  detalles: DetalleCompraDto[];

  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}
