import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from './categoria.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('producto')
export class Producto {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Cargador Carga Rápida 20W' })
  @Column()
  nombre: string;

  @ApiProperty({ example: '750123456789', required: false, description: 'Código de barras para búsqueda rápida' })
  @Column({ nullable: true })
  codigo_barras: string;

  @ApiProperty({ example: 85.50, description: 'Precio asignado para la venta al público' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precio_venta: number;

  @ApiProperty({ example: 45.00, description: 'Costo de adquisición del producto' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  costo_compra: number;

  @ApiProperty({ example: 20, description: 'Cantidad física disponible en estante' })
  @Column({ type: 'int', default: 0 })
  stock_actual: number;

  @ApiProperty({ example: 5, description: 'Nivel mínimo para generar alertas de reposición' })
  @Column({ type: 'int', default: 3 })
  stock_minimo: number;

  // Relación: Muchos productos pertenecen a una sola categoría
  @ManyToOne(() => Categoria, (categoria) => categoria.productos, { eager: true })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;
}