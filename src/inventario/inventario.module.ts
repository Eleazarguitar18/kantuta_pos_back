import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { Producto } from './entities/producto.entity';
import { Categoria } from './entities/categoria.entity';
import { CategoriaModule } from './categoria/categoria.module';
import { ProductoModule } from './producto/producto.module';
import { StockAlertService } from './stock-alert.service';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { NotificacionesModule } from 'src/notificaciones/notificaciones.module';

@Module({
  imports: [
    CategoriaModule,
    TypeOrmModule.forFeature([Producto, Categoria]),
    ProductoModule,
    WhatsappModule,
    NotificacionesModule,
  ],
  controllers: [InventarioController],
  providers: [InventarioService, StockAlertService],
  exports: [InventarioService, StockAlertService, CategoriaModule, ProductoModule],
})
export class InventarioModule { }
