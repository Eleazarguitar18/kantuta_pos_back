import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Caja } from './caja.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sesiones_caja')
export class SesionCaja {
  @ApiProperty({ example: 101 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 200.00, description: 'Efectivo inicial para cambio' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_inicial: number;

  @ApiProperty({ example: 1550.50, description: 'Suma de ventas + agentes + inicial' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_final_teorico: number;

  @ApiProperty({ example: 1550.00, description: 'Efectivo físico entregado por el cajero' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_final_real: number;

  @ApiProperty({ example: -0.50, description: 'Sobrante o faltante de dinero' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number;

  @ApiProperty({ example: 'ABIERTA', enum: ['ABIERTA', 'CERRADA'] })
  @Column({ default: 'ABIERTA' })
  estado: string;

  @ApiProperty({ description: 'Fecha y hora de inicio de turno' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_apertura: Date;

  @ApiProperty({ description: 'Fecha y hora de finalización de turno' })
  @Column({ type: 'timestamp', nullable: true })
  fecha_cierre: Date;

  @ManyToOne(() => Caja, (caja) => caja.sesiones)
  @JoinColumn({ name: 'caja_id' })
  caja: Caja;

  @ApiProperty({ example: 2, description: 'ID del usuario que opera la sesión' })
  @Column()
  usuario_id: number;
}