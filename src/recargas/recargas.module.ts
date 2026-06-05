import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecargasService } from './services/recargas.service';
import { RecargasController } from './controllers/recargas.controller';
import { RecargaProveedor } from './entities/recarga-proveedor.entity';
import { RecargaTransaccion } from './entities/recarga-transaccion.entity';
import { RecargaSesionControl } from './entities/recarga-sesion-control.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecargaProveedor,
      RecargaTransaccion,
      RecargaSesionControl,
      SesionCaja,
      MovimientoCaja,
    ]),
  ],
  controllers: [RecargasController],
  providers: [RecargasService],
  exports: [RecargasService],
})
export class RecargasModule {}
