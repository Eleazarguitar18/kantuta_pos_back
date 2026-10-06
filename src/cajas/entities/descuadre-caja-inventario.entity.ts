import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { SesionCaja } from './sesion-caja.entity';
import { Producto } from '../../inventario/entities/producto.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('descuadres_caja_inventario')
export class DescuadreCajaInventario extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja' })
  @Column({ name: 'id_sesion_caja' })
  id_sesion_caja: number;

  @ManyToOne(() => SesionCaja, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @ApiProperty({ example: 5, description: 'ID del producto auditado', required: false })
  @Column({ name: 'producto_id', nullable: true })
  producto_id?: number;

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'producto_id' })
  producto?: Producto;

  @ApiProperty({ example: 10, description: 'Cantidad o monto esperado' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cantidad_esperada: number;

  @ApiProperty({ example: 8, description: 'Cantidad o monto físico declarado' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cantidad_declarada: number;

  @ApiProperty({ example: -2, description: 'Diferencia calculada (declarada - esperada)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  diferencia: number;

  @ApiProperty({ example: 'PRODUCTO', enum: ['EFECTIVO', 'PRODUCTO'] })
  @Column({ type: 'varchar', length: 20, default: 'PRODUCTO' })
  tipo: string; // 'EFECTIVO' | 'PRODUCTO'

  @ApiProperty({ example: 3, description: 'ID del operador culpable imputado' })
  @Column({ name: 'operador_culpable_id', nullable: true })
  operador_culpable_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'operador_culpable_id' })
  operador_culpable: Usuario;

  @ApiProperty({ example: 'Faltante detectado en apertura', required: false })
  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @ApiProperty({ example: 'PENDIENTE', enum: ['PENDIENTE', 'RESUELTO', 'JUSTIFICADO'] })
  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado_resolucion: string;
}
