import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Caja } from '../cajas/entities/caja.entity';
import { MovimientoCaja } from '../cajas/entities/movimiento-caja.entity';
import { SesionCaja } from '../cajas/entities/sesion-caja.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { ActualizarEstadoPrestamoDto } from './dto/actualizar-estado-prestamo.dto';
import { CrearPrestamoExternoDto } from './dto/crear-prestamo-externo.dto';
import {
  EstadoPrestamoExterno,
  PrestamoExterno,
} from './entities/prestamo-externo.entity';

@Injectable()
export class PrestamosExternosService {
  constructor(
    @InjectRepository(PrestamoExterno)
    private readonly prestamoExternoRepository: Repository<PrestamoExterno>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepository: Repository<SesionCaja>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async crear(
    crearPrestamoExternoDto: CrearPrestamoExternoDto,
  ): Promise<PrestamoExterno> {
    const {
      caja_sesion_id,
      solicitante_externo,
      autorizador_id,
      id_autorizador,
      monto,
      motivo,
      id_user_create,
    } = crearPrestamoExternoDto;

    // Compatibilidad: el frontend puede enviar id_autorizador o autorizador_id
    const autorizadorId = autorizador_id ?? id_autorizador;
    if (!autorizadorId) {
      throw new BadRequestException(
        'Debe indicar el usuario que autoriza el préstamo externo',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const montoPrestamo = Number(monto);
      if (montoPrestamo <= 0) {
        throw new BadRequestException('El monto del préstamo debe ser mayor a cero');
      }

      const autorizador = await queryRunner.manager.findOne(Usuario, {
        where: { id: autorizadorId, estado: true },
      });

      if (!autorizador) {
        throw new NotFoundException(
          `Usuario autorizador con ID ${autorizadorId} no encontrado o inactivo`,
        );
      }

      // Si no llega la sesión, usamos la sesión abierta del usuario que registra
      let idSesionCaja = caja_sesion_id;
      if (!idSesionCaja) {
        const sesionAbierta = await queryRunner.manager.findOne(SesionCaja, {
          where: {
            id_usuario: id_user_create,
            estado: true,
            estado_sesion: 'ABIERTA',
          },
          order: { id: 'DESC' },
        });

        if (!sesionAbierta) {
          throw new BadRequestException(
            'No hay una sesión de caja abierta para el usuario que registra el préstamo externo',
          );
        }

        idSesionCaja = sesionAbierta.id;
      }

      const sesion = await queryRunner.manager.findOne(SesionCaja, {
        where: { id: idSesionCaja, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sesion || sesion.estado_sesion !== 'ABIERTA') {
        throw new BadRequestException(
          'No hay una sesión de caja abierta para registrar el préstamo externo',
        );
      }

      const caja = await queryRunner.manager.findOne(Caja, {
        where: { id: sesion.id_caja, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!caja) {
        throw new BadRequestException(
          'La sesión no cuenta con una caja física asociada',
        );
      }

      const saldoActual = Number(caja.saldo ?? 0);
      if (saldoActual < montoPrestamo) {
        throw new BadRequestException(
          `Fondos insuficientes en caja. Saldo disponible: ${saldoActual}`,
        );
      }

      caja.saldo = Number((saldoActual - montoPrestamo).toFixed(2));
      await queryRunner.manager.save(caja);

      const movimiento = queryRunner.manager.create(MovimientoCaja, {
        id_sesion_caja: idSesionCaja,
        monto: montoPrestamo,
        tipo: 'EGRESO',
        motivo: `[Préstamo externo] ${solicitante_externo}: ${motivo}`,
        id_user_create,
      });
      await queryRunner.manager.save(movimiento);

      const prestamo = queryRunner.manager.create(PrestamoExterno, {
        caja_sesion_id: idSesionCaja,
        solicitante_externo,
        autorizador_id: autorizadorId,
        monto: montoPrestamo,
        motivo,
        estado: EstadoPrestamoExterno.PENDIENTE,
        id_user_create,
      });

      const nuevoPrestamo = await queryRunner.manager.save(prestamo);
      await queryRunner.commitTransaction();

      return nuevoPrestamo;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async listar(
    estado?: EstadoPrestamoExterno,
    solicitante?: string,
  ): Promise<PrestamoExterno[]> {
    const query = this.prestamoExternoRepository
      .createQueryBuilder('prestamo')
      .leftJoinAndSelect('prestamo.caja_sesion', 'caja_sesion')
      .leftJoinAndSelect('prestamo.autorizador', 'autorizador')
      .orderBy('prestamo.id', 'DESC');

    if (estado) {
      query.andWhere('prestamo.estado = :estadoPrestamo', {
        estadoPrestamo: estado,
      });
    }

    if (solicitante) {
      query.andWhere('prestamo.solicitante_externo ILIKE :solicitante', {
        solicitante: `%${solicitante}%`,
      });
    }

    return query.getMany();
  }

  async actualizarEstado(
    id: number,
    actualizarEstadoPrestamoDto: ActualizarEstadoPrestamoDto,
  ): Promise<PrestamoExterno> {
    const { estado, caja_sesion_id, id_user_update } = actualizarEstadoPrestamoDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const prestamo = await queryRunner.manager.findOne(PrestamoExterno, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!prestamo) {
        throw new NotFoundException(`Préstamo externo con ID ${id} no encontrado`);
      }

      if (prestamo.estado === estado) {
        throw new BadRequestException(
          `El préstamo externo ya se encuentra en estado ${estado}`,
        );
      }

      if (estado === EstadoPrestamoExterno.PAGADO) {
        const idSesionDevolucion = caja_sesion_id ?? prestamo.caja_sesion_id;
        const sesion = await queryRunner.manager.findOne(SesionCaja, {
          where: { id: idSesionDevolucion, estado: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!sesion || sesion.estado_sesion !== 'ABIERTA') {
          throw new BadRequestException(
            'No hay una sesión de caja abierta para recibir la devolución del préstamo externo',
          );
        }

        const caja = await queryRunner.manager.findOne(Caja, {
          where: { id: sesion.id_caja, estado: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!caja) {
          throw new BadRequestException(
            'La sesión de devolución no cuenta con una caja física asociada',
          );
        }

        const montoDevolucion = Number(prestamo.monto);
        caja.saldo = Number((Number(caja.saldo ?? 0) + montoDevolucion).toFixed(2));
        await queryRunner.manager.save(caja);

        const movimiento = queryRunner.manager.create(MovimientoCaja, {
          id_sesion_caja: idSesionDevolucion,
          monto: montoDevolucion,
          tipo: 'INGRESO',
          motivo: `[Devolución préstamo externo #${prestamo.id}] ${prestamo.solicitante_externo}: ${prestamo.motivo}`,
          id_user_create: id_user_update,
        });
        await queryRunner.manager.save(movimiento);

        prestamo.fecha_devolucion = new Date();
      }

      if (estado === EstadoPrestamoExterno.PENDIENTE) {
        prestamo.fecha_devolucion = null;
      }

      prestamo.estado = estado;
      prestamo.id_user_update = id_user_update;

      const prestamoActualizado = await queryRunner.manager.save(prestamo);
      await queryRunner.commitTransaction();

      return prestamoActualizado;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
