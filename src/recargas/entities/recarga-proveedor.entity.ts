import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntityAudit } from 'src/common/entities/base-entity.audit';

@Entity('recargas_proveedores')
export class RecargaProveedor extends BaseEntityAudit {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Entel', description: 'Nombre del operador telefónico' })
  @Column({ unique: true })
  nombre: string;

  @ApiProperty({ example: 500.00, description: 'Saldo actual disponible en la línea' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo_actual: number;

  @ApiProperty({ example: 5.00, description: 'Porcentaje de comisión otorgado' })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  comision_porcentaje: number;
}
