import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RecargaProveedor } from '../entities/recarga-proveedor.entity';
import { RecargaTransaccion } from '../entities/recarga-transaccion.entity';
import { RecargaSesionControl } from '../entities/recarga-sesion-control.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { CreateTopUpTransactionDto, TipoOperacionRecarga } from '../dto/create-topup-transaction.dto';
import { OpenSessionTopUpDto } from '../dto/open-session-topup.dto';
import { CloseSessionTopUpDto } from '../dto/close-session-topup.dto';

@Injectable()
export class RecargasService {
  constructor(
    @InjectRepository(RecargaProveedor)
    private readonly proveedorRepository: Repository<RecargaProveedor>,
    @InjectRepository(RecargaTransaccion)
    private readonly transaccionRepository: Repository<RecargaTransaccion>,
    @InjectRepository(RecargaSesionControl)
    private readonly sesionControlRepository: Repository<RecargaSesionControl>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepository: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepository: Repository<MovimientoCaja>,
    private readonly dataSource: DataSource,
  ) {}

  async seedProveedores(idUser: number): Promise<RecargaProveedor[]> {
    const defaultProveedores = [
      { nombre: 'Entel', comision_porcentaje: 5.00 },
      { nombre: 'Viva', comision_porcentaje: 6.00 },
      { nombre: 'Tigo', comision_porcentaje: 5.00 },
    ];

    const creados: RecargaProveedor[] = [];
    for (const p of defaultProveedores) {
      const existe = await this.proveedorRepository.findOneBy({ nombre: p.nombre });
      if (!existe) {
        const nuevo = this.proveedorRepository.create({
          nombre: p.nombre,
          comision_porcentaje: p.comision_porcentaje,
          saldo_actual: 0,
          id_user_create: idUser,
        });
        creados.push(await this.proveedorRepository.save(nuevo));
      } else {
        creados.push(existe);
      }
    }
    return creados;
  }

  async getProveedores(): Promise<RecargaProveedor[]> {
    return this.proveedorRepository.find({ where: { estado: true }, order: { nombre: 'ASC' } });
  }

  async getSesionControl(sesionId: number): Promise<RecargaSesionControl[]> {
    return this.sesionControlRepository.find({
      where: { id_sesion_caja: sesionId, estado: true },
      relations: ['proveedor'],
    });
  }

  async createTransaction(dto: CreateTopUpTransactionDto): Promise<RecargaTransaccion> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar Sesión de Caja
      const sesion = await queryRunner.manager.findOne(SesionCaja, {
        where: { id: dto.id_sesion_caja, estado: true },
      });
      if (!sesion) throw new NotFoundException(`Sesión de caja con ID ${dto.id_sesion_caja} no encontrada`);
      if (sesion.estado_sesion !== 'ABIERTA') {
        throw new BadRequestException('La sesión de caja está cerrada. No se permiten transacciones.');
      }

      // 2. Validar Proveedor
      const proveedor = await queryRunner.manager.findOne(RecargaProveedor, {
        where: { id: dto.id_proveedor, estado: true },
      });
      if (!proveedor) throw new NotFoundException(`Proveedor de recarga con ID ${dto.id_proveedor} no encontrado`);

      // 3. Obtener o crear el registro de control de saldo de esta sesión para este proveedor
      let control = await queryRunner.manager.findOne(RecargaSesionControl, {
        where: { id_sesion_caja: dto.id_sesion_caja, id_proveedor: dto.id_proveedor, estado: true },
      });

      if (!control) {
        // Si no se inicializó, lo inicializamos con saldo 0
        control = queryRunner.manager.create(RecargaSesionControl, {
          id_sesion_caja: dto.id_sesion_caja,
          id_proveedor: dto.id_proveedor,
          saldo_inicial: proveedor.saldo_actual,
          saldo_final_teorico: proveedor.saldo_actual,
          id_user_create: dto.id_user_create,
        });
        control = await queryRunner.manager.save(RecargaSesionControl, control);
      }

      let comisionMonto = 0;
      let montoAcreditado = 0;
      let movimientoTipo: 'INGRESO' | 'EGRESO';
      let movimientoMotivo = '';

      if (dto.tipo_operacion === TipoOperacionRecarga.COMPRA_SALDO) {
        if (!dto.nro_referencia) {
          throw new BadRequestException('El número de referencia es obligatorio para compra de saldo.');
        }
        comisionMonto = Number(dto.monto) * (Number(proveedor.comision_porcentaje) / 100);
        montoAcreditado = Number(dto.monto) + comisionMonto;
        movimientoTipo = 'EGRESO';
        movimientoMotivo = `[RECARGAS] Compra de saldo ${proveedor.nombre} (Ref: ${dto.nro_referencia})`;

        // Incrementar saldo de la línea
        proveedor.saldo_actual = Number(proveedor.saldo_actual) + montoAcreditado;
        control.saldo_final_teorico = Number(control.saldo_final_teorico) + montoAcreditado;
      } else {
        // VENTA_RECARGA
        if (!dto.numero_telefono) {
          throw new BadRequestException('El número de teléfono es obligatorio para venta de recargas.');
        }
        if (Number(proveedor.saldo_actual) < Number(dto.monto)) {
          throw new BadRequestException(`Saldo insuficiente en la línea ${proveedor.nombre}. Saldo actual: ${proveedor.saldo_actual} BOB`);
        }
        montoAcreditado = -Number(dto.monto);
        movimientoTipo = 'INGRESO';
        movimientoMotivo = `[RECARGAS] Venta recarga ${proveedor.nombre} al número ${dto.numero_telefono}`;

        // Decrementar saldo de la línea
        proveedor.saldo_actual = Number(proveedor.saldo_actual) - Number(dto.monto);
        control.saldo_final_teorico = Number(control.saldo_final_teorico) - Number(dto.monto);
      }

      // 4. Guardar cambios en el Proveedor y Control
      await queryRunner.manager.save(RecargaProveedor, proveedor);
      await queryRunner.manager.save(RecargaSesionControl, control);

      // 5. Crear Movimiento en Caja
      const movimiento = queryRunner.manager.create(MovimientoCaja, {
        id_sesion_caja: dto.id_sesion_caja,
        monto: dto.monto,
        tipo: movimientoTipo,
        motivo: movimientoMotivo,
        id_user_create: dto.id_user_create,
      });
      await queryRunner.manager.save(MovimientoCaja, movimiento);

      // 6. Registrar Transacción de Recarga
      const transaccion = queryRunner.manager.create(RecargaTransaccion, {
        tipo_operacion: dto.tipo_operacion,
        id_proveedor: dto.id_proveedor,
        monto: dto.monto,
        comision_porcentaje: dto.tipo_operacion === TipoOperacionRecarga.COMPRA_SALDO ? proveedor.comision_porcentaje : 0,
        comision_monto: comisionMonto,
        monto_saldo_acreditado: montoAcreditado,
        numero_telefono: dto.numero_telefono,
        nro_referencia: dto.nro_referencia,
        url_comprobante: dto.url_comprobante,
        id_sesion_caja: dto.id_sesion_caja,
        id_user_create: dto.id_user_create,
      });

      const transaccionGuardada = await queryRunner.manager.save(RecargaTransaccion, transaccion);

      await queryRunner.commitTransaction();
      return transaccionGuardada;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async initializeSessionBalances(dto: OpenSessionTopUpDto): Promise<RecargaSesionControl[]> {
    const sesion = await this.sesionCajaRepository.findOneBy({ id: dto.id_sesion_caja, estado: true });
    if (!sesion) throw new NotFoundException(`Sesión de caja con ID ${dto.id_sesion_caja} no encontrada`);
    if (sesion.estado_sesion !== 'ABIERTA') throw new BadRequestException('La sesión de caja no está abierta');

    const controles: RecargaSesionControl[] = [];
    for (const item of dto.saldos) {
      const proveedor = await this.proveedorRepository.findOneBy({ id: item.id_proveedor, estado: true });
      if (!proveedor) throw new NotFoundException(`Proveedor con ID ${item.id_proveedor} no encontrado`);

      // Verificar si ya existe control para esta sesión y proveedor
      let control = await this.sesionControlRepository.findOneBy({
        id_sesion_caja: dto.id_sesion_caja,
        id_proveedor: item.id_proveedor,
        estado: true,
      });

      if (control) {
        control.saldo_inicial = item.saldo_inicial;
        // recalculamos teórico
        control.saldo_final_teorico = item.saldo_inicial;
      } else {
        control = this.sesionControlRepository.create({
          id_sesion_caja: dto.id_sesion_caja,
          id_proveedor: item.id_proveedor,
          saldo_inicial: item.saldo_inicial,
          saldo_final_teorico: item.saldo_inicial,
          id_user_create: dto.id_user_create,
        });
      }
      
      // Actualizar también el saldo real del proveedor de forma sincronizada
      proveedor.saldo_actual = item.saldo_inicial;
      await this.proveedorRepository.save(proveedor);

      controles.push(await this.sesionControlRepository.save(control));
    }
    return controles;
  }

  async closeSessionBalances(sesionId: number, dto: CloseSessionTopUpDto): Promise<RecargaSesionControl[]> {
    const sesion = await this.sesionCajaRepository.findOneBy({ id: sesionId, estado: true });
    if (!sesion) throw new NotFoundException(`Sesión de caja con ID ${sesionId} no encontrada`);

    const controles: RecargaSesionControl[] = [];
    for (const item of dto.saldos) {
      const control = await this.sesionControlRepository.findOneBy({
        id_sesion_caja: sesionId,
        id_proveedor: item.id_proveedor,
        estado: true,
      });

      if (!control) {
        throw new NotFoundException(`Control de saldo para proveedor ${item.id_proveedor} en la sesión ${sesionId} no encontrado`);
      }

      control.saldo_final_real = item.saldo_final_real;
      control.diferencia = Number(item.saldo_final_real) - Number(control.saldo_final_teorico);
      control.id_user_update = dto.id_user_update;

      controles.push(await this.sesionControlRepository.save(control));
    }
    return controles;
  }

  async getSessionSummary(sesionId: number) {
    const transacciones = await this.transaccionRepository.find({
      where: { id_sesion_caja: sesionId, estado: true },
      relations: ['proveedor'],
    });

    let totalVentas = 0;
    let totalCompras = 0;
    const porProveedor = {};

    for (const t of transacciones) {
      const m = Number(t.monto);
      const provNom = t.proveedor.nombre;

      if (!porProveedor[provNom]) {
        porProveedor[provNom] = { ventas: 0, compras: 0 };
      }

      if (t.tipo_operacion === 'VENTA_RECARGA') {
        totalVentas += m;
        porProveedor[provNom].ventas += m;
      } else {
        totalCompras += m;
        porProveedor[provNom].compras += m;
      }
    }

    const controles = await this.getSesionControl(sesionId);

    return {
      sesion_id: sesionId,
      total_ventas: totalVentas,
      total_compras: totalCompras,
      por_proveedor: porProveedor,
      controles: controles.map(c => ({
        proveedor: c.proveedor.nombre,
        saldo_inicial: Number(c.saldo_inicial),
        saldo_final_teorico: Number(c.saldo_final_teorico),
        saldo_final_real: c.saldo_final_real !== null ? Number(c.saldo_final_real) : null,
        diferencia: c.diferencia !== null ? Number(c.diferencia) : null,
      })),
    };
  }
}
