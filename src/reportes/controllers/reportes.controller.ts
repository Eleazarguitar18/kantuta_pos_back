import { Controller, Get, Query, ParseIntPipe, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
}
