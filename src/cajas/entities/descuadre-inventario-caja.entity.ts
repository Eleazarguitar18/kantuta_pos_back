import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { SesionCaja } from './sesion-caja.entity';
import { Producto } from '../../inventario/entities/producto.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('descuadres_inventario_caja')
export class DescuadreInventarioCaja extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja donde se detectó el descuadre' })
  @Column({ name: 'id_sesion_caja' })
  id_sesion_caja: number;

  @ManyToOne(() => SesionCaja)
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @ApiProperty({ example: 'APERTURA', enum: ['APERTURA', 'CIERRE'], description: 'Momento en que se detectó el descuadre' })
  @Column({ type: 'varchar', length: 20, default: 'APERTURA' })
  origen_descuadre: string; // 'APERTURA' | 'CIERRE'

  @ApiProperty({ example: 'DINERO', enum: ['DINERO', 'PRODUCTO'], description: 'Tipo de descuadre' })
  @Column({ type: 'varchar', length: 20, default: 'PRODUCTO' })
  tipo_descuadre: string; // 'DINERO' | 'PRODUCTO'

  @ApiProperty({ example: 5, description: 'ID del producto afectado (si aplica)', required: false })
  @Column({ name: 'id_producto', nullable: true })
  id_producto?: number;

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'id_producto' })
  producto?: Producto;

  @ApiProperty({ example: 10, description: 'Cantidad esperada en sistema', required: false })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cantidad_esperada?: number;

  @ApiProperty({ example: 8, description: 'Cantidad física declarada por el operador', required: false })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cantidad_declarada?: number;

  @ApiProperty({ example: -2, description: 'Diferencia (declarada - esperada)', required: false })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia_cantidad?: number;

  @ApiProperty({ example: 100.0, description: 'Monto de dinero esperado', required: false })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_esperado?: number;

  @ApiProperty({ example: 80.0, description: 'Monto de dinero declarado', required: false })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_declarado?: number;

  @ApiProperty({ example: -20.0, description: 'Diferencia en dinero (declarado - esperado)', required: false })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_diferencia?: number;

  @ApiProperty({ example: 3, description: 'ID del operador culpable / responsable imputado' })
  @Column({ name: 'operador_culpable_id', nullable: true })
  operador_culpable_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'operador_culpable_id' })
  operador_culpable: Usuario;

  @ApiProperty({ example: 'Faltante de 2 unidades detectado al abrir turno', required: false })
  @Column({ type: 'text', nullable: true })
  motivo?: string;

  @ApiProperty({ example: 'PENDIENTE', enum: ['PENDIENTE', 'RESUELTO', 'JUSTIFICADO'], description: 'Estado de resolución del descuadre' })
  @Column({ type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado_resolucion: string;
}
