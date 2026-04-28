import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CrearVentaDto } from './crear-venta.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum EstadoVenta {
  COMPLETADA = 'COMPLETADA',
  ANULADA = 'ANULADA',
  EDITADA = 'EDITADA'
}

// Omitimos los detalles porque la edición de productos individuales 
// se maneja mejor con una lógica aparte para no romper el stock.
export class ActualizarVentaDto extends PartialType(OmitType(CrearVentaDto, ['detalles'] as const)) {
  
  @ApiProperty({ example: 'ANULADA', enum: EstadoVenta, required: false })
  @IsOptional()
  @IsEnum(EstadoVenta)
  estado?: EstadoVenta;

  @ApiProperty({ example: 'El cliente se arrepintió de la compra', required: false })
  @IsOptional()
  @IsString()
  motivo_edicion?: string;
}