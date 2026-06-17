import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './services/reportes.service';
import { ReportesController } from './controllers/reportes.controller';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { RecargaCliente } from 'src/recargas/entities/recarga-cliente.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { Usuario } from 'src/usuario/entities/usuario.entity';
import { Compra } from 'src/compras/entities/compra.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      Producto,
      RecargaCliente,
      SesionCaja,
      MovimientoCaja,
      Usuario,
      Compra,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
