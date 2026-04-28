import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SesionCaja } from './sesion-caja.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('movimientos_caja')
export class MovimientoCaja {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ 
    example: 'EGRESO', 
    enum: ['INGRESO', 'EGRESO'], 
    description: 'Define si el dinero entra o sale de la caja' 
  })
  @Column({
    type: 'enum',
    enum: ['INGRESO', 'EGRESO']
  })
  tipo: string;

  @ApiProperty({ example: 15.50, description: 'Monto del movimiento' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @ApiProperty({ example: 'Pago de refrigerio', description: 'Justificación del movimiento' })
  @Column()
  motivo: string;

  @ApiProperty({ description: 'Fecha y hora exacta del registro' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  // Relación: Todo movimiento debe pertenecer a una sesión de caja activa
  @ManyToOne(() => SesionCaja)
  @JoinColumn({ name: 'sesion_caja_id' })
  sesion_caja: SesionCaja;

  @Column()
  sesion_caja_id: number;
}