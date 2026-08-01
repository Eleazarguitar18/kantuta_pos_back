import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('notificacion_contacto')
export class NotificacionContacto {
  @ApiProperty({ example: 'uuid-generado' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Ruddy Medrano' })
  @Column()
  nombre: string;

  @ApiProperty({ example: '591', default: '591' })
  @Column({ default: '591' })
  codigo_pais: string;

  @ApiProperty({ example: '79678667' })
  @Column()
  telefono: string;

  @ApiProperty({ example: true, default: true })
  @Column({ default: true })
  recibe_stock_bajo: boolean;

  @ApiProperty({ example: false, default: false })
  @Column({ default: false })
  recibe_cierre_caja: boolean;

  @ApiProperty({ example: true, default: true })
  @Column({ default: true })
  activo: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
