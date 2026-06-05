import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './services/reportes.service';
import { ReportesController } from './controllers/reportes.controller';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { RecargaTransaccion } from 'src/recargas/entities/recarga-transaccion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      Producto,
      RecargaTransaccion,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
