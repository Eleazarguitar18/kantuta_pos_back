import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { Compra } from './compra.entity';
import { Producto } from 'src/inventario/entities/producto.entity';

@Entity('detalle_compra')
export class DetalleCompra extends BaseEntityAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Compra, (compra: Compra) => compra.detalles)
  @JoinColumn({ name: 'id_compra' })
  compra: Compra;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'id_producto' })
  producto: Producto;

  @Column()
  id_producto: number;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int' })
  cantidad: number;

  @ApiProperty({ example: 45.00 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  costo_unitario: number;

  @ApiProperty({ example: 450.00 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
