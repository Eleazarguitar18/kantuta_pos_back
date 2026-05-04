import { Controller, Post, Body, Get } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('compras')
@Controller('compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una compra de stock y actualizar inventario' })
  create(@Body() crearCompraDto: CrearCompraDto) {
    return this.comprasService.create(crearCompraDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener historial de compras' })
  findAll() {
    return this.comprasService.findAll();
  }
}
