import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FinalBalanceDto {
  @ApiProperty({ example: 1, description: 'ID del proveedor de recargas' })
  @IsInt()
  @IsNotEmpty()
  id_proveedor: number;

  @ApiProperty({ example: 120.00, description: 'Saldo real físico medido al final del turno' })
  @IsNumber()
  saldo_final_real: number;
}

export class CloseSessionTopUpDto {
  @ApiProperty({ type: [FinalBalanceDto], description: 'Listado de saldos finales por proveedor' })
  @ValidateNested({ each: true })
  @Type(() => FinalBalanceDto)
  saldos: FinalBalanceDto[];

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsNotEmpty()
  id_user_update: number;
}
