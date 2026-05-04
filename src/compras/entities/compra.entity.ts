import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { DetalleCompra } from './detalle-compra.entity';

@Entity('compra')
export class Compra extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 500.0, description: 'Suma total de la compra' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @ApiProperty({
    example: 'Proveedor Central',
    description: 'Nombre del proveedor o tienda',
  })
  @Column({ nullable: true })
  proveedor: string;

  @ApiProperty({
    example: true,
    description: 'Indica si se descontó de la caja registradora',
  })
  @Column({ default: false })
  pagado_con_caja: boolean;

  @ApiProperty({
    example: 101,
    description: 'ID de la sesión de caja si se pagó con caja',
  })
  @Column({ nullable: true })
  id_sesion_caja: number;

  @OneToMany(() => DetalleCompra, (detalle: DetalleCompra) => detalle.compra, {
    cascade: true,
  })
  detalles: DetalleCompra[];

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
