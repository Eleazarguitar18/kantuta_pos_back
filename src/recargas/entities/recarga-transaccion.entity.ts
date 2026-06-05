import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { RecargaProveedor } from './recarga-proveedor.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';

@Entity('recargas_transacciones')
export class RecargaTransaccion extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'COMPRA_SALDO', enum: ['COMPRA_SALDO', 'VENTA_RECARGA'] })
  @Column({
    type: 'enum',
    enum: ['COMPRA_SALDO', 'VENTA_RECARGA'],
  })
  tipo_operacion: 'COMPRA_SALDO' | 'VENTA_RECARGA';

  @ManyToOne(() => RecargaProveedor)
  @JoinColumn({ name: 'id_proveedor' })
  proveedor: RecargaProveedor;

  @ApiProperty({ example: 1 })
  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @ApiProperty({ example: 100.00, description: 'Monto de la transacción (efectivo de caja)' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @ApiProperty({ example: 5.00, description: 'Porcentaje de comisión al momento del registro' })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  comision_porcentaje: number;

  @ApiProperty({ example: 5.00, description: 'Monto de comisión calculado' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  comision_monto: number;

  @ApiProperty({ example: 105.00, description: 'Monto neto acreditado o debitado del saldo de la línea' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto_saldo_acreditado: number;

  @ApiProperty({ example: '78945612', description: 'Número de teléfono para el caso de VENTA_RECARGA', nullable: true })
  @Column({ name: 'numero_telefono', nullable: true })
  numero_telefono: string;

  @ApiProperty({ example: 'REF-887766', description: 'Número de comprobante o depósito para COMPRA_SALDO', nullable: true })
  @Column({ name: 'nro_referencia', nullable: true })
  nro_referencia: string;

  @ApiProperty({ example: 'comprobantes/recarga_01.png', description: 'URL de la foto del comprobante', nullable: true })
  @Column({ name: 'url_comprobante', nullable: true })
  url_comprobante: string;

  @ManyToOne(() => SesionCaja)
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @ApiProperty({ example: 10 })
  @Column({ name: 'id_sesion_caja' })
  id_sesion_caja: number;

  @ApiProperty({ description: 'Fecha y hora del registro' })
  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
