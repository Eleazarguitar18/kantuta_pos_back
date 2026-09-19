import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UsePipes,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CajasService } from './cajas.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';
import { CrearPrestamoDto, PagarPrestamoDto } from './dto/crear-prestamo.dto';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';

// Validación de DTO en el controlador antes de procesar la petición
const dtoValidationPipe = new ValidationPipe({
  whitelist: true, // Descarta propiedades no declaradas en el DTO
  forbidNonWhitelisted: true, // Rechaza la petición si llegan propiedades extra
  transform: true, // Transforma el payload a la instancia del DTO
});

@UseGuards(AuthGuard, RolesGuard)
@Controller('cajas')
export class CajasController {
  constructor(private readonly cajasService: CajasService) {}

  @Get()
  findAllCajas() {
    return this.cajasService.findAllCajas();
  }

  @Get('resumen-inventario')
  getResumenInventario() {
    return this.cajasService.getResumenInventario();
  }

  @Get('estado-inventario')
  getEstadoInventario() {
    return this.cajasService.getEstadoInventario();
  }

  @Get('prestamos/listar')
  findAllPrestamos() {
    return this.cajasService.findAllPrestamos();
  }

  @UsePipes(dtoValidationPipe)
  @Post('prestamos')
  crearPrestamo(@Body() crearPrestamoDto: CrearPrestamoDto) {
    return this.cajasService.crearPrestamo(crearPrestamoDto);
  }

  @UsePipes(dtoValidationPipe)
  @Post('prestamos/:id/pagar')
  pagarPrestamo(@Param('id') id: string, @Body() body: PagarPrestamoDto) {
    return this.cajasService.pagarPrestamo(+id, body);
  }

  @Roles('Administrador')
  @Post()
  createCaja(@Body() createCajaDto: CreateCajaDto) {
    return this.cajasService.create(createCajaDto);
  }

  @Get('sesion-activa/:id_usuario')
  getSesionActivaUsuario(@Param('id_usuario') id_usuario: string) {
    return this.cajasService.getSesionActivaUsuario(+id_usuario);
  }

  @Get('sesion/:id/balance')
  getSesionBalance(@Param('id') id: string) {
    return this.cajasService.getSaldoCajaSesion(+id);
  }

  @Get(':id')
  findCaja(@Param('id') id: string) {
    return this.cajasService.findCaja(+id);
  }

  @Patch(':id')
  updateCaja(@Param('id') id: string, @Body() updateCajaDto: UpdateCajaDto) {
    return this.cajasService.update(+id, updateCajaDto);
  }

  @Delete(':id')
  removeCaja(
    @Param('id') id: string,
    @Query('id_user_update') id_user_update: string,
  ) {
    return this.cajasService.softDeleteCaja(+id, +id_user_update);
  }

  @Roles('Administrador', 'Operador')
  @Post('abrir')
  abrirCaja(@Body() abrirCajaDto: AbrirCajaDto, @Req() req: any) {
    const userRole = req.user?.roleName;
    return this.cajasService.abrirCaja(abrirCajaDto, userRole);
  }

  @UsePipes(dtoValidationPipe)
  @Patch('sesion/:id/cerrar')
  cerrarCaja(@Param('id') id: string, @Body() cerrarCajaDto: CerrarCajaDto) {
    return this.cajasService.cerrarCaja(+id, cerrarCajaDto);
  }

  @Post('movimiento')
  crearMovimiento(@Body() crearMovimientoDto: CrearMovimientoDto) {
    return this.cajasService.crearMovimiento(crearMovimientoDto);
  }
}
