import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Caja } from './caja.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';

@Entity('sesiones_caja')
export class SesionCaja extends BaseEntityAudit {
  @ApiProperty({ example: 101 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 200.00, description: 'Efectivo inicial para cambio' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_inicial: number;

  @ApiProperty({ example: 1550.50, description: 'Suma de ventas + agentes + inicial' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_final_teorico: number;

  @ApiProperty({ example: 1550.50, description: 'Monto esperado calculado por el sistema (solo lectura)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_esperado: number;

  @ApiProperty({ example: 1550.00, description: 'Efectivo físico entregado por el cajero' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_final_real: number;

  @ApiProperty({ example: 1550.00, description: 'Conteo físico real reportado por el cajero' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_real_fisico: number;

  @ApiProperty({ example: -0.50, description: 'Sobrante o faltante de dinero' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number;

  @ApiProperty({ example: -0.50, description: 'Diferencia: monto_real_fisico - monto_esperado' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_diferencia: number;

  @ApiProperty({ example: 'CUADRADO', enum: ['CUADRADO', 'SOBRANTE', 'FALTANTE'], description: 'Estado del arqueo de caja' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  estado_arqueo: string;

  @ApiProperty({ description: 'Detalle/Desglose completo de planilla de arqueo' })
  @Column({ type: 'jsonb', nullable: true })
  desglose_arqueo: any;

  @ApiProperty({ description: 'Observación opcional del cierre de caja' })
  @Column({ type: 'text', nullable: true })
  observacion: string;

  @ApiProperty({ example: 'ABIERTA', enum: ['ABIERTA', 'CERRADA'] })
  @Column({ name: 'estado_sesion', default: 'ABIERTA' })
  estado_sesion: string;

  @ApiProperty({ description: 'Fecha y hora de inicio de turno' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_apertura: Date;

  @ApiProperty({ description: 'Fecha y hora de finalización de turno' })
  @Column({ type: 'timestamp', nullable: true })
  fecha_cierre: Date;

  @ManyToOne(() => Caja, (caja) => caja.sesiones)
  @JoinColumn({ name: 'id_caja' })
  caja: Caja;

  @Column({ name: 'id_caja' })
  id_caja: number;

  @ApiProperty({ example: 2, description: 'ID del usuario que opera la sesión' })
  @Column({ name: 'id_usuario' })
  id_usuario: number;
}