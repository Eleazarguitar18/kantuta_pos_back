import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { CreateContactoDto, UpdateContactoDto } from './dto/contacto.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Notificaciones - Contactos')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('Administrador')
@Controller('notificaciones/contactos')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo contacto de notificación' })
  create(@Body() dto: CreateContactoDto) {
    return this.notificacionesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los contactos registrados' })
  findAll() {
    return this.notificacionesService.findAll();
  }

  @Get('activos-stock')
  @ApiOperation({
    summary:
      'Listar contactos activos que reciben alertas de stock bajo',
  })
  findActivosStock() {
    return this.notificacionesService.findActivosStock();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un contacto por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificacionesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar datos o toggles de un contacto (activo, recibe_stock_bajo, etc.)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactoDto,
  ) {
    return this.notificacionesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un contacto' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificacionesService.remove(id);
  }

  // --------------------------------------------------------------------------
  // Endpoint de utilidad: ejecutar seeder manualmente (para pruebas con REST client)
  // --------------------------------------------------------------------------
  @Post('seed')
  @ApiOperation({
    summary:
      'Ejecutar seeder manualmente (solo inserta si la tabla está vacía)',
  })
  seed() {
    return this.notificacionesService.ejecutarSeederManual();
  }
}
