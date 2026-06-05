import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { RecargaProveedor } from './recarga-proveedor.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';

@Entity('recargas_sesiones_control')
export class RecargaSesionControl extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SesionCaja)
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @ApiProperty({ example: 10 })
  @Column({ name: 'id_sesion_caja' })
  id_sesion_caja: number;

  @ManyToOne(() => RecargaProveedor)
  @JoinColumn({ name: 'id_proveedor' })
  proveedor: RecargaProveedor;

  @ApiProperty({ example: 1 })
  @Column({ name: 'id_proveedor' })
  id_proveedor: number;

  @ApiProperty({ example: 250.00, description: 'Saldo de la línea al iniciar la sesión de caja' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  saldo_inicial: number;

  @ApiProperty({ example: 350.00, description: 'Saldo teórico final (inicial + compras - ventas)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo_final_teorico: number;

  @ApiProperty({ example: 348.00, description: 'Saldo real reportado en el arqueo al cerrar caja', nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  saldo_final_real: number;

  @ApiProperty({ example: -2.00, description: 'Diferencia identificada para el cuadre', nullable: true })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number;
}
