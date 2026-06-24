import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { ActualizarVentaDto } from './dto/actualizar-venta.dto';
import { Producto } from '../inventario/entities/producto.entity';
import { SesionCaja } from '../cajas/entities/sesion-caja.entity';
import { AppGateway } from '../gateway/app.gateway';
import { GetReporteVentasDto } from './dto/get-reporte-ventas.dto';
import { Caja } from 'src/cajas/entities/caja.entity';

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    private readonly dataSource: DataSource,
    private readonly appGateway: AppGateway,
  ) {}

  async create(crearVentaDto: CrearVentaDto): Promise<Venta> {
    const { detalles, ...ventaData } = crearVentaDto;

    // Iniciar la transacción para proteger Stock y Saldo de Caja simultáneamente
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let total = 0;
      const detallesEntity: any[] = [];

      // 1. Validar productos, verificar y descontar stock uno por uno
      for (const detalle of detalles) {
        const producto = await queryRunner.manager
          .createQueryBuilder(Producto, 'p')
          .where('p.id = :id', { id: detalle.id_producto })
          .setLock('pessimistic_write', undefined, ['p']) // Bloqueo estricto para evitar stock negativo en compras simultáneas
          .getOne();

        if (!producto) {
          throw new BadRequestException(
            `Producto con ID ${detalle.id_producto} no encontrado`,
          );
        }

        if (producto.stock_actual < detalle.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para el producto ${producto.nombre}. Stock actual: ${producto.stock_actual}`,
          );
        }

        // Restar stock y guardar
        producto.stock_actual -= detalle.cantidad;
        await queryRunner.manager.save(Producto, producto);

        // Calcular subtotal y acumular el total de la venta
        const subtotal = detalle.cantidad * detalle.precio_unitario;
        total += subtotal;

        detallesEntity.push({
          ...detalle,
          subtotal,
          id_user_create: crearVentaDto.id_user_create,
        });
      }

      // 2. Verificar que la sesión de caja exista y esté abierta
      const sesionCaja = await queryRunner.manager
        .createQueryBuilder(SesionCaja, 'sc')
        .leftJoinAndSelect('sc.caja', 'caja') // Traemos la relación de la caja física
        .where('sc.id = :id', { id: crearVentaDto.id_sesion_caja })
        .getOne();

      if (!sesionCaja || sesionCaja.estado_sesion !== 'ABIERTA') {
        throw new BadRequestException(
          `La sesión de caja con ID ${crearVentaDto.id_sesion_caja} no está abierta o no existe`,
        );
      }

      if (!sesionCaja.caja) {
        throw new BadRequestException(
          `La sesión no tiene una caja física asociada.`,
        );
      }

      // 3. Bloquear y obtener la fila de la Caja física para actualizar el SALDO de forma segura
      const cajaFisica = await queryRunner.manager
        .createQueryBuilder(Caja, 'c')
        .where('c.id = :id', { id: sesionCaja.caja.id })
        .setLock('pessimistic_write', undefined, ['c']) // Evitamos colisiones e hilos duplicados sumando dinero
        .getOne();

      if (!cajaFisica) {
        throw new BadRequestException(`No se pudo encontrar la caja física.`);
      }

      // 4. ACTUALIZAR EL NUEVO SALDO EN LA CAJA (Convertimos a Number por los decimales de Postgres)
      const saldoActual = Number(cajaFisica.saldo ?? 0);
      cajaFisica.saldo = saldoActual + total;

      // Guardamos la caja con su nuevo saldo dentro de la transacción
      await queryRunner.manager.save(Caja, cajaFisica);

      // 5. Crear y consolidar la entidad Venta
      const venta = queryRunner.manager.create(Venta, {
        ...ventaData,
        total,
        detalles: detallesEntity,
      });

      const savedVenta = await queryRunner.manager.save(Venta, venta);

      // Confirmar todos los cambios en bloque (Commit de la transacción)
      await queryRunner.commitTransaction();

      // Notificar al frontend mediante WebSockets para refrescar las insignias o contadores de saldo
      if (this.appGateway) {
        this.appGateway.notifyDataChange('caja', 'saldo_actualizado');
        this.appGateway.notifyDataChange('producto', 'stock_descontado');
        this.appGateway.notifyDataChange('venta', 'creada');
      }

      return savedVenta;
    } catch (error) {
      // Si cualquier proceso intermedio falla, se restaura el Stock original y el saldo de la Caja
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar los recursos de la base de datos
      await queryRunner.release();
    }
  }
  async findAll(): Promise<Venta[]> {
    return this.ventaRepository.find({
      where: { estado: true },
      relations: ['detalles'],
    });
  }

  async findOne(id: number): Promise<Venta> {
    const venta = await this.ventaRepository.findOne({
      where: { id, estado: true },
      relations: ['detalles'],
    });

    if (!venta) {
      throw new NotFoundException(
        `Venta con ID ${id} no encontrada o inactiva`,
      );
    }

    return venta;
  }

  async update(
    id: number,
    actualizarVentaDto: ActualizarVentaDto,
  ): Promise<Venta> {
    const { id_user_update, ...updateData } = actualizarVentaDto;
    const venta = await this.ventaRepository.preload({
      id,
      ...updateData,
    });

    if (!venta || !venta.estado) {
      throw new NotFoundException(
        `Venta con ID ${id} no encontrada o inactiva`,
      );
    }

    venta.id_user_update = id_user_update;

    return this.ventaRepository.save(venta);
  }

  async remove(id: number, id_user_update?: number): Promise<void> {
    const venta = await this.findOne(id);
    venta.estado = false;
    venta.id_user_update = id_user_update;
    await this.ventaRepository.save(venta);
  }
  async obtenerResumenVentasPorRango(queryDto: GetReporteVentasDto) {
    const { fechaInicio, fechaFin } = queryDto;

    const inicio = new Date(`${fechaInicio}T00:00:00.000Z`);
    const fin = new Date(`${fechaFin}T23:59:59.999Z`);

    if (inicio > fin) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser mayor a la fecha de fin',
      );
    }

    // Buscamos las ventas cargando las relaciones si fueran necesarias
    const ventas = await this.ventaRepository.find({
      where: {
        created_at: Between(inicio, fin),
        estado: true, // Tu borrado lógico/auditoría
      },
      order: { id: 'DESC' }, // Listar de las más recientes a las más antiguas
    });

    // Cálculos de totales acumulados (manteniendo lo que ya hiciste)
    let totalVendido = 0;
    let totalEfectivo = 0;
    let totalQr = 0;
    let totalTransferencia = 0;

    ventas.forEach((venta) => {
      const monto = Number(venta.total) || 0;
      if (venta.estado_venta !== 'ANULADA') {
        // Evitamos sumar ventas anuladas al total neto si aplica
        totalVendido += monto;
        if (venta.metodo_pago === 'EFECTIVO') totalEfectivo += monto;
        if (venta.metodo_pago === 'QR') totalQr += monto;
        if (venta.metodo_pago === 'TRANSFERENCIA') totalTransferencia += monto;
      }
    });

    return {
      metadata: {
        fechaInicio,
        fechaFin,
        ejecutadoEn: new Date().toISOString(),
      },
      totales: {
        totalVendido,
        totalTransacciones: ventas.length,
        desglose: {
          efectivo: totalEfectivo,
          qr: totalQr,
          transferencia: totalTransferencia,
          digitalTotal: totalEfectivo + totalQr + totalTransferencia,
        },
      },
      // 👇 RETORNAMOS EL ARREGLO COMPLETO PARA LA TABLA DEL PDF
      ventas: ventas.map((v) => ({
        id: v.id,
        fecha: v.created_at,
        total: Number(v.total),
        metodo_pago: v.metodo_pago,
        estado_venta: v.estado_venta,
      })),
    };
  }
}
