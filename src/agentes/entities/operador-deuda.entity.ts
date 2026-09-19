import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { Agente } from './agente.entity';

@Entity('operadores_deuda')
export class OperadorDeuda extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Ruddy', description: 'Nombre del operador que tiene la deuda' })
  @Column()
  nombre_operador: string;

  @ApiProperty({ example: 150.00, description: 'Monto pendiente de devolución' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_pendiente: number;

  @ApiProperty({ example: 'PENDIENTE', enum: ['PENDIENTE', 'PAGADO'] })
  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado_deuda: string;

  @ApiProperty({ description: 'Fecha de registro de la deuda' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_registro: Date;

  @ApiProperty({ description: 'Fecha en que se pagó la deuda', required: false })
  @Column({ type: 'timestamp', nullable: true })
  fecha_pago: Date;

  @ApiProperty({ description: 'Motivo o descripción del préstamo', required: false })
  @Column({ type: 'text', nullable: true })
  motivo: string;

  @ManyToOne(() => Agente)
  @JoinColumn({ name: 'id_agente' })
  agente: Agente;

  @ApiProperty({ example: 1, description: 'ID del agente al que pertenece la deuda' })
  @Column({ name: 'id_agente' })
  id_agente: number;
}
