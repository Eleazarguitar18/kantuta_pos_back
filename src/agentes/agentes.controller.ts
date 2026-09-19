import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AgentesService } from './agentes.service';
import { CrearAgenteDto } from './dto/crear-agente.dto';
import { CrearTransaccionAgenteDto } from './dto/crear-transaccion-agente.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const dtoValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@ApiBearerAuth()
@ApiTags('agentes')
@UseGuards(AuthGuard, RolesGuard)
@Controller('agentes')
export class AgentesController {
  constructor(private readonly agentesService: AgentesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los bancos/agentes activos' })
  findAll() {
    return this.agentesService.findAll();
  }

  @Get('operadores')
  @ApiOperation({ summary: 'Listar usuarios/operadores activos para movimientos' })
  listarOperadores() {
    return this.agentesService.listarOperadores();
  }

  @Get('bancos')
  @ApiOperation({ summary: 'Listar todos los bancos/agentes activos (alias)' })
  findAllBancos() {
    return this.agentesService.findAll();
  }

  @Roles('Administrador', 'ADMIN')
  @UsePipes(dtoValidationPipe)
  @Post('bancos')
  @ApiOperation({ summary: 'Crear nuevo banco con capital inicial' })
  createBanco(@Body() crearAgenteDto: CrearAgenteDto) {
    return this.agentesService.create(crearAgenteDto);
  }

  @Roles('Administrador', 'ADMIN')
  @UsePipes(dtoValidationPipe)
  @Post()
  @ApiOperation({ summary: 'Crear nuevo banco con capital inicial (alias)' })
  create(@Body() crearAgenteDto: CrearAgenteDto) {
    return this.agentesService.create(crearAgenteDto);
  }

  @Get('transacciones')
  @ApiOperation({ summary: 'Obtener transacciones de un banco o todas' })
  findTransacciones(
    @Query('bancoId') bancoId?: string,
    @Query('agente_id') agente_id?: string,
    @Query('limit') limit?: string,
  ) {
    const rawId = bancoId || agente_id;
    const parsedBancoId = rawId && !isNaN(+rawId) ? +rawId : undefined;
    const parsedLimit = limit && !isNaN(+limit) ? +limit : undefined;
    return this.agentesService.getTransaccionesByBanco(parsedBancoId, parsedLimit);
  }

  @Get('transacciones/listar')
  @ApiOperation({ summary: 'Listar historial de transacciones de agentes (alias)' })
  findTransaccionesListar(
    @Query('bancoId') bancoId?: string,
    @Query('agente_id') agente_id?: string,
    @Query('limit') limit?: string,
  ) {
    const rawId = bancoId || agente_id;
    const parsedBancoId = rawId && !isNaN(+rawId) ? +rawId : undefined;
    const parsedLimit = limit && !isNaN(+limit) ? +limit : undefined;
    return this.agentesService.getTransaccionesByBanco(parsedBancoId, parsedLimit);
  }

  @Get('operadores-deuda')
  @ApiOperation({ summary: 'Obtener operadores con deuda de un banco o todos' })
  findOperadoresDeuda(
    @Query('bancoId') bancoId?: string,
    @Query('agente_id') agente_id?: string,
  ) {
    const rawId = bancoId || agente_id;
    const parsedBancoId = rawId && !isNaN(+rawId) ? +rawId : undefined;
    return this.agentesService.getOperadoresDeudaByBanco(parsedBancoId);
  }

  @Get(':id/balance')
  @ApiOperation({
    summary: 'Obtener balance y lista de operadores deudores de un banco específico',
  })
  getBalance(@Param('id') id: string) {
    return this.agentesService.getBalance(+id);
  }

  @Roles('Administrador', 'ADMIN', 'Operador')
  @UsePipes(dtoValidationPipe)
  @Post('transacciones')
  @ApiOperation({
    summary: 'Registrar movimiento de capital en un banco específico',
  })
  registrarTransaccionPlural(@Body() dto: CrearTransaccionAgenteDto) {
    return this.agentesService.registrarTransaccion(dto);
  }

  @Roles('Administrador', 'ADMIN', 'Operador')
  @UsePipes(dtoValidationPipe)
  @Post('transaccion')
  @ApiOperation({
    summary: 'Registrar movimiento de capital en un banco específico (alias)',
  })
  registrarTransaccion(@Body() dto: CrearTransaccionAgenteDto) {
    return this.agentesService.registrarTransaccion(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un banco/agente por ID' })
  findOne(@Param('id') id: string) {
    return this.agentesService.findOne(+id);
  }

  @Roles('Administrador', 'ADMIN')
  @Delete('bancos/:id')
  @ApiOperation({ summary: 'Desactivar o eliminar lógicamente un banco/agente (alias)' })
  removeBanco(
    @Param('id') id: string,
    @Query('id_user_update') id_user_update?: string,
  ) {
    return this.agentesService.eliminarAgente(
      +id,
      id_user_update ? +id_user_update : undefined,
    );
  }

  @Roles('Administrador', 'ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar o eliminar lógicamente un banco/agente' })
  remove(
    @Param('id') id: string,
    @Query('id_user_update') id_user_update?: string,
  ) {
    return this.agentesService.eliminarAgente(
      +id,
      id_user_update ? +id_user_update : undefined,
    );
  }
}
