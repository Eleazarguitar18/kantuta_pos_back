import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Agente } from './entities/agente.entity';
import { TransaccionAgente } from './entities/transaccion-agente.entity';
import { OperadorDeuda } from './entities/operador-deuda.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { CrearAgenteDto } from './dto/crear-agente.dto';
import {
  CrearTransaccionAgenteDto,
  TipoOperacionAgente,
} from './dto/crear-transaccion-agente.dto';
import { AppGateway } from 'src/gateway/app.gateway';
import { AgentesGateway } from './agentes.gateway';

@Injectable()
export class AgentesService {
  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente>,
    @InjectRepository(TransaccionAgente)
    private readonly transaccionAgenteRepository: Repository<TransaccionAgente>,
    @InjectRepository(OperadorDeuda)
    private readonly operadorDeudaRepository: Repository<OperadorDeuda>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
    private readonly appGateway: AppGateway,
    private readonly agentesGateway: AgentesGateway,
  ) {}

  /**
   * Crea un nuevo banco/agente con su capital inicial y distribución explícita.
   * Reglas:
   * - Extrae monto_efectivo y monto_banco explícitos si se proporcionan.
   * - Si no se envía monto_efectivo ni monto_banco, asigna monto_banco = monto_total y monto_efectivo = 0.
   * - Si se envían montos de efectivo y/o banco, ajusta automáticamente monto_total = monto_efectivo + monto_banco
   *   o valida la ecuación de conservación (monto_efectivo + monto_banco === monto_total).
   * - monto_cuentas_por_cobrar inicia en 0.
   */
  async create(crearAgenteDto: CrearAgenteDto): Promise<Agente> {
    const rawNombre = crearAgenteDto.nombre_banco;
    if (!rawNombre || rawNombre.trim().length === 0) {
      throw new BadRequestException('El nombre del banco es obligatorio.');
    }

    const tieneEfectivo = crearAgenteDto.monto_efectivo !== undefined && crearAgenteDto.monto_efectivo !== null;
    const tieneBanco = crearAgenteDto.monto_banco !== undefined && crearAgenteDto.monto_banco !== null;
    const tieneTotal = (crearAgenteDto.monto_total !== undefined && crearAgenteDto.monto_total !== null) ||
                       (crearAgenteDto.monto_total_inicial !== undefined && crearAgenteDto.monto_total_inicial !== null);

    let montoEfectivo = tieneEfectivo ? Number(crearAgenteDto.monto_efectivo) : 0;
    let montoBanco = tieneBanco ? Number(crearAgenteDto.monto_banco) : 0;
    let montoTotal = tieneTotal
      ? Number(crearAgenteDto.monto_total ?? crearAgenteDto.monto_total_inicial)
      : 0;

    if (!tieneEfectivo && !tieneBanco) {
      // Caso 1: Solo se especificó el total (o ninguno); todo va al saldo bancario/digital
      montoBanco = montoTotal;
      montoEfectivo = 0;
    } else if (tieneEfectivo && !tieneBanco) {
      // Caso 2: Se especificó solo efectivo; si hay total, el restante va al banco, sino el total es el efectivo
      if (tieneTotal && montoTotal >= montoEfectivo) {
        montoBanco = montoTotal - montoEfectivo;
      } else {
        montoTotal = montoEfectivo;
        montoBanco = 0;
      }
    } else if (!tieneEfectivo && tieneBanco) {
      // Caso 3: Se especificó solo banco; si hay total, el restante va a efectivo, sino el total es el banco
      if (tieneTotal && montoTotal >= montoBanco) {
        montoEfectivo = montoTotal - montoBanco;
      } else {
        montoTotal = montoBanco;
        montoEfectivo = 0;
      }
    } else {
      // Caso 4: Se especificaron explícitamente tanto efectivo como banco
      const sumaComponentes = montoEfectivo + montoBanco;
      if (!tieneTotal || Math.abs(montoTotal - sumaComponentes) > 0.01) {
        // Ajustamos automáticamente monto_total a la suma de sus partes
        montoTotal = sumaComponentes;
      }
    }

    // Redondeo a 2 decimales para precisión monetaria
    montoEfectivo = Math.round(montoEfectivo * 100) / 100;
    montoBanco = Math.round(montoBanco * 100) / 100;
    montoTotal = Math.round(montoTotal * 100) / 100;
    const montoCuentasPorCobrar = 0;

    // Validación final estricta de conservación
    if (Math.abs((montoEfectivo + montoBanco + montoCuentasPorCobrar) - montoTotal) > 0.01) {
      throw new BadRequestException(
        `La suma de efectivo (${montoEfectivo}) y banco (${montoBanco}) no coincide con el total (${montoTotal}).`,
      );
    }

    const nuevoAgente = this.agenteRepository.create({
      nombre_banco: rawNombre.trim(),
      monto_total: montoTotal,
      monto_efectivo: montoEfectivo,
      monto_banco: montoBanco,
      monto_cuentas_por_cobrar: montoCuentasPorCobrar,
      descripcion: crearAgenteDto.descripcion || undefined,
      id_user_create: crearAgenteDto.id_user_create,
    });

    const guardado = await this.agenteRepository.save(nuevoAgente);

    // Emisión de WebSockets en tiempo real
    this.agentesGateway.emitAgenteCreado(guardado);
    this.appGateway.notifyDataChange('agentes', 'banco_creado');

    return guardado;
  }

  /**
   * Lista todos los bancos/agentes activos.
   */
  async findAll(): Promise<Agente[]> {
    return await this.agenteRepository.find({
      where: { estado: true },
      order: { id: 'ASC' },
    });
  }

  /**
   * Obtiene un banco/agente por ID.
   */
  async findOne(id: number): Promise<Agente> {
    const agente = await this.agenteRepository.findOne({
      where: { id, estado: true },
    });
    if (!agente) {
      throw new NotFoundException(`Banco/Agente con ID ${id} no encontrado o inactivo`);
    }
    return agente;
  }

  /**
   * Obtiene el balance general y la lista de operadores con deuda para un banco específico.
   * Alias: getBalance / getBalanceByAgenteId
   */
  async getBalanceByAgenteId(id: string | number) {
    const agenteId = Number(id);
    const agente = await this.findOne(agenteId);

    // Suma de deudas activas asociadas ÚNICAMENTE a ese banco/agente_id
    const operadoresDeudas = await this.operadorDeudaRepository.find({
      where: {
        id_agente: agente.id,
        estado_deuda: 'PENDIENTE',
        estado: true,
      },
      order: { fecha_registro: 'DESC' },
    });

    const totalDeudaOperadores = operadoresDeudas.reduce(
      (sum, item) => sum + Number(item.monto_pendiente),
      0,
    );

    const montoEfectivo = Number(agente.monto_efectivo);
    const montoBanco = Number(agente.monto_banco);
    const montoCuentasPorCobrar = totalDeudaOperadores;
    const montoTotal = Number(agente.monto_total);

    return {
      agente_id: agente.id,
      nombre_banco: agente.nombre_banco,
      descripcion: agente.descripcion,
      monto_efectivo: montoEfectivo,
      monto_banco: montoBanco,
      monto_cuentas_por_cobrar: montoCuentasPorCobrar,
      monto_total: montoTotal,
      es_balance_cuadrado:
        Math.abs(montoEfectivo + montoBanco + montoCuentasPorCobrar - montoTotal) < 0.01,
      agente: {
        id: agente.id,
        nombre_banco: agente.nombre_banco,
        descripcion: agente.descripcion,
        monto_total: montoTotal,
        monto_efectivo: montoEfectivo,
        monto_banco: montoBanco,
        monto_cuentas_por_cobrar: montoCuentasPorCobrar,
        es_balance_cuadrado:
          Math.abs(montoEfectivo + montoBanco + montoCuentasPorCobrar - montoTotal) < 0.01,
      },
      operadores_deudas: operadoresDeudas.map((d) => ({
        id: d.id,
        nombre_operador: d.nombre_operador,
        monto_pendiente: Number(d.monto_pendiente),
        estado_deuda: d.estado_deuda,
        fecha_registro: d.fecha_registro,
        motivo: d.motivo,
      })),
      resumen: {
        total_efectivo: montoEfectivo,
        total_banco: montoBanco,
        total_cuentas_por_cobrar: totalDeudaOperadores,
        capital_total: montoTotal,
      },
    };
  }

  async getBalance(agente_id: number) {
    return this.getBalanceByAgenteId(agente_id);
  }

  /**
   * Registra una transacción/movimiento de capital en un banco específico
   * garantizando el Principio de Conservación del Capital en una transacción con bloqueo pesimista.
   */
  async registrarTransaccion(dto: CrearTransaccionAgenteDto): Promise<{ success: boolean; message: string; data: TransaccionAgente }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Mapear internamente los valores independientemente de cómo vengan
      const idBancoFinal =
        dto.id_banco ??
        dto.banco_id ??
        dto.id_agente ??
        dto.agente_id ??
        dto.bancoId ??
        dto.agenteId;

      if (idBancoFinal === undefined || idBancoFinal === null || isNaN(Number(idBancoFinal))) {
        throw new BadRequestException('El campo de identificación del banco (id_banco, banco_id o agente_id) es obligatorio.');
      }
      const agente_id = Number(idBancoFinal);

      const idOperadorFinal =
        dto.id_operador ??
        dto.usuario_id ??
        dto.operador_id ??
        dto.id_usuario ??
        dto.operadorId ??
        dto.usuarioId;

      const motivoFinal = dto.motivo || dto.observacion || dto.descripcion;

      // Normalizar tipo de operacion ('PRESTAMO' | 'COBRO' o variantes)
      let tipoOperacion = (dto.tipo || dto.tipo_operacion || dto.tipoOperacion || '').toUpperCase();
      if (tipoOperacion === 'PRESTAMO' || tipoOperacion === 'OTORGAR_PRESTAMO') {
        tipoOperacion = TipoOperacionAgente.PRESTAMO_OPERADOR;
      } else if (tipoOperacion === 'COBRO' || tipoOperacion === 'COBRAR_OPERADOR' || tipoOperacion === 'PAGO') {
        tipoOperacion = TipoOperacionAgente.PAGO_OPERADOR;
      }

      if (!tipoOperacion) {
        throw new BadRequestException('El tipo de operación es obligatorio.');
      }

      // Normalizar vía / origen de fondos
      const fondoElegido = dto.via || dto.origen_fondo || dto.origenFondo;
      let origen = dto.origen;
      let destino = dto.destino;

      if (fondoElegido) {
        const fondoUpper = fondoElegido.toUpperCase();
        if (tipoOperacion === TipoOperacionAgente.PRESTAMO_OPERADOR && !origen) {
          origen = fondoUpper;
        } else if (tipoOperacion === TipoOperacionAgente.PAGO_OPERADOR && !destino) {
          destino = fondoUpper;
        }
      }

      // 2. Cargar el banco/agente con bloqueo pesimista
      const agente = await queryRunner.manager.findOne(Agente, {
        where: { id: agente_id, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!agente) {
        throw new NotFoundException(`Banco/Agente con ID ${agente_id} no encontrado o inactivo`);
      }

      let montoEfectivo = Number(agente.monto_efectivo);
      let montoBanco = Number(agente.monto_banco);
      let montoCuentasPorCobrar = Number(agente.monto_cuentas_por_cobrar);
      const montoTotal = Number(agente.monto_total);
      const montoOp = Number(dto.monto);

      let nombreOperador = (dto.nombre_operador || dto.operador_nombre || dto.nombreOperador)?.trim();

      if (!nombreOperador && idOperadorFinal) {
        const usuarioEncontrado = await queryRunner.manager.findOne(Usuario, {
          where: { id: Number(idOperadorFinal), estado: true },
          relations: ['persona'],
        });
        if (usuarioEncontrado) {
          const nombresPersona = usuarioEncontrado.persona?.nombres
            ? `${usuarioEncontrado.persona.nombres} ${usuarioEncontrado.persona.p_apellido || ''}`.trim()
            : usuarioEncontrado.name;
          nombreOperador = nombresPersona;
        }
      }

      const observacion = motivoFinal;

      // 2. Procesar según tipo_operacion
      switch (tipoOperacion) {
        case TipoOperacionAgente.PRESTAMO_OPERADOR: {
          if (!nombreOperador) {
            throw new BadRequestException(
              'El nombre o ID del operador es obligatorio para registrar un préstamo.',
            );
          }

          origen = (origen || 'BANCO').toUpperCase();
          destino = 'CUENTAS_POR_COBRAR';

          if (origen === 'EFECTIVO') {
            if (montoEfectivo < montoOp) {
              throw new BadRequestException(
                `Efectivo insuficiente en ${agente.nombre_banco}. Disponible: ${montoEfectivo.toFixed(2)} Bs`,
              );
            }
            montoEfectivo -= montoOp;
          } else if (origen === 'BANCO') {
            if (montoBanco < montoOp) {
              throw new BadRequestException(
                `Saldo bancario insuficiente en ${agente.nombre_banco}. Disponible: ${montoBanco.toFixed(2)} Bs`,
              );
            }
            montoBanco -= montoOp;
          } else {
            throw new BadRequestException(
              'El origen del préstamo debe ser EFECTIVO o BANCO.',
            );
          }

          montoCuentasPorCobrar += montoOp;

          // Registrar o actualizar deuda del operador para este banco específico
          let deudaOperador = await queryRunner.manager.findOne(OperadorDeuda, {
            where: {
              id_agente: agente.id,
              nombre_operador: nombreOperador,
              estado_deuda: 'PENDIENTE',
              estado: true,
            },
            lock: { mode: 'pessimistic_write' },
          });

          const idUser = dto.id_user_create ? Number(dto.id_user_create) : undefined;

          if (deudaOperador) {
            deudaOperador.monto_pendiente =
              Number(deudaOperador.monto_pendiente) + montoOp;
            deudaOperador.id_user_update = idUser;
            if (observacion) deudaOperador.motivo = observacion;
            await queryRunner.manager.save(deudaOperador);
          } else {
            deudaOperador = queryRunner.manager.create(OperadorDeuda, {
              id_agente: agente.id,
              nombre_operador: nombreOperador,
              monto_pendiente: montoOp,
              estado_deuda: 'PENDIENTE',
              motivo: observacion || `Préstamo de capital`,
              id_user_create: idUser,
            });
            await queryRunner.manager.save(deudaOperador);
          }
          break;
        }

        case TipoOperacionAgente.PAGO_OPERADOR: {
          if (!nombreOperador) {
            throw new BadRequestException(
              'El nombre o ID del operador es obligatorio para registrar un pago.',
            );
          }

          origen = 'CUENTAS_POR_COBRAR';
          destino = (destino || 'EFECTIVO').toUpperCase();

          const deudaOperador = await queryRunner.manager.findOne(OperadorDeuda, {
            where: {
              id_agente: agente.id,
              nombre_operador: nombreOperador,
              estado_deuda: 'PENDIENTE',
              estado: true,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!deudaOperador || Number(deudaOperador.monto_pendiente) <= 0) {
            throw new BadRequestException(
              `El operador ${nombreOperador} no tiene deudas pendientes registradas en ${agente.nombre_banco}.`,
            );
          }

          const saldoPendiente = Number(deudaOperador.monto_pendiente);
          if (montoOp > saldoPendiente) {
            throw new BadRequestException(
              `El monto del pago (${montoOp.toFixed(2)}) supera la deuda pendiente (${saldoPendiente.toFixed(2)} Bs).`,
            );
          }

          montoCuentasPorCobrar -= montoOp;

          if (destino === 'EFECTIVO') {
            montoEfectivo += montoOp;
          } else if (destino === 'BANCO') {
            montoBanco += montoOp;
          } else {
            throw new BadRequestException(
              'El destino del pago debe ser EFECTIVO o BANCO.',
            );
          }

          const nuevoSaldoDeuda = saldoPendiente - montoOp;
          deudaOperador.monto_pendiente = nuevoSaldoDeuda;
          deudaOperador.id_user_update = dto.id_user_create ? Number(dto.id_user_create) : undefined;

          if (nuevoSaldoDeuda <= 0.001) {
            deudaOperador.estado_deuda = 'PAGADO';
            deudaOperador.fecha_pago = new Date();
          }

          await queryRunner.manager.save(deudaOperador);
          break;
        }

        case TipoOperacionAgente.TRANSFERENCIA_INTERNA: {
          origen = (origen || 'EFECTIVO').toUpperCase();
          destino = (destino || 'BANCO').toUpperCase();

          if (origen === destino) {
            throw new BadRequestException(
              'El origen y el destino de la transferencia interna no pueden ser iguales.',
            );
          }

          if (origen === 'EFECTIVO' && destino === 'BANCO') {
            if (montoEfectivo < montoOp) {
              throw new BadRequestException(
                `Efectivo insuficiente en ${agente.nombre_banco}. Disponible: ${montoEfectivo.toFixed(2)} Bs`,
              );
            }
            montoEfectivo -= montoOp;
            montoBanco += montoOp;
          } else if (origen === 'BANCO' && destino === 'EFECTIVO') {
            if (montoBanco < montoOp) {
              throw new BadRequestException(
                `Saldo bancario insuficiente en ${agente.nombre_banco}. Disponible: ${montoBanco.toFixed(2)} Bs`,
              );
            }
            montoBanco -= montoOp;
            montoEfectivo += montoOp;
          } else {
            throw new BadRequestException(
              'La transferencia interna solo está permitida entre EFECTIVO y BANCO.',
            );
          }
          break;
        }

        case TipoOperacionAgente.DEPOSITO: {
          if (montoBanco < montoOp) {
            throw new BadRequestException(
              `Saldo bancario insuficiente en ${agente.nombre_banco} para realizar el depósito. Disponible: ${montoBanco.toFixed(2)} Bs`,
            );
          }
          montoBanco -= montoOp;
          montoEfectivo += montoOp;
          origen = 'BANCO';
          destino = 'EFECTIVO';
          break;
        }

        case TipoOperacionAgente.RETIRO: {
          if (montoEfectivo < montoOp) {
            throw new BadRequestException(
              `Efectivo insuficiente en ${agente.nombre_banco} para realizar el retiro. Disponible: ${montoEfectivo.toFixed(2)} Bs`,
            );
          }
          montoEfectivo -= montoOp;
          montoBanco += montoOp;
          origen = 'EFECTIVO';
          destino = 'BANCO';
          break;
        }

        case TipoOperacionAgente.TRANSFERENCIA_QR: {
          if (montoBanco < montoOp) {
            throw new BadRequestException(
              `Saldo bancario insuficiente en ${agente.nombre_banco} para transferencia QR. Disponible: ${montoBanco.toFixed(2)} Bs`,
            );
          }
          montoBanco -= montoOp;
          montoEfectivo += montoOp;
          origen = 'BANCO';
          destino = 'EFECTIVO';
          break;
        }

        default:
          throw new BadRequestException(
            `Tipo de operación ${tipoOperacion} no reconocida`,
          );
      }

      // 3. VALIDACIÓN ESTRICTA DEL PRINCIPIO DE CONSERVACIÓN DE CAPITAL
      const sumaCalculada = Math.round((montoEfectivo + montoBanco + montoCuentasPorCobrar) * 100) / 100;
      const sumaEsperada = Math.round(montoTotal * 100) / 100;

      if (Math.abs(sumaCalculada - sumaEsperada) > 0.01) {
        throw new BadRequestException(
          `Violación del Principio de Conservación de Capital para ${agente.nombre_banco}: La suma (${sumaCalculada} Bs) no coincide con el Capital Total (${sumaEsperada} Bs). Rollback ejecutado.`,
        );
      }

      // 4. Actualizar el saldo del banco específico
      agente.monto_efectivo = montoEfectivo;
      agente.monto_banco = montoBanco;
      agente.monto_cuentas_por_cobrar = montoCuentasPorCobrar;
      agente.id_user_update = dto.id_user_create ? Number(dto.id_user_create) : undefined;
      await queryRunner.manager.save(agente);

      // 5. Registrar la bitácora inalterable vinculada a agente_id
      const transaccion = queryRunner.manager.create(TransaccionAgente, {
        id_agente: agente.id,
        tipo_operacion: tipoOperacion as TipoOperacionAgente,
        monto: montoOp,
        origen: origen || 'NO_DEFINIDO',
        destino: destino || 'NO_DEFINIDO',
        nombre_operador: nombreOperador || undefined,
        descripcion: observacion || undefined,
        banco: dto.banco || agente.nombre_banco,
        comision_cliente: Number(dto.comision_cliente || 0),
        comision_banco: Number(dto.comision_banco || 0),
        nro_referencia: dto.nro_referencia || undefined,
        id_sesion_caja: dto.id_sesion_caja ? Number(dto.id_sesion_caja) : undefined,
        id_usuario: dto.id_user_create ? Number(dto.id_user_create) : undefined,
        id_user_create: dto.id_user_create ? Number(dto.id_user_create) : undefined,
      });

      const transaccionGuardada = await queryRunner.manager.save(transaccion);

      await queryRunner.commitTransaction();

      // Notificaciones WebSockets
      this.agentesGateway.emitAgenteActualizado({
        agente: {
          id: agente.id,
          nombre_banco: agente.nombre_banco,
          monto_total: Number(agente.monto_total),
          monto_efectivo: Number(agente.monto_efectivo),
          monto_banco: Number(agente.monto_banco),
          monto_cuentas_por_cobrar: Number(agente.monto_cuentas_por_cobrar),
        },
        transaccion: transaccionGuardada,
      });
      this.appGateway.notifyDataChange('agentes', 'capital_actualizado');

      return {
        success: true,
        message: 'Transacción registrada con éxito',
        data: transaccionGuardada,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Listar transacciones de un banco o todas
   */
  async findTransaccionesByAgente(agente_id?: number, limit?: number): Promise<TransaccionAgente[]> {
    return this.getTransaccionesByBanco(agente_id, limit);
  }

  /**
   * Obtener transacciones por ID de banco con manejo seguro de errores
   */
  async getTransaccionesByBanco(bancoId?: number, limit?: number): Promise<TransaccionAgente[]> {
    try {
      const whereClause: any = { estado: true };
      if (bancoId && !isNaN(Number(bancoId))) {
        whereClause.id_agente = Number(bancoId);
      }
      return await this.transaccionAgenteRepository.find({
        where: whereClause,
        order: { id: 'DESC' },
        take: limit && !isNaN(Number(limit)) ? Number(limit) : undefined,
      });
    } catch (error) {
      console.error('Error al obtener transacciones por banco:', error);
      return [];
    }
  }

  /**
   * Obtener operadores con deuda de un banco específico con manejo seguro de errores
   */
  async getOperadoresDeudaByBanco(bancoId?: number): Promise<OperadorDeuda[]> {
    try {
      const whereClause: any = {
        estado_deuda: 'PENDIENTE',
        estado: true,
      };
      if (bancoId && !isNaN(Number(bancoId))) {
        whereClause.id_agente = Number(bancoId);
      }
      return await this.operadorDeudaRepository.find({
        where: whereClause,
        order: { fecha_registro: 'DESC' },
      });
    } catch (error) {
      console.error('Error al obtener operadores deuda por banco:', error);
      return [];
    }
  }

  /**
   * Listar usuarios / operadores activos del sistema para el selector de movimientos
   */
  async listarOperadores() {
    const usuarios = await this.usuarioRepository.find({
      where: { estado: true },
      relations: ['persona', 'role'],
      order: { id: 'ASC' },
    });

    return usuarios.map((u) => {
      const nombreCompleto = u.persona?.nombres
        ? `${u.persona.nombres} ${u.persona.p_apellido || ''}`.trim()
        : u.name;

      return {
        id: u.id,
        nombre: nombreCompleto,
        username: u.name,
        email: u.email,
        rol: u.role?.nombre || 'Operador',
      };
    });
  }

  async softDeleteAgente(id: number | string, id_user_update?: number): Promise<{ message: string; id: number }> {
    return this.eliminarAgente(id, id_user_update);
  }

  /**
   * Realiza la eliminación lógica (soft-delete) o física de un banco/agente de forma segura.
   */
  async eliminarAgente(id: number | string, id_user_update?: number): Promise<{ message: string; id: number }> {
    const agenteId = Number(id);
    if (isNaN(agenteId)) {
      throw new BadRequestException('ID de banco/agente inválido.');
    }

    const agente = await this.agenteRepository.findOne({
      where: { id: agenteId, estado: true },
    });

    if (!agente) {
      throw new NotFoundException('El agente no existe o ya fue desactivado');
    }

    // Verificar si el agente tiene transacciones u operadores con deuda asociados
    const totalTransacciones = await this.transaccionAgenteRepository.count({
      where: { id_agente: agenteId },
    });

    const totalDeudas = await this.operadorDeudaRepository.count({
      where: { id_agente: agenteId },
    });

    if (totalTransacciones > 0 || totalDeudas > 0) {
      // Soft Delete para preservar integridad referencial e historial operativo
      agente.estado = false;
      if (id_user_update) {
        agente.id_user_update = id_user_update;
      }
      await this.agenteRepository.save(agente);
    } else {
      // Si no tiene historial operativo ni transacciones, también realizamos soft-delete por consistencia
      agente.estado = false;
      if (id_user_update) {
        agente.id_user_update = id_user_update;
      }
      await this.agenteRepository.save(agente);
    }

    this.agentesGateway.emitAgenteActualizado({ id: agenteId, estado: false });
    this.appGateway.notifyDataChange('agentes', 'banco_eliminado');

    return {
      message: 'Agente eliminado correctamente',
      id: agenteId,
    };
  }
}
