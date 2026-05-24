import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProductoService } from './producto.service';
import { CrearProductoDto } from '../dto/crear-producto.dto';
import { ActualizarProductoDto } from '../dto/actualizar-producto.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('inventario/producto')
@Controller('inventario/producto')
export class ProductoController {
    constructor(private readonly productoService: ProductoService) { }

    @Post()
    @ApiOperation({ summary: 'Crear un nuevo producto en inventario' })
    create(@Body() crearProductoDto: CrearProductoDto) {
        return this.productoService.create(crearProductoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los productos del inventario' })
    findAll() {
        return this.productoService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un producto por ID' })
    findOne(@Param('id') id: string) {
        return this.productoService.findOne(+id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar un producto del inventario' })
    update(@Param('id') id: string, @Body() actualizarProductoDto: ActualizarProductoDto) {
        return this.productoService.update(+id, actualizarProductoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un producto del inventario' })
    remove(@Param('id') id: string) {
        return this.productoService.remove(+id);
    }
}
