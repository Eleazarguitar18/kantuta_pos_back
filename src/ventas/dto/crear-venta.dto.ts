import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, Min, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  QR = 'QR',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CUENTA_POR_COBRAR = 'CUENTA_POR_COBRAR',
}

export class DetalleVentaDto {
  @ApiProperty({ example: 1, description: 'ID del producto' })
  @IsInt()
  id_producto: number;

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

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre o cliente (obligatorio si metodo_pago es CUENTA_POR_COBRAR)', required: false })
  @IsOptional()
  @IsString()
  cliente_nombre?: string;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja activa' })
  @IsInt()
  @IsNotEmpty()
  id_sesion_caja: number;

  @ApiProperty({ type: [DetalleVentaDto], description: 'Lista de productos vendidos' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];

  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}