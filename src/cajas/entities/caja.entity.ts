import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SesionCaja } from './sesion-caja.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';

@Entity('cajas')
export class Caja extends BaseEntityAudit {
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

  @ApiProperty({ 
    example: 500.00, 
    description: 'Monto inicial inmutable base con el que se crea la caja' 
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monto_creacion: number;

  @OneToMany(() => SesionCaja, (sesion) => sesion.caja)
  sesiones: SesionCaja[];
}