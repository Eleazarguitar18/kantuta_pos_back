import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasService } from './compras.service';
import { ComprasController } from './compras.controller';
import { Compra } from './entities/compra.entity';
import { DetalleCompra } from './entities/detalle-compra.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { CajasModule } from 'src/cajas/cajas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, DetalleCompra, Producto]),
    CajasModule
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
