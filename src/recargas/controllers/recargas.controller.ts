import { Controller, Get, Post, Body, Param, Patch, UsePipes, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecargasService } from '../services/recargas.service';
import { CreateTopUpTransactionDto } from '../dto/create-topup-transaction.dto';
import { OpenSessionTopUpDto } from '../dto/open-session-topup.dto';
import { CloseSessionTopUpDto } from '../dto/close-session-topup.dto';

@ApiTags('recargas')
@Controller('recargas')
export class RecargasController {
  constructor(private readonly recargasService: RecargasService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Inicializar proveedores por defecto (Entel, Viva, Tigo)' })
  async seed(@Body('id_usuario', ParseIntPipe) idUsuario: number) {
    return this.recargasService.seedProveedores(idUsuario);
  }

  @Get('proveedores')
  @ApiOperation({ summary: 'Obtener lista de proveedores de recargas y sus saldos' })
  async getProveedores() {
    return this.recargasService.getProveedores();
  }

  @Post('transaccion')
  @ApiOperation({ summary: 'Registrar una transacción de recarga (Compra de saldo o Venta de recarga)' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTransaction(@Body() dto: CreateTopUpTransactionDto) {
    return this.recargasService.createTransaction(dto);
  }

  @Post('sesion-inicializar')
  @ApiOperation({ summary: 'Registrar saldos iniciales de las líneas telefónicas al abrir caja' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async initializeSessionBalances(@Body() dto: OpenSessionTopUpDto) {
    return this.recargasService.initializeSessionBalances(dto);
  }

  @Patch('sesion/:idSesion/finalizar')
  @ApiOperation({ summary: 'Registrar saldos finales de las líneas telefónicas al cerrar caja' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async closeSessionBalances(
    @Param('idSesion', ParseIntPipe) idSesion: number,
    @Body() dto: CloseSessionTopUpDto,
  ) {
    return this.recargasService.closeSessionBalances(idSesion, dto);
  }

  @Get('sesion/:idSesion/resumen')
  @ApiOperation({ summary: 'Obtener resumen y auditoría de recargas para una sesión de caja' })
  async getSessionSummary(@Param('idSesion', ParseIntPipe) idSesion: number) {
    return this.recargasService.getSessionSummary(idSesion);
  }
}
