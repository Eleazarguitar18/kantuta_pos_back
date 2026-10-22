import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarDevolucionDto {
  @ApiProperty({ example: 50.0, description: 'Monto que se devuelve al banco/agente' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  monto: number;

  @ApiProperty({ example: 'María', description: 'Persona que entregó el dinero de vuelta' })
  @IsString()
  @IsNotEmpty()
  persona_devolucion: string;

  @ApiProperty({ example: 'EFECTIVO', enum: ['EFECTIVO', 'BANCO'], description: 'Destino donde ingresa la devolución', required: false })
  @IsString()
  @IsOptional()
  destino?: string;

  @ApiProperty({ example: 'Devolución parcial del retiro', description: 'Observación de la devolución', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ example: 1, description: 'ID del usuario que registra la devolución' })
  @IsInt()
  @IsNotEmpty()
  id_user_create: number;
}
