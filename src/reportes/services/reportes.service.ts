import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Venta } from 'src/ventas/entities/venta.entity';
import { Producto } from 'src/inventario/entities/producto.entity';
import { RecargaCliente } from 'src/recargas/entities/recarga-cliente.entity';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { Usuario } from 'src/usuario/entities/usuario.entity';
import { Compra } from 'src/compras/entities/compra.entity';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(RecargaCliente)
    private readonly recargaClienteRepository: Repository<RecargaCliente>,
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepository: Repository<SesionCaja>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepository: Repository<MovimientoCaja>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
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
    const recargasHoyResult = await this.recargaClienteRepository
      .createQueryBuilder('rt')
      .select('SUM(rt.monto)', 'total')
      .where('rt.fecha_hora BETWEEN :start AND :end', {
        start: startOfToday,
        end: endOfToday,
      })
      .andWhere('rt.estado = true')
      .getRawOne();
    const recargasHoy = Number(recargasHoyResult?.total || 0);

    // C. Ganancia por comisiones hoy (desactivado temporalmente)
    const comisionesHoy = 0;

    // D. Cantidad de productos con stock bajo (stock_actual <= stock_minimo)
    const productosStockBajoCount = await this.productoRepository
      .createQueryBuilder('p')
      .where('p.stock_actual <= p.stock_minimo')
      .andWhere('p.estado = true')
      .getCount();

    // --- 2. Ventas totales agrupadas por mes para el año filtrado ---
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

    const nombresMeses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
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
      .addGroupBy('p.costo_compra')
      .orderBy('cantidad', 'DESC')
      .limit(5)
      .getRawMany();

    const formattedTopProductos = topProductos.map((item) => ({
      nombre: item.nombre,
      cantidad: Number(item.cantidad),
      ganancia: Number(item.ganancia),
    }));

    // --- 4. Rendimiento/Distribución de Recargas del mes actual ---
    const recargasDistribucionRaw = await this.recargaClienteRepository
      .createQueryBuilder('rt')
      .select('rt.operadora', 'proveedor')
      .addSelect('SUM(rt.monto)', 'total')
      .where('rt.fecha_hora BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .andWhere('rt.estado = true')
      .groupBy('rt.operadora')
      .getRawMany();

    const recargasDistribucion = recargasDistribucionRaw.map((item) => ({
      proveedor: item.proveedor,
      total: Number(item.total),
    }));

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

  // --- REPORTE 1: Movimientos de Caja ---
  async getMovimientosCajaData(idSesion: number): Promise<any> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id: idSesion },
      relations: ['caja'],
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión de caja con ID ${idSesion} no encontrada`);
    }

    // Obtenemos todos los movimientos y luego filtramos los auto-generados
    // por el sistema (recargas de clientes y fondeos de operadoras)
    const movimientosSinFiltrar = await this.movimientoCajaRepository.find({
      where: { id_sesion_caja: idSesion, estado: true },
      order: { fecha: 'ASC' },
    });

    // Excluir movimientos automáticos de recargas y fondeos de operadoras
    // (estos no representan movimientos manuales de caja)
    const movimientos = movimientosSinFiltrar.filter((m) => {
      const motivo = (m.motivo || '').toLowerCase();
      if (motivo.startsWith('venta de recarga a cliente')) return false;
      if (motivo.startsWith('fondeo de saldo a operadora')) return false;
      return true;
    });

    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    return {
      sesion: {
        id: sesion.id,
        cajaNombre: sesion.caja.nombre,
        fechaApertura: sesion.fecha_apertura,
        fechaCierre: sesion.fecha_cierre,
        montoInicial: Number(sesion.monto_inicial),
        saldoActualTeorico: Number(sesion.caja.saldo),
      },
      movimientos: movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        motivo: m.motivo,
        monto: Number(m.monto),
      })),
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        neto: totalIngresos - totalEgresos,
      },
    };
  }

  // --- REPORTE 2: Ventas por Rango ---
  async getVentasRangoData(fechaInicio: string, fechaFin: string, auditor: string): Promise<any> {
    const start = new Date(fechaInicio);
    start.setHours(0, 0, 0, 0);

    const end = new Date(fechaFin);
    end.setHours(23, 59, 59, 999);

    const ventas = await this.ventaRepository.find({
      where: {
        fecha: Between(start, end),
        estado: true,
      },
      order: { fecha: 'DESC' },
    });

    let efectivo = 0;
    let qr = 0;
    let transferencia = 0;
    let totalVentas = 0;

    const mappedVentas = ventas.map((v) => {
      const t = Number(v.total);
      if (v.estado_venta === 'COMPLETADA' || v.estado_venta === 'EDITADA') {
        totalVentas += t;
        if (v.metodo_pago === 'EFECTIVO') efectivo += t;
        if (v.metodo_pago === 'QR') qr += t;
        if (v.metodo_pago === 'TRANSFERENCIA') transferencia += t;
      }
      return {
        id: v.id,
        fecha: v.fecha,
        total: t,
        metodo_pago: v.metodo_pago,
        estado_venta: v.estado_venta,
      };
    });

    return {
      totales: {
        totalVendido: totalVentas,
        totalTransacciones: ventas.length,
        desglose: {
          efectivo,
          qr,
          transferencia,
          digitalTotal: qr + transferencia,
        }
      },
      ventas: mappedVentas
    };
  }

  // --- REPORTE 3: Productividad por Operador ---
  async getProductividadOperadorData(fechaInicio: string, fechaFin: string, operadorId?: number): Promise<any> {
    const start = new Date(fechaInicio);
    start.setHours(0, 0, 0, 0);

    const end = new Date(fechaFin);
    end.setHours(23, 59, 59, 999);

    const query = this.ventaRepository
      .createQueryBuilder('v')
      .innerJoin(Usuario, 'u', 'v.id_user_create = u.id')
      .select('u.name', 'operador')
      .addSelect('COUNT(v.id)', 'cantidad_ventas')
      .addSelect('SUM(v.total)', 'total_facturado')
      .where('v.fecha BETWEEN :start AND :end', { start, end })
      .andWhere("v.estado_venta = 'COMPLETADA'")
      .andWhere('v.estado = true');

    if (operadorId) {
      query.andWhere('u.id = :operadorId', { operadorId });
    }

    query.groupBy('u.id')
      .addGroupBy('u.name')
      .orderBy('total_facturado', 'DESC');

    const rawStats = await query.getRawMany();

    return {
      fechaInicio,
      fechaFin,
      fechaEmision: new Date().toISOString(),
      operadores: rawStats.map((item) => ({
        operador: item.operador,
        cantidad_ventas: Number(item.cantidad_ventas),
        total_facturado: Number(item.total_facturado),
      })),
    };
  }

  // --- REPORTE 4: Compras por Rango ---
  async getComprasRangoData(fechaInicio: string, fechaFin: string, auditor: string): Promise<any> {
    const start = new Date(fechaInicio);
    start.setHours(0, 0, 0, 0);

    const end = new Date(fechaFin);
    end.setHours(23, 59, 59, 999);

    const compras = await this.compraRepository.find({
      where: {
        fecha: Between(start, end),
        estado: true,
      },
      order: { fecha: 'DESC' },
    });

    const totalCompras = compras.reduce((sum, c) => sum + Number(c.total), 0);

    return {
      fechaInicio,
      fechaFin,
      auditor,
      fechaEmision: new Date().toISOString(),
      compras: compras.map((c) => ({
        id: c.id,
        fecha: c.fecha,
        proveedor: c.proveedor || 'Sin Proveedor',
        pagado_con_caja: c.pagado_con_caja,
        total: Number(c.total),
      })),
      totalInvertido: totalCompras,
    };
  }

  // --- REPORTE 5: Inventario ---
  async getInventarioData(auditor: string): Promise<any> {
    const productos = await this.productoRepository.find({
      where: { estado: true },
      order: { stock_actual: 'ASC' },
      relations: ['categoria'],
    });

    let totalCosto = 0;
    let totalPrecio = 0;
    let itemsBajoStock = 0;

    productos.forEach(p => {
      totalCosto += Number(p.costo_compra) * Number(p.stock_actual);
      totalPrecio += Number(p.precio_venta) * Number(p.stock_actual);
      if (Number(p.stock_actual) <= Number(p.stock_minimo)) {
        itemsBajoStock++;
      }
    });

    const mappedProductos = productos.map((p) => ({
      codigo_barras: p.codigo_barras || '-',
      nombre: p.nombre,
      categoria: p.categoria ? p.categoria.nombre : '-',
      stock_actual: Number(p.stock_actual),
      bajoStock: Number(p.stock_actual) <= Number(p.stock_minimo),
      costo: Number(p.costo_compra),
      precio: Number(p.precio_venta),
    }));

    return {
      fechaCorte: new Date().toISOString(),
      auditor,
      productos: mappedProductos,
      resumen: {
        itemsBajoStock,
        totalCosto,
        totalPrecio,
        gananciaProyectada: totalPrecio - totalCosto,
      }
    };
  }

  // --- REPORTE INDIVIDUAL: Recibo de Venta ---
  async getVentaReciboData(idVenta: number): Promise<any> {
    const venta = await this.ventaRepository.findOne({
      where: { id: idVenta },
      relations: ['detalles', 'detalles.producto'],
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${idVenta} no encontrada`);
    }

    let nombreUsuario = 'Sistema';
    if (venta.id_user_create) {
      const usuario = await this.usuarioRepository.findOne({ where: { id: venta.id_user_create } });
      if (usuario) {
        nombreUsuario = usuario.name;
      }
    }

    return {
      id: venta.id,
      fecha: venta.fecha,
      cajero: nombreUsuario,
      metodo_pago: venta.metodo_pago,
      estado_venta: venta.estado_venta,
      detalles: venta.detalles.map((d) => ({
        nombre: d.producto?.nombre || 'Producto',
        cantidad: d.cantidad,
        precio_unitario: Number(d.precio_unitario),
        subtotal: Number(d.subtotal),
      })),
      total: Number(venta.total),
    };
  }

  async getProductoFichaData(idProducto: number): Promise<any> {
    const producto = await this.productoRepository.findOne({
      where: { id: idProducto },
      relations: ['categoria'],
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${idProducto} no encontrado`);
    }

    return {
      id: producto.id,
      nombre: producto.nombre,
      codigo_barras: producto.codigo_barras,
      categoria: producto.categoria?.nombre || 'Sin categoría',
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      precio_venta: Number(producto.precio_venta),
      costo_compra: Number(producto.costo_compra),
      fecha_ingreso: producto.created_at,
    };
  }

  async getCajaHistorialData(idCaja: number): Promise<any> {
    const movimientos = await this.movimientoCajaRepository
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.sesion_caja', 's')
      .innerJoinAndSelect('s.caja', 'c')
      .where('c.id = :idCaja', { idCaja })
      .andWhere('m.estado = true')
      .orderBy('m.fecha', 'ASC')
      .getMany();

    if (movimientos.length === 0) {
      throw new NotFoundException(`No hay movimientos para la Caja con ID ${idCaja}`);
    }

    const cajaNombre = movimientos[0].sesion_caja.caja.nombre;
    const totalIngresos = movimientos.filter(m => m.tipo === 'INGRESO').reduce((sum, m) => sum + Number(m.monto), 0);
    const totalEgresos = movimientos.filter(m => m.tipo === 'EGRESO').reduce((sum, m) => sum + Number(m.monto), 0);

    return {
      caja: {
        id: idCaja,
        nombre: cajaNombre,
      },
      movimientos: movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        id_sesion: m.sesion_caja.id,
        tipo: m.tipo,
        motivo: m.motivo,
        monto: Number(m.monto),
      })),
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        neto: totalIngresos - totalEgresos,
      },
    };
  }
}
