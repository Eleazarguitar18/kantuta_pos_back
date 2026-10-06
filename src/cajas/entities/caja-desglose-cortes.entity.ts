import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';
import { SesionCaja } from './sesion-caja.entity';

@Entity('cajas_desglose_cortes')
export class CajaDesgloseCortes extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 101, description: 'ID de la sesión de caja' })
  @Column({ name: 'id_sesion_caja' })
  id_sesion_caja: number;

  @ManyToOne(() => SesionCaja, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sesion_caja' })
  sesion_caja: SesionCaja;

  @ApiProperty({ example: 'APERTURA', enum: ['APERTURA', 'CIERRE'] })
  @Column({ type: 'varchar', length: 20, default: 'APERTURA' })
  momento: string; // 'APERTURA' | 'CIERRE'

  @ApiProperty({ example: 0, description: 'Cantidad de billetes de 200' })
  @Column({ type: 'int', default: 0 })
  billete_200: number;

  @ApiProperty({ example: 2, description: 'Cantidad de billetes de 100' })
  @Column({ type: 'int', default: 0 })
  billete_100: number;

  @ApiProperty({ example: 3, description: 'Cantidad de billetes de 50' })
  @Column({ type: 'int', default: 0 })
  billete_50: number;

  @ApiProperty({ example: 5, description: 'Cantidad de billetes de 20' })
  @Column({ type: 'int', default: 0 })
  billete_20: number;

  @ApiProperty({ example: 10, description: 'Cantidad de billetes de 10' })
  @Column({ type: 'int', default: 0 })
  billete_10: number;

  @ApiProperty({ example: 4, description: 'Cantidad de monedas de 5 Bs', required: false })
  @Column({ type: 'int', default: 0 })
  moneda_5: number;

  @ApiProperty({ example: 5, description: 'Cantidad de monedas de 2 Bs', required: false })
  @Column({ type: 'int', default: 0 })
  moneda_2: number;

  @ApiProperty({ example: 10, description: 'Cantidad de monedas de 1 Bs', required: false })
  @Column({ type: 'int', default: 0 })
  moneda_1: number;

  @ApiProperty({ example: 6, description: 'Cantidad de monedas de 0.50 Bs (50 centavos)', required: false })
  @Column({ type: 'int', default: 0 })
  moneda_050: number;

  @ApiProperty({ example: 10, description: 'Cantidad de monedas de 0.20 Bs (20 centavos)', required: false })
  @Column({ type: 'int', default: 0 })
  moneda_020: number;

  @ApiProperty({ example: 15, description: 'Cantidad de monedas de 0.10 Bs (10 centavos)', required: false })
  @Column({ type: 'int', default: 0 })
  moneda_010: number;

  @ApiProperty({ example: 5.5, description: 'Suma total de monedas' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monedas_total: number;

  @ApiProperty({ example: 555.5, description: 'Monto total calculado del desglose' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_total_desglose: number;
}
