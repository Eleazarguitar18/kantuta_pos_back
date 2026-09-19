import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';

@Entity('agentes')
export class Agente extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Banco BCP', description: 'Nombre del banco o agente' })
  @Column({ name: 'nombre_banco' })
  nombre_banco: string;

  @ApiProperty({ example: 1000.0, description: 'Capital total constante (Efectivo + Banco + Cuentas por Cobrar)' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_total: number;

  @ApiProperty({ example: 0.0, description: 'Efectivo disponible en caja del banco/agente' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_efectivo: number;

  @ApiProperty({ example: 1000.0, description: 'Saldo disponible en la cuenta bancaria' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_banco: number;

  @ApiProperty({ example: 0.0, description: 'Suma de deudas pendientes de operadores para este banco' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_cuentas_por_cobrar: number;

  @ApiProperty({ example: 'Banco principal de operaciones', description: 'Descripción opcional del banco/agente', required: false })
  @Column({ type: 'text', nullable: true })
  descripcion: string;
}
