import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SesionCaja } from './sesion-caja.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('cajas')
export class Caja {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Caja 03 - Agentes BCP', description: 'Nombre identificador de la caja física' })
  @Column()
  nombre: string;

  @ApiProperty({ 
    example: 'SOLO_AGENTES', 
    enum: ['SOLO_VENTAS', 'SOLO_AGENTES', 'MIXTA'],
    description: 'Define qué tipo de operaciones permite esta caja' 
  })
  @Column({
    type: 'enum',
    enum: ['SOLO_VENTAS', 'SOLO_AGENTES', 'MIXTA'],
    default: 'MIXTA'
  })
  especialidad: string;

  @OneToMany(() => SesionCaja, (sesion) => sesion.caja)
  sesiones: SesionCaja[];
}