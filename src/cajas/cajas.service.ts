import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Caja } from './entities/caja.entity';
import { SesionCaja } from './entities/sesion-caja.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { PrestamoCaja } from './entities/prestamo-caja.entity';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';
import { CrearPrestamoDto } from './dto/crear-prestamo.dto';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';
import { AppGateway } from 'src/gateway/app.gateway';

import { Producto } from '../inventario/entities/producto.entity';

@Injectable()
export class CajasService {
  constructor(
    @InjectRepository(Caja)
    private readonly cajaRepository: Repository<Caja>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepository: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepository: Repository<MovimientoCaja>,
    @InjectRepository(PrestamoCaja)
    private readonly prestamoCajaRepository: Repository<PrestamoCaja>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    private readonly dataSource: DataSource,
    private readonly appGateway: AppGateway,
  ) {}

  async create(createCajaDto: CreateCajaDto): Promise<Caja> {
    const caja = this.cajaRepository.create(createCajaDto);
    const saved = await this.cajaRepository.save(caja);
    this.appGateway.notifyDataChange('caja', 'creada');
    return saved;
  }
  async getSaldoCajaSesion(idSesion: number): Promise<number> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: {
        id: idSesion,
        estado: true,
      },
      relations: ['caja'],
    });
    if (!sesion)
      throw new NotFoundException(
        `Sesión de caja con ID ${idSesion} no encontrada o inactiva`,
      );
    console.log(sesion);
    return sesion.caja.saldo;
  }
  async findAllCajas(): Promise<Caja[]> {
    return this.cajaRepository.find({ where: { estado: true } });
  }

  async findCaja(id: number): Promise<Caja> {
    const caja = await this.cajaRepository.findOne({
      where: { id, estado: true },
      relations: ['sesiones'],
    });
    if (!caja)
      throw new NotFoundException(`Caja con ID ${id} no encontrada o inactiva`);
    return caja;
  }

  async update(id: number, updateCajaDto: UpdateCajaDto): Promise<Caja> {
    const caja = await this.findCaja(id);
    const updatedCaja = Object.assign(caja, updateCajaDto);
    const saved = await this.cajaRepository.save(updatedCaja);
    this.appGateway.notifyDataChange('caja', 'actualizada');
    return saved;
  }

  async abrirCaja(
    abrirCajaDto: AbrirCajaDto,
    userRole?: string,
  ): Promise<SesionCaja> {
    const { id_caja, id_usuario, id_user_create } = abrirCajaDto;
    let { monto_inicial } = abrirCajaDto;

    const caja = await this.cajaRepository.findOneBy({
      id: id_caja,
      estado: true,
    });
    if (!caja)
      throw new NotFoundException(
        `Caja con id ${id_caja} no encontrada o inactiva`,
      );

    const sesionUsuarioAbierta = await this.sesionCajaRepository.findOne({
      where: { id_usuario, estado_sesion: 'ABIERTA', estado: true },
    });

    if (sesionUsuarioAbierta) {
      throw new BadRequestException(
        'El usuario ya cuenta con una caja abierta',
      );
    }

    const sesionAbierta = await this.sesionCajaRepository.findOne({
      where: { id_caja: id_caja, estado_sesion: 'ABIERTA', estado: true },
    });

    if (sesionAbierta) {
      throw new BadRequestException(`La caja ya tiene una sesión abierta`);
    }

    // 2. CORRECCIÓN: Al abrir, priorizamos el saldo actual acumulado en la tabla 'Cajas'
    if (
      userRole === 'Operador' ||
      monto_inicial === undefined ||
      monto_inicial === null
    ) {
      monto_inicial = Number(caja.saldo ?? 0);
    } else {
      // Si el admin envía un monto_inicial manual para corregir el efectivo en mano:
      caja.saldo = Number(monto_inicial);
      await this.cajaRepository.save(caja);
    }

    const sesion = this.sesionCajaRepository.create({
      id_caja,
      monto_inicial,
      id_usuario,
      estado_sesion: 'ABIERTA',
      id_user_create,
      desglose_arqueo: abrirCajaDto.desglose_arqueo || null,
    });

    const nuevaSesion = await this.sesionCajaRepository.save(sesion);

    // 📡 Notificar al frontend apertura en tiempo real
    this.appGateway.notifyDataChange('caja', 'CAJA_ABIERTA');

    return nuevaSesion;
  }

  async getResumenInventario(): Promise<any[]> {
    try {
      const productos = await this.productoRepository.find({
        where: { estado: true },
        relations: ['categoria'],
        order: { id: 'ASC' },
      });

      return (productos || []).map((p) => ({
        id: p.id,
        nombre: p.nombre || '',
        codigo_barras: p.codigo_barras || '',
        precio_venta: Number(p.precio_venta || 0),
        costo_compra: Number(p.costo_compra || 0),
        stock_actual: p.stock_actual ?? 0,
        stockActual: p.stock_actual ?? 0,
        categoria: p.categoria ? p.categoria.nombre : 'Sin Categoría',
        id_categoria: p.categoria ? p.categoria.id : null,
      }));
    } catch (error) {
      console.error('Error en getResumenInventario:', error);
      return [];
    }
  }

  async getEstadoInventario(): Promise<any[]> {
    try {
      const productos = await this.productoRepository.find({
        where: { estado: true },
        relations: ['categoria'],
        order: { id: 'ASC' },
      });

      return (productos || []).map((p) => {
        const catNombre = p.categoria ? p.categoria.nombre : 'Sin Categoría';
        const pNombre = (p.nombre || '').toLowerCase();
        const catLower = catNombre.toLowerCase();
        const isPlatform =
          catLower.includes('recarga') ||
          catLower.includes('plataforma') ||
          pNombre.includes('viva box') ||
          pNombre.includes('kiosco');

        return {
          id: p.id,
          nombre: p.nombre || '',
          codigo_barras: p.codigo_barras || '',
          precio_venta: Number(p.precio_venta || 0),
          costo_compra: Number(p.costo_compra || 0),
          stockSistema: p.stock_actual ?? 0,
          stock_actual: p.stock_actual ?? 0,
          categoria: catNombre,
          id_categoria: p.categoria ? p.categoria.id : null,
          tipo: isPlatform ? 'SALDO_VIRTUAL' : 'FISICO',
        };
      });
    } catch (error) {
      console.error('Error en getEstadoInventario:', error);
      return [];
    }
  }

  async cerrarCaja(
    idSesion: number,
    cerrarCajaDto: CerrarCajaDto,
  ): Promise<SesionCaja> {
    const { monto_real_fisico, id_user_update, observacion } = cerrarCajaDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bloquear la sesión para evitar cierres concurrentes
      const sesion = await queryRunner.manager.findOne(SesionCaja, {
        where: { id: idSesion, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sesion) {
        throw new NotFoundException(
          `Sesión con ID ${idSesion} no encontrada o inactiva`,
        );
      }
      if (sesion.estado_sesion === 'CERRADA') {
        throw new BadRequestException(`La sesión ya está cerrada`);
      }

      // Totales calculados por el sistema (SOLO LECTURA) mediante consulta agrupada
      const totales = await queryRunner.manager
        .createQueryBuilder(MovimientoCaja, 'mov')
        .select('mov.tipo', 'tipo')
        .addSelect('COALESCE(SUM(mov.monto), 0)', 'total')
        .where('mov.id_sesion_caja = :idSesion', { idSesion })
        .andWhere('mov.estado = true')
        .groupBy('mov.tipo')
        .getRawMany();

      let totalIngresos = 0;
      let totalEgresos = 0;

      for (const row of totales) {
        if (row.tipo === 'INGRESO') totalIngresos = Number(row.total);
        else if (row.tipo === 'EGRESO') totalEgresos = Number(row.total);
      }

      // Monto esperado calculado por el sistema (inalterable)
      const monto_esperado =
        Number(sesion.monto_inicial) + totalIngresos - totalEgresos;

      // Diferencia de arqueo: conteo físico vs esperado por sistema
      const monto_diferencia = monto_real_fisico - monto_esperado;

      // Determinar estado del arqueo
      let estado_arqueo: string;
      if (monto_diferencia > 0) {
        estado_arqueo = 'SOBRANTE';
      } else if (monto_diferencia < 0) {
        estado_arqueo = 'FALTANTE';
      } else {
        estado_arqueo = 'CUADRADO';
      }

      // Actualizar la sesión con los valores calculados e ingresados
      sesion.monto_final_teorico = monto_esperado;
      sesion.monto_esperado = monto_esperado;
      sesion.monto_final_real = monto_real_fisico;
      sesion.monto_real_fisico = monto_real_fisico;
      sesion.diferencia = monto_diferencia;
      sesion.monto_diferencia = monto_diferencia;
      sesion.estado_arqueo = estado_arqueo;
      sesion.desglose_arqueo = {
        monto_inicial: Number(sesion.monto_inicial),
        total_ingresos: totalIngresos,
        total_egresos: totalEgresos,
        monto_esperado,
        monto_real_fisico,
        monto_diferencia,
        estado_arqueo,
      };
      if (observacion) {
        sesion.observacion = observacion;
      }
      sesion.estado_sesion = 'CERRADA';
      sesion.fecha_cierre = new Date();
      sesion.id_user_update = id_user_update;

      const sesionCerrada = await queryRunner.manager.save(sesion);

      await queryRunner.commitTransaction();

      // 📡 Notificar al frontend cierre en tiempo real
      this.appGateway.notifyDataChange('caja', 'CAJA_CERRADA');

      return sesionCerrada;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async crearMovimiento(
    crearMovimientoDto: CrearMovimientoDto,
  ): Promise<MovimientoCaja> {
    const { id_sesion_caja, monto, tipo, motivo, id_user_create } =
      crearMovimientoDto;

    // Buscamos la sesión junto con su relación 'caja'
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id: id_sesion_caja, estado: true },
      relations: ['caja'],
    });

    if (!sesion)
      throw new NotFoundException(
        `Sesión de caja con ID ${id_sesion_caja} no encontrada o inactiva`,
      );
    if (sesion.estado_sesion !== 'ABIERTA')
      throw new BadRequestException(
        `No se pueden registrar movimientos en una sesión cerrada`,
      );
    if (!sesion.caja)
      throw new BadRequestException(
        `La sesión no tiene una caja física asociada.`,
      );

    // 3. CORRECCIÓN: Actualizar el saldo acumulado en la tabla 'Cajas' en caliente
    const caja = sesion.caja;
    const saldoActual = Number(caja.saldo ?? 0);
    const montoMovimiento = Number(monto);

    if (tipo === 'INGRESO') {
      caja.saldo = saldoActual + montoMovimiento;
    } else if (tipo === 'EGRESO') {
      if (saldoActual < montoMovimiento) {
        throw new BadRequestException(
          `Fondos insuficientes en el saldo de la caja. Saldo disponible: ${saldoActual}`,
        );
      }
      caja.saldo = saldoActual - montoMovimiento;
    }

    // Guardamos la actualización de la caja
    await this.cajaRepository.save(caja);

    // Guardamos el movimiento manual
    const movimiento = this.movimientoCajaRepository.create({
      id_sesion_caja,
      monto,
      tipo,
      motivo,
      id_user_create,
    });

    const nuevoMovimiento =
      await this.movimientoCajaRepository.save(movimiento);

    // 📡 Notificar en tiempo real que el saldo y los movimientos mutaron
    this.appGateway.notifyDataChange('caja', 'saldo_actualizado');

    return nuevoMovimiento;
  }

  async getSesionActivaUsuario(id_usuario: number): Promise<SesionCaja> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id_usuario, estado_sesion: 'ABIERTA', estado: true },
    });
    if (!sesion) {
      throw new NotFoundException(
        `No hay sesión activa para el usuario ${id_usuario}`,
      );
    }
    return sesion;
  }

  async getSesionBalance(idSesion: number): Promise<any> {
    const sesion = await this.sesionCajaRepository.findOneBy({
      id: idSesion,
      estado: true,
    });
    if (!sesion) {
      throw new NotFoundException(
        `Sesión con ID ${idSesion} no encontrada o inactiva`,
      );
    }

    const movimientos = await this.movimientoCajaRepository.find({
      where: { id_sesion_caja: idSesion, estado: true },
    });

    let totalIngresos = 0;
    let totalEgresos = 0;

    for (const mov of movimientos) {
      if (mov.tipo === 'INGRESO') totalIngresos += Number(mov.monto);
      else if (mov.tipo === 'EGRESO') totalEgresos += Number(mov.monto);
    }

    const monto_final_teorico =
      Number(sesion.monto_inicial) + totalIngresos - totalEgresos;

    return {
      monto_inicial: Number(sesion.monto_inicial),
      ingresos: totalIngresos,
      egresos: totalEgresos,
      monto_final_teorico,
    };
  }

  async softDeleteCaja(id: number, id_user_update: number): Promise<void> {
    const caja = await this.findCaja(id);
    caja.estado = false;
    caja.id_user_update = id_user_update;
    await this.cajaRepository.save(caja);
    this.appGateway.notifyDataChange('caja', 'eliminada');
  }

  async crearPrestamo(crearPrestamoDto: CrearPrestamoDto): Promise<PrestamoCaja> {
    const { id_sesion_caja, monto, motivo, id_user_create } = crearPrestamoDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Idempotencia: rechaza registros con igual sesión, monto y motivo en un intervalo < 3s
      const ventanaIdempotencia = new Date(Date.now() - 3000);
      const duplicado = await queryRunner.manager
        .createQueryBuilder(PrestamoCaja, 'prestamo')
        .where('prestamo.id_sesion_caja = :id_sesion_caja', { id_sesion_caja })
        .andWhere('prestamo.monto = :monto', { monto: Number(monto) })
        .andWhere('prestamo.motivo = :motivo', { motivo })
        .andWhere('prestamo.fecha_prestamo > :ventana', { ventana: ventanaIdempotencia })
        .getOne();

      if (duplicado) {
        throw new BadRequestException(
          `Préstamo duplicado: ya se registró un retiro idéntico (ID ${duplicado.id}) hace menos de 3 segundos.`,
        );
      }

      // Bloquear la fila de la sesión para serializar peticiones concurrentes (SELECT ... FOR UPDATE)
      const sesion = await queryRunner.manager.findOne(SesionCaja, {
        where: { id: id_sesion_caja, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sesion || sesion.estado_sesion !== 'ABIERTA') {
        throw new BadRequestException(`No hay una sesión de caja abierta para registrar el préstamo`);
      }

      // Bloquear la fila de la caja física para evitar carreras sobre el saldo
      const caja = await queryRunner.manager.findOne(Caja, {
        where: { id: sesion.id_caja, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!caja) {
        throw new BadRequestException(`La sesión no cuenta con una caja física asociada`);
      }

      const saldoActual = Number(caja.saldo ?? 0);
      const montoPrestamo = Number(monto);

      if (saldoActual < montoPrestamo) {
        throw new BadRequestException(`Fondos insuficientes en caja. Saldo disponible: ${saldoActual}`);
      }

      // 1. Descontar del saldo de la caja física
      caja.saldo = saldoActual - montoPrestamo;
      await queryRunner.manager.save(caja);

      // 2. Registrar movimiento de egreso
      const movimiento = queryRunner.manager.create(MovimientoCaja, {
        id_sesion_caja,
        monto: montoPrestamo,
        tipo: 'EGRESO',
        motivo: `[Préstamo / Salida de Caja] ${motivo}`,
        id_user_create,
      });
      await queryRunner.manager.save(movimiento);

      // 3. Crear registro de PrestamoCaja
      const prestamo = queryRunner.manager.create(PrestamoCaja, {
        id_sesion_caja,
        monto: montoPrestamo,
        motivo,
        estado_prestamo: 'PENDIENTE',
        id_user_create,
      });

      const nuevoPrestamo = await queryRunner.manager.save(prestamo);

      await queryRunner.commitTransaction();

      // Notificaciones en tiempo real solo si la transacción fue confirmada
      this.appGateway.notifyDataChange('caja', 'saldo_actualizado');
      this.appGateway.notifyDataChange('caja', 'prestamo_creado');

      return nuevoPrestamo;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllPrestamos(): Promise<PrestamoCaja[]> {
    return this.prestamoCajaRepository.find({
      where: { estado: true },
      relations: ['sesion_caja'],
      order: { id: 'DESC' },
    });
  }

  async pagarPrestamo(
    id: number,
    body: { id_sesion_caja: number; id_user_update: number },
  ): Promise<PrestamoCaja> {
    const { id_sesion_caja, id_user_update } = body;

    const prestamo = await this.prestamoCajaRepository.findOne({
      where: { id, estado: true },
    });

    if (!prestamo) {
      throw new NotFoundException(`Préstamo con ID ${id} no encontrado`);
    }

    if (prestamo.estado_prestamo === 'PAGADO') {
      throw new BadRequestException(`El préstamo ya fue devuelto / pagado`);
    }

    const sesion = await this.sesionCajaRepository.findOne({
      where: { id: id_sesion_caja, estado: true },
      relations: ['caja'],
    });

    if (!sesion || sesion.estado_sesion !== 'ABIERTA') {
      throw new BadRequestException(`No hay una sesión de caja abierta para recibir la devolución`);
    }

    const montoDevolucion = Number(prestamo.monto);

    // 1. Aumentar el saldo de la caja física
    if (sesion.caja) {
      const caja = sesion.caja;
      caja.saldo = Number(caja.saldo ?? 0) + montoDevolucion;
      await this.cajaRepository.save(caja);
    }

    // 2. Registrar movimiento de ingreso
    const movimiento = this.movimientoCajaRepository.create({
      id_sesion_caja,
      monto: montoDevolucion,
      tipo: 'INGRESO',
      motivo: `[Devolución de Préstamo #${prestamo.id}] ${prestamo.motivo}`,
      id_user_create: id_user_update,
    });
    await this.movimientoCajaRepository.save(movimiento);

    // 3. Actualizar estado del préstamo
    prestamo.estado_prestamo = 'PAGADO';
    prestamo.fecha_devolucion = new Date();
    prestamo.id_user_update = id_user_update;

    const prestamoPagado = await this.prestamoCajaRepository.save(prestamo);

    this.appGateway.notifyDataChange('caja', 'saldo_actualizado');
    this.appGateway.notifyDataChange('caja', 'prestamo_pagado');

    return prestamoPagado;
  }
}
