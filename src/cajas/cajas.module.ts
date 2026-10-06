import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CajasService } from './cajas.service';
import { CajasController } from './cajas.controller';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { PrestamoCaja } from './entities/prestamo-caja.entity';
import { CajaDesgloseCortes } from './entities/caja-desglose-cortes.entity';
import { DescuadreCajaInventario } from './entities/descuadre-caja-inventario.entity';
import { DescuadreInventarioCaja } from './entities/descuadre-inventario-caja.entity';
import { Producto } from '../inventario/entities/producto.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Venta } from '../ventas/entities/venta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Caja,
      SesionCaja,
      MovimientoCaja,
      PrestamoCaja,
      CajaDesgloseCortes,
      DescuadreCajaInventario,
      DescuadreInventarioCaja,
      Producto,
      Usuario,
      Venta,
    ]),
  ],
  controllers: [CajasController],
  providers: [CajasService],
  exports: [CajasService],
})
export class CajasModule {}
