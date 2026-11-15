import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportesService } from '../services/reportes.service';
import { MatrizControlService } from '../services/matriz-control.service';
import { MatrizControlExcelService } from '../services/matriz-control-excel.service';
import { FiltroMatrizControlDto } from '../dto/filtro-matriz-control.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('reportes')
@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly matrizControlService: MatrizControlService,
    private readonly matrizControlExcelService: MatrizControlExcelService,
  ) {}

  @Get('matriz-control')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('Administrador')
  @ApiOperation({
    summary: 'Obtener la matriz mensual de control diario por operador',
  })
  async getMatrizControl(@Query() filtro: FiltroMatrizControlDto) {
    return this.matrizControlService.obtenerMatriz(filtro);
  }

  @Get('matriz-control/excel')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('Administrador')
  @ApiOperation({
    summary: 'Descargar la matriz mensual de control diario en Excel',
  })
  async getMatrizControlExcel(
    @Query() filtro: FiltroMatrizControlDto,
    @Res() res: Response,
  ) {
    const buffer = await this.matrizControlExcelService.generarExcel(filtro);
    const filename = `matriz-control-${filtro.anio}-${String(filtro.mes).padStart(2, '0')}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Obtener estadísticas consolidadas de ventas, recargas, stock y KPIs para el dashboard' })
  @ApiQuery({ name: 'anio', required: false, description: 'Año para el cual agrupar las ventas mensuales' })
  async getDashboardStats(@Query('anio') anio?: string) {
    const currentYear = new Date().getFullYear();
    const filterYear = anio ? parseInt(anio, 10) : currentYear;
    return this.reportesService.getDashboardStats(isNaN(filterYear) ? currentYear : filterYear);
  }

  @Get('data/movimientos-caja/:idSesion')
  @ApiOperation({ summary: 'Obtener datos de movimientos de una sesión de caja para PDF' })
  async getMovimientosCajaData(
    @Param('idSesion', ParseIntPipe) idSesion: number,
  ) {
    return this.reportesService.getMovimientosCajaData(idSesion);
  }

  @Get('data/ventas-rango')
  @ApiOperation({ summary: 'Obtener datos JSON de ventas por rango de fechas para reporte' })
  @ApiQuery({ name: 'fechaInicio', required: true })
  @ApiQuery({ name: 'fechaFin', required: true })
  @ApiQuery({ name: 'auditor', required: true })
  async getVentasRangoData(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('auditor') auditor: string,
  ) {
    return this.reportesService.getVentasRangoData(fechaInicio, fechaFin, auditor);
  }

  @Get('data/productividad-operador')
  @ApiOperation({ summary: 'Obtener datos de productividad por operador para PDF' })
  @ApiQuery({ name: 'fechaInicio', required: true })
  @ApiQuery({ name: 'fechaFin', required: true })
  @ApiQuery({ name: 'operadorId', required: false })
  async getProductividadOperadorData(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('operadorId') operadorId?: string,
  ) {
    return this.reportesService.getProductividadOperadorData(fechaInicio, fechaFin, operadorId ? parseInt(operadorId, 10) : undefined);
  }

  @Get('data/compras-rango')
  @ApiOperation({ summary: 'Obtener datos de compras por rango para PDF' })
  @ApiQuery({ name: 'fechaInicio', required: true })
  @ApiQuery({ name: 'fechaFin', required: true })
  @ApiQuery({ name: 'auditor', required: true })
  async getComprasRangoData(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('auditor') auditor: string,
  ) {
    return this.reportesService.getComprasRangoData(fechaInicio, fechaFin, auditor);
  }

  @Get('data/inventario')
  @ApiOperation({ summary: 'Obtener datos JSON de inventario actual para reporte' })
  @ApiQuery({ name: 'auditor', required: true })
  async getInventarioData(
    @Query('auditor') auditor: string,
  ) {
    return this.reportesService.getInventarioData(auditor);
  }

  @Get('data/venta/:id')
  @ApiOperation({ summary: 'Obtener datos de recibo de venta para PDF' })
  async getVentaReciboData(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportesService.getVentaReciboData(id);
  }

  @Get('data/producto/:id')
  @ApiOperation({ summary: 'Obtener datos de ficha de producto para PDF' })
  async getProductoFichaData(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportesService.getProductoFichaData(id);
  }

  @Get('data/caja-historial/:id')
  @ApiOperation({ summary: 'Obtener datos de extracto histórico de caja para PDF' })
  async getCajaHistorialData(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportesService.getCajaHistorialData(id);
  }
}
