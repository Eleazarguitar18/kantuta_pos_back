import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InitialBalanceDto {
  @ApiProperty({ example: 1, description: 'ID del proveedor de recargas' })
  @IsInt()
  @IsNotEmpty()
  id_proveedor: number;

  @ApiProperty({ example: 100.00, description: 'Saldo inicial de la línea' })
  @IsNumber()
  saldo_inicial: number;
}

export class OpenSessionTopUpDto {
  @ApiProperty({ example: 10, description: 'ID de la sesión de caja abierta' })
  @IsInt()
  @IsNotEmpty()
  id_sesion_caja: number;

  @ApiProperty({ type: [InitialBalanceDto], description: 'Listado de saldos iniciales por proveedor' })
  @ValidateNested({ each: true })
  @Type(() => InitialBalanceDto)
  saldos: InitialBalanceDto[];

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}
