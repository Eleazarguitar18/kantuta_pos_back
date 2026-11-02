import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './services/reportes.service';
import { MatrizControlService } from './services/matriz-control.service';
import { MatrizControlExcelService } from './services/matriz-control-excel.service';
import { MatrizControlResponsabilidadesService } from './services/matriz-control-responsabilidades.service';
import { ReportesController } from './controllers/reportes.controller';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { RecargaCliente } from 'src/recargas/entities/recarga-cliente.entity';
import { InyeccionOperadora } from 'src/recargas/entities/inyeccion-operadora.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { Usuario } from 'src/usuario/entities/usuario.entity';
import { Compra } from 'src/compras/entities/compra.entity';
import { DescuadreCajaInventario } from 'src/cajas/entities/descuadre-caja-inventario.entity';
import { PrestamoCaja } from 'src/cajas/entities/prestamo-caja.entity';
import { PrestamoExterno } from 'src/prestamos-externos/entities/prestamo-externo.entity';
import { CuentaPorCobrar } from 'src/ventas/entities/cuenta-por-cobrar.entity';
import { OperadorDeuda } from 'src/agentes/entities/operador-deuda.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Venta,
      Producto,
      RecargaCliente,
      InyeccionOperadora,
      SesionCaja,
      MovimientoCaja,
      Usuario,
      Compra,
      DescuadreCajaInventario,
      PrestamoCaja,
      PrestamoExterno,
      CuentaPorCobrar,
      OperadorDeuda,
    ]),
  ],
  controllers: [ReportesController],
  providers: [
    ReportesService,
    MatrizControlService,
    MatrizControlExcelService,
    MatrizControlResponsabilidadesService,
  ],
  exports: [
    ReportesService,
    MatrizControlService,
    MatrizControlExcelService,
    MatrizControlResponsabilidadesService,
  ],
})
export class ReportesModule {}
