import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  Min,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export enum TipoOperacionAgente {
  DEPOSITO = 'DEPOSITO',
  RETIRO = 'RETIRO',
  TRANSFERENCIA_QR = 'TRANSFERENCIA_QR',
  PRESTAMO_OPERADOR = 'PRESTAMO_OPERADOR',
  PAGO_OPERADOR = 'PAGO_OPERADOR',
  TRANSFERENCIA_INTERNA = 'TRANSFERENCIA_INTERNA',
  // Alias comunes
  PRESTAMO = 'PRESTAMO',
  COBRO = 'COBRO',
  OTORGAR_PRESTAMO = 'OTORGAR_PRESTAMO',
  COBRAR_OPERADOR = 'COBRAR_OPERADOR',
}

export class CrearTransaccionAgenteDto {
  // Identificadores de Banco (múltiples convenciones)
  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  id_banco?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  banco_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  id_agente?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  agente_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  bancoId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  agenteId?: number;

  // Identificadores de Operador / Usuario
  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  id_operador?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  operador_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  operadorId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  id_usuario?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  usuario_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  usuarioId?: number;

  @ApiProperty({ example: 'Ruddy', required: false })
  @IsString()
  @IsOptional()
  nombre_operador?: string;

  @ApiProperty({ example: 'Ruddy', required: false })
  @IsString()
  @IsOptional()
  operador_nombre?: string;

  @ApiProperty({ example: 'Ruddy', required: false })
  @IsString()
  @IsOptional()
  nombreOperador?: string;

  // Tipo de movimiento
  @ApiProperty({ example: 'PRESTAMO', required: false })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiProperty({ example: 'PRESTAMO_OPERADOR', required: false })
  @IsString()
  @IsOptional()
  tipo_operacion?: string;

  @ApiProperty({ example: 'PRESTAMO_OPERADOR', required: false })
  @IsString()
  @IsOptional()
  tipoOperacion?: string;

  // Monto
  @ApiProperty({ example: 100.0, description: 'Monto a mover' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  monto: number;

  // Origen / Destino / Vía
  @ApiProperty({ example: 'BANCO', required: false })
  @IsString()
  @IsOptional()
  origen?: string;

  @ApiProperty({ example: 'CUENTAS_POR_COBRAR', required: false })
  @IsString()
  @IsOptional()
  destino?: string;

  @ApiProperty({ example: 'BANCO', required: false })
  @IsString()
  @IsOptional()
  via?: string;

  @ApiProperty({ example: 'BANCO', required: false })
  @IsString()
  @IsOptional()
  origen_fondo?: string;

  @ApiProperty({ example: 'BANCO', required: false })
  @IsString()
  @IsOptional()
  origenFondo?: string;

  // Motivo / Observación / Descripción
  @ApiProperty({ example: 'Préstamo de turno tarde', required: false })
  @IsString()
  @IsOptional()
  motivo?: string;

  @ApiProperty({ example: 'Préstamo de turno tarde', required: false })
  @IsString()
  @IsOptional()
  observacion?: string;

  @ApiProperty({ example: 'Préstamo de turno tarde', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;

  // Otros campos bancarios
  @ApiProperty({ example: 'BCP', required: false })
  @IsString()
  @IsOptional()
  banco?: string;

  @ApiProperty({ example: 5.0, required: false })
  @IsNumber()
  @IsOptional()
  comision_cliente?: number;

  @ApiProperty({ example: 5.0, required: false })
  @IsNumber()
  @IsOptional()
  comisionCliente?: number;

  @ApiProperty({ example: 0.5, required: false })
  @IsNumber()
  @IsOptional()
  comision_banco?: number;

  @ApiProperty({ example: 0.5, required: false })
  @IsNumber()
  @IsOptional()
  comisionBanco?: number;

  @ApiProperty({ example: '8827334', required: false })
  @IsString()
  @IsOptional()
  nro_referencia?: string;

  @ApiProperty({ example: '8827334', required: false })
  @IsString()
  @IsOptional()
  nroReferencia?: string;

  @ApiProperty({ example: 101, required: false })
  @IsNumber()
  @IsOptional()
  id_sesion_caja?: number;

  @ApiProperty({ example: 101, required: false })
  @IsNumber()
  @IsOptional()
  sesion_caja_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  id_user_create?: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  id_user_update?: number;
}
