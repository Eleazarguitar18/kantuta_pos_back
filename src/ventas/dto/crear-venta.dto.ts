import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  QR = 'QR',
  TRANSFERENCIA = 'TRANSFERENCIA'
}

export class DetalleVentaDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  producto_id: number;

  @ApiProperty({ example: 2, description: 'Cantidad comprada' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 50.00, description: 'Precio de venta actual' })
  @IsNumber()
  @Min(0)
  precio_unitario: number;
}

export class CrearVentaDto {
  @ApiProperty({ example: 'EFECTIVO', enum: MetodoPago })
  @IsEnum(MetodoPago)
  metodo_pago: MetodoPago;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja activa' })
  @IsInt()
  @IsNotEmpty()
  sesion_caja_id: number;

  @ApiProperty({ type: [DetalleVentaDto], description: 'Lista de productos vendidos' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];
}