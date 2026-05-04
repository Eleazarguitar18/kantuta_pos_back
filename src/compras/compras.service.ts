import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Compra } from './entities/compra.entity';
import { DetalleCompra } from './entities/detalle-compra.entity';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { Producto } from 'src/inventario/entities/producto.entity';
import { CajasService } from 'src/cajas/cajas.service';
import { TipoMovimiento } from 'src/cajas/dto/crear-movimiento.dto';

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    @InjectRepository(DetalleCompra)
    private readonly detalleCompraRepository: Repository<DetalleCompra>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    private readonly cajasService: CajasService,
    private dataSource: DataSource,
  ) {}

  async create(crearCompraDto: CrearCompraDto): Promise<Compra> {
    const { detalles, pagar_con_caja, id_sesion_caja, id_user_create, proveedor } = crearCompraDto;

    if (pagar_con_caja && !id_sesion_caja) {
      throw new BadRequestException('Debe proporcionar id_sesion_caja si desea pagar con la caja');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalCompra = 0;
      const detallesParaGuardar: DetalleCompra[] = [];

      for (const item of detalles) {
        const producto = await queryRunner.manager.findOneBy(Producto, { id: item.id_producto });
        if (!producto) throw new NotFoundException(`Producto con ID ${item.id_producto} no encontrado`);

        const subtotal = Number(item.cantidad) * Number(item.costo_unitario);
        totalCompra += subtotal;

        // Actualizar stock y costo del producto
        producto.stock_actual += item.cantidad;
        producto.costo_compra = item.costo_unitario; 
        await queryRunner.manager.save(producto);

        const detalle = this.detalleCompraRepository.create({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario,
          subtotal,
          id_user_create
        });
        detallesParaGuardar.push(detalle);
      }

      const compra = this.compraRepository.create({
        proveedor,
        total: totalCompra,
        pagado_con_caja: pagar_con_caja,
        id_sesion_caja,
        detalles: detallesParaGuardar,
        id_user_create
      });

      const compraGuardada = await queryRunner.manager.save(compra);

      if (pagar_con_caja) {
        await this.cajasService.crearMovimiento({
          tipo: TipoMovimiento.EGRESO,
          monto: totalCompra,
          motivo: `Compra de mercancía - ID Compra: ${compraGuardada.id}`,
          id_sesion_caja: id_sesion_caja!,
          id_user_create
        });
      }

      await queryRunner.commitTransaction();
      return compraGuardada;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Compra[]> {
    return this.compraRepository.find({
      relations: ['detalles', 'detalles.producto'],
      where: { estado: true }
    });
  }
}
