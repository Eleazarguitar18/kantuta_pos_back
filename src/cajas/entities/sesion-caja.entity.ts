import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { Caja } from './caja.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { CajaDesgloseCortes } from './caja-desglose-cortes.entity';

@Entity('sesiones_caja')
export class SesionCaja extends BaseEntityAudit {
  @ApiProperty({ example: 101 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 200.00, description: 'Efectivo inicial para cambio' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_inicial: number;

  @ApiProperty({ example: 200.00, description: 'Monto inicial esperado según el cierre anterior' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_inicial_esperado: number;

  @ApiProperty({ example: 180.00, description: 'Monto inicial contado físicamente y declarado por el operador entrante' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_inicial_declarado: number;

  @ApiProperty({ example: -20.00, description: 'Diferencia en apertura (monto_inicial_declarado - monto_inicial_esperado)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia_apertura: number;

  @ApiProperty({ description: 'Observaciones registradas en la apertura sobre diferencias o productos' })
  @Column({ type: 'text', nullable: true })
  observaciones_apertura: string;

  @ApiProperty({ example: 3, description: 'ID del operador responsable del descuadre en apertura' })
  @Column({ name: 'operador_responsable_descuadre_id', nullable: true })
  operador_responsable_descuadre_id: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'operador_responsable_descuadre_id' })
  operador_responsable_descuadre: Usuario;

  // Alias para retrocompatibilidad
  @Column({ name: 'operador_responsable_descuadre_apertura_id', nullable: true })
  operador_responsable_descuadre_apertura_id: number;

  @ApiProperty({ example: 1550.50, description: 'Suma de ventas + agentes + inicial' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_final_teorico: number;

  @ApiProperty({ example: 1550.50, description: 'Monto esperado calculado por el sistema al cierre (solo lectura)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_esperado: number;

  @ApiProperty({ example: 1550.00, description: 'Efectivo físico entregado por el cajero' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_final_real: number;

  @ApiProperty({ example: 1550.00, description: 'Conteo físico real reportado por el cajero al cierre' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_real_fisico: number;

  @ApiProperty({ example: -0.50, description: 'Sobrante o faltante de dinero al cierre' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number;

  @ApiProperty({ example: -0.50, description: 'Diferencia de cierre: monto_real_fisico - monto_esperado' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  monto_diferencia: number;

  @ApiProperty({ example: 'CUADRADO', enum: ['CUADRADO', 'SOBRANTE', 'FALTANTE'], description: 'Estado del arqueo de caja' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  estado_arqueo: string;

  @ApiProperty({ description: 'Detalle/Desglose completo de planilla de arqueo' })
  @Column({ type: 'jsonb', nullable: true })
  desglose_arqueo: any;

  @OneToMany(() => CajaDesgloseCortes, (desglose) => desglose.sesion_caja, { nullable: true })
  desglose_cortes_rel: CajaDesgloseCortes[];

  @ApiProperty({ description: 'Observación opcional del cierre de caja' })
  @Column({ type: 'text', nullable: true })
  observacion: string;

  @ApiProperty({ example: 'ABIERTA', enum: ['ABIERTA', 'CERRADA'] })
  @Column({ name: 'estado_sesion', default: 'ABIERTA' })
  estado_sesion: string;

  @ApiProperty({ description: 'Fecha y hora de inicio de turno' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha_apertura: Date;

  @ApiProperty({ description: 'Fecha y hora de finalización de turno' })
  @Column({ type: 'timestamp', nullable: true })
  fecha_cierre: Date;

  @ManyToOne(() => Caja, (caja) => caja.sesiones)
  @JoinColumn({ name: 'id_caja' })
  caja: Caja;

  @Column({ name: 'id_caja' })
  id_caja: number;

  @ApiProperty({ example: 2, description: 'ID del usuario que opera la sesión' })
  @Column({ name: 'id_usuario' })
  id_usuario: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;
}
