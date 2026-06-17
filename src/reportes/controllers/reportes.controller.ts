import { Controller, Get, Query, Param, Res, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportesService } from '../services/reportes.service';

@ApiTags('reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Obtener estadísticas consolidadas de ventas, recargas, stock y KPIs para el dashboard' })
  @ApiQuery({ name: 'anio', required: false, description: 'Año para el cual agrupar las ventas mensuales' })
  async getDashboardStats(@Query('anio') anio?: string) {
    const currentYear = new Date().getFullYear();
    const filterYear = anio ? parseInt(anio, 10) : currentYear;
    return this.reportesService.getDashboardStats(isNaN(filterYear) ? currentYear : filterYear);
  }

  @Get('pdf/movimientos-caja/:idSesion')
  @ApiOperation({ summary: 'Generar reporte PDF de movimientos de una sesión de caja' })
  async getMovimientosCajaPdf(
    @Param('idSesion', ParseIntPipe) idSesion: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getMovimientosCajaPdf(idSesion);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=movimientos-caja-${idSesion}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/ventas-rango')
  @ApiOperation({ summary: 'Generar reporte PDF de ventas por rango de fechas' })
  @ApiQuery({ name: 'fechaInicio', required: true })
  @ApiQuery({ name: 'fechaFin', required: true })
  @ApiQuery({ name: 'auditor', required: true })
  async getVentasRangoPdf(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('auditor') auditor: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getVentasRangoPdf(fechaInicio, fechaFin, auditor);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ventas-rango.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/productividad-operador')
  @ApiOperation({ summary: 'Generar reporte PDF de productividad por operador' })
  @ApiQuery({ name: 'fechaInicio', required: true })
  @ApiQuery({ name: 'fechaFin', required: true })
  async getProductividadOperadorPdf(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getProductividadOperadorPdf(fechaInicio, fechaFin);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=productividad-operador.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/compras-rango')
  @ApiOperation({ summary: 'Generar reporte PDF de compras por rango de fechas' })
  @ApiQuery({ name: 'fechaInicio', required: true })
  @ApiQuery({ name: 'fechaFin', required: true })
  @ApiQuery({ name: 'auditor', required: true })
  async getComprasRangoPdf(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
    @Query('auditor') auditor: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getComprasRangoPdf(fechaInicio, fechaFin, auditor);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=compras-rango.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/inventario')
  @ApiOperation({ summary: 'Generar reporte PDF de inventario actual' })
  @ApiQuery({ name: 'auditor', required: true })
  async getInventarioPdf(
    @Query('auditor') auditor: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getInventarioPdf(auditor);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=inventario-actual.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/venta/:id')
  @ApiOperation({ summary: 'Generar recibo en PDF de una venta específica' })
  async getVentaReciboPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getVentaReciboPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ticket-venta-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/producto/:id')
  @ApiOperation({ summary: 'Generar ficha en PDF de un producto específico' })
  async getProductoFichaPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getProductoFichaPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ficha-producto-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('pdf/caja-historial/:id')
  @ApiOperation({ summary: 'Generar extracto histórico en PDF de una caja específica' })
  async getCajaHistorialPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportesService.getCajaHistorialPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=extracto-caja-${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }
}
