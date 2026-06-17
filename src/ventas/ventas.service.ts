import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { ActualizarVentaDto } from './dto/actualizar-venta.dto';
import { Producto } from '../inventario/entities/producto.entity';
import { SesionCaja } from '../cajas/entities/sesion-caja.entity';
import { AppGateway } from '../gateway/app.gateway';

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
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let total = 0;
      const detallesEntity: any[] = [];

      for (const detalle of detalles) {
        const producto = await queryRunner.manager.findOne(Producto, {
          where: { id: detalle.id_producto },
          lock: { mode: 'pessimistic_write' },
        });

        if (!producto) {
          throw new BadRequestException(`Producto con ID ${detalle.id_producto} no encontrado`);
        }

        if (producto.stock_actual < detalle.cantidad) {
          throw new BadRequestException(`Stock insuficiente para el producto ${producto.nombre}. Stock actual: ${producto.stock_actual}`);
        }

        producto.stock_actual -= detalle.cantidad;
        await queryRunner.manager.save(Producto, producto);

        const subtotal = detalle.cantidad * detalle.precio_unitario;
        total += subtotal;
        detallesEntity.push({
          ...detalle,
          subtotal,
          id_user_create: crearVentaDto.id_user_create,
        });
      }

      const sesionCaja = await queryRunner.manager.findOne(SesionCaja, {
        where: { id: crearVentaDto.id_sesion_caja, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sesionCaja || sesionCaja.estado_sesion !== 'ABIERTA') {
        throw new BadRequestException(`La sesión de caja con ID ${crearVentaDto.id_sesion_caja} no está abierta o no existe`);
      }

      sesionCaja.monto_final_teorico = Number(sesionCaja.monto_final_teorico || sesionCaja.monto_inicial) + total;
      await queryRunner.manager.save(SesionCaja, sesionCaja);

      const venta = queryRunner.manager.create(Venta, {
        ...ventaData,
        total,
        detalles: detallesEntity,
      });

      const savedVenta = await queryRunner.manager.save(Venta, venta);

      await queryRunner.commitTransaction();

      if (this.appGateway) {
         this.appGateway.notifyDataChange('caja', 'saldo_actualizado');
      }

      return savedVenta;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
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
}
