import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { Agente } from './agente.entity';

@Entity('transacciones_agente')
export class TransaccionAgente extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'BCP', description: 'Banco o servicio (BCP, TIGO_MONEY, SOLI, BANCO_UNION)' })
  @Column({ nullable: true })
  banco: string;

  @ApiProperty({
    example: 'PRESTAMO_OPERADOR',
    enum: ['DEPOSITO', 'RETIRO', 'TRANSFERENCIA_QR', 'PRESTAMO_OPERADOR', 'PAGO_OPERADOR', 'TRANSFERENCIA_INTERNA'],
    description: 'Tipo de operación financiera'
  })
  @Column({
    type: 'enum',
    enum: ['DEPOSITO', 'RETIRO', 'TRANSFERENCIA_QR', 'PRESTAMO_OPERADOR', 'PAGO_OPERADOR', 'TRANSFERENCIA_INTERNA']
  })
  tipo_operacion: string;

  @ApiProperty({ example: 500.0, description: 'Monto de la operación' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @ApiProperty({ example: 2.0, description: 'Comisión que la tienda cobra al cliente por el servicio' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  comision_cliente: number;

  @ApiProperty({ example: 0.5, description: 'Comisión que el banco paga a la tienda' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  comision_banco: number;

  @ApiProperty({ example: 'REF-12345678', description: 'Número de comprobante o referencia del banco' })
  @Column({ unique: true, nullable: true })
  nro_referencia: string;

  @ApiProperty({ example: 'storage/comprobantes/recibo_01.jpg', description: 'Ruta de la imagen del comprobante' })
  @Column({ nullable: true })
  url_comprobante: string;

  @ApiProperty({ description: 'Fecha y hora del registro' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  @ApiProperty({ example: 'BANCO', enum: ['EFECTIVO', 'BANCO', 'CUENTAS_POR_COBRAR'], description: 'Origen del movimiento de capital' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  origen: string;

  @ApiProperty({ example: 'CUENTAS_POR_COBRAR', enum: ['EFECTIVO', 'BANCO', 'CUENTAS_POR_COBRAR'], description: 'Destino del movimiento de capital' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  destino: string;

  @ApiProperty({ example: 'Ruddy', description: 'Nombre del operador involucrado (para préstamos/pagos)' })
  @Column({ nullable: true })
  nombre_operador: string;

  @ApiProperty({ example: 'Préstamo para cambio', description: 'Descripción o motivo del movimiento' })
  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @ManyToOne(() => SesionCaja)
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @ApiProperty({ example: 101, description: 'Sesión de caja donde se realizó el movimiento' })
  @Column({ name: 'id_sesion_caja', nullable: true })
  id_sesion_caja: number;

  @ManyToOne(() => Agente)
  @JoinColumn({ name: 'id_agente' })
  agente: Agente;

  @ApiProperty({ example: 1, description: 'ID del banco/agente al que pertenece la transacción' })
  @Column({ name: 'id_agente' })
  id_agente: number;

  @ApiProperty({ example: 2, description: 'ID del usuario que realizó la operación' })
  @Column({ nullable: true })
  id_usuario: number;
}
