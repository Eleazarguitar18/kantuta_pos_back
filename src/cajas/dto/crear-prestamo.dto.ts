import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CrearPrestamoDto {
  @ApiProperty({ example: 101, description: 'ID de la sesión de caja activa' })
  @IsInt()
  @IsNotEmpty()
  id_sesion_caja: number;

  @ApiProperty({ example: 50.00, description: 'Monto a retirar/prestar' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  monto: number;

  @ApiProperty({ example: 'Préstamo para pasajes / movilidad', description: 'Justificación obligatoria' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ example: 1, description: 'ID de usuario que registra' })
  @IsInt()
  @IsNotEmpty()
  id_user_create: number;

  @ApiProperty({ example: 1, description: 'ID de la caja asociada' })
  @IsInt()
  @IsNotEmpty()
  cajaId: number;
}
