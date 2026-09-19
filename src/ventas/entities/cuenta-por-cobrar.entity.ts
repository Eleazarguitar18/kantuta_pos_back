import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';

@Entity('cuentas_por_cobrar')
export class CuentaPorCobrar extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre del cliente fiado' })
  @Column()
  cliente_nombre: string;

  @ApiProperty({ example: 150.00, description: 'Monto total de la deuda' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @ApiProperty({ example: 'PENDIENTE', enum: ['PENDIENTE', 'PAGADO'] })
  @Column({ default: 'PENDIENTE' })
  estado_cuenta: string;

  @ApiProperty({ description: 'Fecha de emisión del fiado' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_registro: Date;

  @ApiProperty({ description: 'Fecha en que se liquidó la deuda' })
  @Column({ type: 'timestamp', nullable: true })
  fecha_pago: Date;

  @ApiProperty({ example: 'EFECTIVO', nullable: true })
  @Column({ nullable: true })
  metodo_pago_cancelacion: string;

  @ManyToOne(() => Venta)
  @JoinColumn({ name: 'id_venta' })
  venta: Venta;

  @Column({ name: 'id_venta' })
  id_venta: number;
}
