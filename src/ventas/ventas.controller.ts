import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { ActualizarVentaDto } from './dto/actualizar-venta.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { GetReporteVentasDto } from './dto/get-reporte-ventas.dto';

@ApiBearerAuth()
@ApiTags('ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva venta' })
  create(@Body() crearVentaDto: CrearVentaDto) {
    return this.ventasService.create(crearVentaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las ventas' })
  findAll() {
    return this.ventasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una venta por ID' })
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar o anular una venta' })
  update(
    @Param('id') id: string,
    @Body() actualizarVentaDto: ActualizarVentaDto,
  ) {
    return this.ventasService.update(+id, actualizarVentaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una venta por ID' })
  remove(@Param('id') id: string) {
    return this.ventasService.remove(+id);
  }
  @Post('reporte-resumen')
  @HttpCode(HttpStatus.OK) // Por defecto POST devuelve 201, forzamos a 200 OK ya que es una consulta
  @ApiOperation({
    summary: 'Obtener resumen agrupado de ventas para reportes PDF',
    description:
      'Recibe un rango de fechas en el body y devuelve totales financieros agrupados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del reporte procesados con éxito.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Fechas inválidas o mal formateadas en el cuerpo de la petición.',
  })
  async obtenerReporteResumen(@Body() queryDto: GetReporteVentasDto) {
    return await this.ventasService.obtenerResumenVentasPorRango(queryDto);
  }
}
