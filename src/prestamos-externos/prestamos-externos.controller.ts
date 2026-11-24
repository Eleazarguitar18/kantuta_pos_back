import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarEstadoPrestamoDto } from './dto/actualizar-estado-prestamo.dto';
import { CrearPrestamoExternoDto } from './dto/crear-prestamo-externo.dto';
import { PagarPrestamoExternoDto } from './dto/pagar-prestamo-externo.dto';
import { EstadoPrestamoExterno } from './entities/prestamo-externo.entity';
import { PrestamosExternosService } from './prestamos-externos.service';

const dtoValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@ApiBearerAuth()
@ApiTags('prestamos-externos')
@UseGuards(AuthGuard, RolesGuard)
@Controller('prestamos-externos')
export class PrestamosExternosController {
  constructor(
    private readonly prestamosExternosService: PrestamosExternosService,
  ) {}

  @UsePipes(dtoValidationPipe)
  @Post()
  @ApiOperation({ summary: 'Registrar un préstamo externo desde caja activa' })
  crear(@Body() crearPrestamoExternoDto: CrearPrestamoExternoDto, @Req() req: any) {
    return this.prestamosExternosService.crear(
      crearPrestamoExternoDto,
      req.user?.sub,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar préstamos externos registrados' })
  listar(
    @Query('estado') estado?: EstadoPrestamoExterno,
    @Query('solicitante') solicitante?: string,
  ) {
    return this.prestamosExternosService.listar(estado, solicitante);
  }

  @UsePipes(dtoValidationPipe)
  @Post(':id/pagar')
  @ApiOperation({
    summary: 'Registrar la devolución de un préstamo externo (alias de estado PAGADO)',
  })
  pagar(
    @Param('id') id: string,
    @Body() pagarPrestamoExternoDto: PagarPrestamoExternoDto,
    @Req() req: any,
  ) {
    return this.prestamosExternosService.actualizarEstado(
      +id,
      {
        estado: EstadoPrestamoExterno.PAGADO,
        id_user_update: pagarPrestamoExternoDto.id_user_update,
        caja_sesion_id: pagarPrestamoExternoDto.caja_sesion_id,
      },
      req.user?.sub,
    );
  }

  @UsePipes(dtoValidationPipe)
  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualizar estado de un préstamo externo' })
  actualizarEstado(
    @Param('id') id: string,
    @Body() actualizarEstadoPrestamoDto: ActualizarEstadoPrestamoDto,
    @Req() req: any,
  ) {
    return this.prestamosExternosService.actualizarEstado(
      +id,
      actualizarEstadoPrestamoDto,
      req.user?.sub,
    );
  }
}
