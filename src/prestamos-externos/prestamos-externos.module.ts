import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caja } from '../cajas/entities/caja.entity';
import { MovimientoCaja } from '../cajas/entities/movimiento-caja.entity';
import { SesionCaja } from '../cajas/entities/sesion-caja.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { PrestamoExterno } from './entities/prestamo-externo.entity';
import { PrestamosExternosController } from './prestamos-externos.controller';
import { PrestamosExternosService } from './prestamos-externos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrestamoExterno,
      Caja,
      SesionCaja,
      MovimientoCaja,
      Usuario,
    ]),
  ],
  controllers: [PrestamosExternosController],
  providers: [PrestamosExternosService],
  exports: [PrestamosExternosService],
})
export class PrestamosExternosModule {}
