import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Producto } from './producto.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('categoria')
export class Categoria {
  @ApiProperty({ example: 1, description: 'Identificador único de la categoría' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Cargadores', description: 'Nombre descriptivo de la categoría' })
  @Column({ unique: true })
  nombre: string;

  // Relación: Una categoría puede tener muchos productos
  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];
}