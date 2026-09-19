import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CuentaPorCobrar } from './entities/cuenta-por-cobrar.entity';
import { InventarioModule } from 'src/inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta, CuentaPorCobrar]),
    InventarioModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
