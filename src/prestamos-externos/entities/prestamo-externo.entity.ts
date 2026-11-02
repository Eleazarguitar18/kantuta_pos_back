import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SesionCaja } from '../../cajas/entities/sesion-caja.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

export enum EstadoPrestamoExterno {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
}

@Entity('prestamos_externos')
export class PrestamoExterno {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja de donde salió el dinero' })
  @Column({ name: 'caja_sesion_id' })
  caja_sesion_id: number;

  @ManyToOne(() => SesionCaja, { nullable: false })
  @JoinColumn({ name: 'caja_sesion_id' })
  caja_sesion: SesionCaja;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre libre de la persona externa solicitante' })
  @Column({ length: 150 })
  solicitante_externo: string;

  @ApiProperty({ example: 1, description: 'ID del usuario que autorizó el préstamo' })
  @Column({ name: 'autorizador_id' })
  autorizador_id: number;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'autorizador_id' })
  autorizador: Usuario;

  @ApiProperty({ example: 100.0, description: 'Monto prestado a la persona externa' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @ApiProperty({ example: 'Emergencia familiar', description: 'Motivo del préstamo externo' })
  @Column({ type: 'text' })
  motivo: string;

  @ApiProperty({ example: EstadoPrestamoExterno.PENDIENTE, enum: EstadoPrestamoExterno })
  @Column({
    type: 'enum',
    enum: EstadoPrestamoExterno,
    default: EstadoPrestamoExterno.PENDIENTE,
  })
  estado: EstadoPrestamoExterno;

  @ApiProperty({ description: 'Fecha y hora del préstamo externo' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_prestamo: Date;

  @ApiProperty({ description: 'Fecha y hora de devolución del préstamo externo', required: false })
  @Column({ type: 'timestamp', nullable: true })
  fecha_devolucion: Date | null;

  @ApiProperty({
    example: 101,
    description: 'Sesión de caja donde se recibió la devolución',
    required: false,
  })
  @Column({ name: 'id_sesion_devolucion', type: 'int', nullable: true })
  id_sesion_devolucion: number | null;

  @ApiProperty({ example: 1, description: 'ID del usuario que registró el préstamo', required: false })
  @Column({ nullable: true })
  id_user_create: number;

  @ApiProperty({ example: 1, description: 'ID del usuario que actualizó el préstamo', required: false })
  @Column({ nullable: true })
  id_user_update?: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
