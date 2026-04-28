import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, IsNotEmpty, IsInt } from 'class-validator';

export enum TipoMovimiento {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

export class CrearMovimientoDto {
  @ApiProperty({ example: 'EGRESO', enum: TipoMovimiento })
  @IsEnum(TipoMovimiento)
  tipo: TipoMovimiento;

  @ApiProperty({ example: 25.00, description: 'Cantidad de dinero' })
  @IsNumber()
  @Min(0.10)
  monto: number;

  @ApiProperty({ example: 'Compra de bolsas para empaque', description: 'Razón del movimiento' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja actual' })
  @IsInt()
  @IsNotEmpty()
  sesion_caja_id: number;
}