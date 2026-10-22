import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CrearPrestamoExternoDto {
  @ApiProperty({
    example: 101,
    description: 'ID de la sesión de caja activa (si se omite se usa la del usuario que registra)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  caja_sesion_id?: number;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre libre del solicitante externo' })
  @IsString()
  @IsNotEmpty()
  solicitante_externo: string;

  @ApiProperty({ example: 1, description: 'ID del usuario que autoriza el préstamo', required: false })
  @IsInt()
  @IsOptional()
  autorizador_id?: number;

  @ApiProperty({
    example: 1,
    description: 'Alias de autorizador_id (compatibilidad con el frontend)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  id_autorizador?: number;

  @ApiProperty({ example: 100.0, description: 'Monto a prestar desde caja' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  monto: number;

  @ApiProperty({ example: 'Apoyo temporal por emergencia', description: 'Motivo obligatorio del préstamo' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ example: 1, description: 'ID del usuario que registra el préstamo' })
  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}
