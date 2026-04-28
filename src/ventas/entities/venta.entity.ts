import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DetalleVenta } from './detalle-venta.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('venta')
export class Venta {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 150.50, description: 'Suma total de los productos vendidos' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @ApiProperty({ example: 'EFECTIVO', enum: ['EFECTIVO', 'QR', 'TRANSFERENCIA'] })
  @Column()
  metodo_pago: string;

  @ApiProperty({ description: 'Fecha y hora de la transacción' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  // Relación: Una venta pertenece a una sesión de caja específica
  @ApiProperty({ example: 101 })
  @Column()
  sesion_caja_id: number;

  // Relación: Una venta tiene muchos productos en su detalle
  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta, { cascade: true })
  detalles: DetalleVenta[];

  //para actualizacion
  // ... campos anteriores ...

  @ApiProperty({ example: 'COMPLETADA', enum: ['COMPLETADA', 'ANULADA', 'EDITADA'] })
  @Column({ default: 'COMPLETADA' })
  estado: string;

  @ApiProperty({ example: 'Error en el método de pago' })
  @Column({ type: 'text', nullable: true })
  motivo_edicion: string;

  @UpdateDateColumn({ type: 'timestamp' })
  fecha_modificacion: Date;

}