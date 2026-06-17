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
  Req,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CajasService } from './cajas.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';

@UseGuards(AuthGuard, RolesGuard)
@Controller('cajas')
export class CajasController {
  constructor(private readonly cajasService: CajasService) {}

  @Get()
  findAllCajas() {
    return this.cajasService.findAllCajas();
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
    return this.cajasService.getSesionBalance(+id);
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

  @Roles('Administrador', 'Jefe de Tienda', 'Operador')
  @Post('abrir')
  abrirCaja(@Body() abrirCajaDto: AbrirCajaDto, @Req() req: any) {
    const userRole = req.user?.roleName;
    return this.cajasService.abrirCaja(abrirCajaDto, userRole);
  }

  @Patch('sesion/:id/cerrar')
  cerrarCaja(@Param('id') id: string, @Body() cerrarCajaDto: CerrarCajaDto) {
    return this.cajasService.cerrarCaja(+id, cerrarCajaDto);
  }

  @Post('movimiento')
  crearMovimiento(@Body() crearMovimientoDto: CrearMovimientoDto) {
    return this.cajasService.crearMovimiento(crearMovimientoDto);
  }
}
