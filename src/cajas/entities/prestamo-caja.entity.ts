import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { SesionCaja } from './sesion-caja.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';

@Entity('prestamos_caja')
export class PrestamoCaja extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 100.00, description: 'Monto prestado o retirado de caja' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @ApiProperty({ example: 'Préstamo de caja a empleado / Gastos de movilidad' })
  @Column()
  motivo: string;

  @ApiProperty({ example: 'PENDIENTE', enum: ['PENDIENTE', 'PAGADO'] })
  @Column({ default: 'PENDIENTE' })
  estado_prestamo: string;

  @ApiProperty({ description: 'Fecha del préstamo o retiro' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_prestamo: Date;

  @ApiProperty({ description: 'Fecha de devolución del dinero' })
  @Column({ type: 'timestamp', nullable: true })
  fecha_devolucion: Date;

  @ManyToOne(() => SesionCaja)
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @Column({ name: 'id_sesion_caja' })
  id_sesion_caja: number;
}
