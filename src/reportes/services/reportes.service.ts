import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { RecargaTransaccion } from 'src/recargas/entities/recarga-transaccion.entity';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(RecargaTransaccion)
    private readonly recargaTransaccionRepository: Repository<RecargaTransaccion>,
  ) {}

  async getDashboardStats(anio: number) {
    const today = new Date();

    // Configurar rangos de fechas de hoy en zona horaria local (desde las 00:00:00 hasta las 23:59:59)
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    // Rango del mes actual
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0,
    );
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // --- 1. Calcular KPIs Rápidos ---

    // A. Ventas hoy (facturación completada)
    const ventasHoyResult = await this.ventaRepository
      .createQueryBuilder('v')
      .select('SUM(v.total)', 'total')
      .where('v.fecha BETWEEN :start AND :end', {
        start: startOfToday,
        end: endOfToday,
      })
      .andWhere("v.estado_venta = 'COMPLETADA'")
      .andWhere('v.estado = true')
      .getRawOne();
    const ventasHoy = Number(ventasHoyResult?.total || 0);

    // B. Total de recargas hoy (monto total vendido)
    const recargasHoyResult = await this.recargaTransaccionRepository
      .createQueryBuilder('rt')
      .select('SUM(rt.monto)', 'total')
      .where('rt.fecha BETWEEN :start AND :end', {
        start: startOfToday,
        end: endOfToday,
      })
      .andWhere("rt.tipo_operacion = 'VENTA_RECARGA'")
      .andWhere('rt.estado = true')
      .getRawOne();
    const recargasHoy = Number(recargasHoyResult?.total || 0);

    // C. Ganancia por comisiones hoy (comision_monto acumulado en compras de saldo)
    const comisionesHoyResult = await this.recargaTransaccionRepository
      .createQueryBuilder('rt')
      .select('SUM(rt.comision_monto)', 'total')
      .where('rt.fecha BETWEEN :start AND :end', {
        start: startOfToday,
        end: endOfToday,
      })
      .andWhere("rt.tipo_operacion = 'COMPRA_SALDO'")
      .andWhere('rt.estado = true')
      .getRawOne();
    const comisionesHoy = Number(comisionesHoyResult?.total || 0);

    // D. Cantidad de productos con stock bajo (stock_actual <= stock_minimo)
    const productosStockBajoCount = await this.productoRepository
      .createQueryBuilder('p')
      .where('p.stock_actual <= p.stock_minimo')
      .andWhere('p.estado = true')
      .getCount();

    // --- 2. Ventas totales agrupadas por mes para el año filtrado ---
    // Optimizamos usando un rango de fechas en lugar de EXTRACT en el WHERE para permitir uso de índices
    const startOfYear = new Date(anio, 0, 1, 0, 0, 0);
    const endOfYear = new Date(anio, 11, 31, 23, 59, 59);

    const ventasMensualesRaw = await this.ventaRepository
      .createQueryBuilder('v')
      .select('EXTRACT(MONTH FROM v.fecha)', 'mes')
      .addSelect('SUM(v.total)', 'total')
      .where('v.fecha BETWEEN :start AND :end', {
        start: startOfYear,
        end: endOfYear,
      })
      .andWhere("v.estado_venta = 'COMPLETADA'")
      .andWhere('v.estado = true')
      .groupBy('EXTRACT(MONTH FROM v.fecha)')
      .orderBy('mes', 'ASC')
      .getRawMany();

    // Mapear los meses del 1 al 12 a nombres de meses cortos
    const nombresMeses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const ventasMensuales = Array.from({ length: 12 }, (_, index) => {
      const mesNum = index + 1;
      const found = ventasMensualesRaw.find(
        (item) => Math.floor(Number(item.mes)) === mesNum,
      );
      return {
        mes: nombresMeses[index],
        total: found ? Number(found.total) : 0,
      };
    });

    // --- 3. Ranking Top 5 Productos más vendidos ---
    const topProductos = await this.ventaRepository
      .createQueryBuilder('v')
      .innerJoin('v.detalles', 'd')
      .innerJoin('d.producto', 'p')
      .select('p.nombre', 'nombre')
      .addSelect('SUM(d.cantidad)', 'cantidad')
      .addSelect('SUM(d.subtotal - (d.cantidad * p.costo_compra))', 'ganancia')
      .where("v.estado_venta = 'COMPLETADA'")
      .andWhere('v.estado = true')
      .andWhere('d.estado = true')
      .groupBy('p.id')
      .addGroupBy('p.nombre')
      .addGroupBy('p.costo_compra') // Agregado para consistencia en modo estricto de SQL
      .orderBy('cantidad', 'DESC')
      .limit(5)
      .getRawMany();

    const formattedTopProductos = topProductos.map((item) => ({
      nombre: item.nombre,
      cantidad: Number(item.cantidad),
      ganancia: Number(item.ganancia),
    }));

    // --- 4. Rendimiento/Distribución de Recargas del mes actual ---
    const recargasDistribucionRaw = await this.recargaTransaccionRepository
      .createQueryBuilder('rt')
      .innerJoin('rt.proveedor', 'prov')
      .select('prov.nombre', 'proveedor')
      .addSelect('SUM(rt.monto)', 'total')
      .where('rt.fecha BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .andWhere("rt.tipo_operacion = 'VENTA_RECARGA'")
      .andWhere('rt.estado = true')
      .groupBy('prov.nombre')
      .getRawMany();

    const recargasDistribucion = recargasDistribucionRaw.map((item) => ({
      proveedor: item.proveedor,
      total: Number(item.total),
    }));

    // Asegurarse de que Entel, Viva y Tigo estén representados aunque tengan total 0
    const marcasRecarga = ['Entel', 'Viva', 'Tigo'];
    const recargasFinales = marcasRecarga.map((marca) => {
      const found = recargasDistribucion.find(
        (item) => item.proveedor.toLowerCase() === marca.toLowerCase(),
      );
      return {
        proveedor: marca,
        total: found ? found.total : 0,
      };
    });

    return {
      kpis: {
        ventas_hoy: ventasHoy,
        recargas_hoy: recargasHoy,
        ganancia_comisiones_hoy: comisionesHoy,
        productos_stock_bajo: productosStockBajoCount,
      },
      ventas_mensuales: ventasMensuales,
      top_productos: formattedTopProductos,
      recargas_distribucion: recargasFinales,
    };
  }
}
