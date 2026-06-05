import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export enum TipoOperacionRecarga {
  COMPRA_SALDO = 'COMPRA_SALDO',
  VENTA_RECARGA = 'VENTA_RECARGA',
}

export class CreateTopUpTransactionDto {
  @ApiProperty({ example: 'VENTA_RECARGA', enum: TipoOperacionRecarga })
  @IsEnum(TipoOperacionRecarga)
  tipo_operacion: TipoOperacionRecarga;

  @ApiProperty({ example: 1, description: 'ID del proveedor de recarga (telefónica)' })
  @IsInt()
  @IsNotEmpty()
  id_proveedor: number;

  @ApiProperty({ example: 50.00, description: 'Monto de la recarga o saldo a comprar' })
  @IsNumber()
  @Min(1.00)
  monto: number;

  @ApiProperty({ example: '78945612', description: 'Número telefónico, requerido para ventas', required: false })
  @IsString()
  @IsOptional()
  numero_telefono?: string;

  @ApiProperty({ example: 'REF-112233', description: 'Número de referencia bancaria o depósito, para compra de saldo', required: false })
  @IsString()
  @IsOptional()
  nro_referencia?: string;

  @ApiProperty({ example: 'comprobantes/recarga.jpg', description: 'Ruta del comprobante de compra de saldo', required: false })
  @IsString()
  @IsOptional()
  url_comprobante?: string;

  @ApiProperty({ example: 10, description: 'ID de la sesión de caja activa' })
  @IsInt()
  @IsNotEmpty()
  id_sesion_caja: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}
