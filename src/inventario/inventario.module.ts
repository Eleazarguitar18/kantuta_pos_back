import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { CategoriasController } from './categoria/categorias.controller';
import { Producto } from './entities/producto.entity';
import { Categoria } from './entities/categoria.entity';
import { ProductoController } from './producto/producto.controller';
import { ProductoService } from './producto/producto.service';
import { CategoriaService } from './categoria/categoria.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Categoria])],
  controllers: [InventarioController, CategoriasController, ProductoController],
  providers: [InventarioService, CategoriaService, ProductoService],
  exports: [InventarioService, CategoriaService, ProductoService],
})
export class InventarioModule { }
