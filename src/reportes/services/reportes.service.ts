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
import * as Handlebars from 'handlebars';
const html_pdf = require('html-pdf-node');

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
  async getMovimientosCajaPdf(idSesion: number): Promise<Buffer> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id: idSesion },
      relations: ['caja'],
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión de caja con ID ${idSesion} no encontrada`);
    }

    const movimientos = await this.movimientoCajaRepository.find({
      where: { id_sesion_caja: idSesion, estado: true },
      order: { fecha: 'ASC' },
    });

    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background-color: #f3f4f6; padding: 15px; rounded: 8px; }
          .info-item { font-size: 13px; }
          .info-label { font-weight: bold; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #3b82f6; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .total-box { margin-top: 25px; padding: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; float: right; width: 250px; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
          .total-final { font-weight: bold; font-size: 16px; color: #1e3a8a; border-top: 1px solid #bfdbfe; padding-top: 5px; margin-top: 5px; }
          .badge-ingreso { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-egreso { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Reporte de Movimientos de Caja</div>
          <div class="subtitle">Kantuta POS - Control de Caja Físico</div>
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-label">Caja:</span> ${sesion.caja.nombre}</div>
          <div class="info-item"><span class="info-label">ID Sesión:</span> ${sesion.id}</div>
          <div class="info-item"><span class="info-label">Apertura:</span> ${new Date(sesion.fecha_apertura).toLocaleString()}</div>
          <div class="info-item"><span class="info-label">Cierre:</span> ${sesion.fecha_cierre ? new Date(sesion.fecha_cierre).toLocaleString() : 'SESIÓN ABIERTA'}</div>
          <div class="info-item"><span class="info-label">Monto Inicial:</span> Bs. ${Number(sesion.monto_inicial).toFixed(2)}</div>
          <div class="info-item"><span class="info-label">Saldo Actual/Teórico:</span> Bs. ${Number(sesion.monto_final_teorico || sesion.monto_inicial).toFixed(2)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha/Hora</th>
              <th>Tipo</th>
              <th>Motivo / Justificación</th>
              <th>Monto (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {{#each movimientos}}
            <tr>
              <td>{{this.id}}</td>
              <td>{{this.fechaFormateada}}</td>
              <td>
                {{#if this.isIngreso}}
                  <span class="badge-ingreso">INGRESO</span>
                {{else}}
                  <span class="badge-egreso">EGRESO</span>
                {{/if}}
              </td>
              <td>{{this.motivo}}</td>
              <td style="font-weight: bold;">Bs. {{this.montoFormateado}}</td>
            </tr>
            {{/each}}
            {{#unless movimientos}}
            <tr>
              <td colspan="5" style="text-align: center; color: #888;">No se registraron movimientos en esta sesión.</td>
            </tr>
            {{/unless}}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row"><span>(+) Ingresos:</span> <span>Bs. ${totalIngresos.toFixed(2)}</span></div>
          <div class="total-row"><span>(-) Egresos:</span> <span>Bs. ${totalEgresos.toFixed(2)}</span></div>
          <div class="total-row total-final"><span>Total Neto:</span> <span>Bs. ${(totalIngresos - totalEgresos).toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      movimientos: movimientos.map((m) => ({
        id: m.id,
        fechaFormateada: new Date(m.fecha).toLocaleString(),
        isIngreso: m.tipo === 'INGRESO',
        motivo: m.motivo,
        montoFormateado: Number(m.monto).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A4', margin: { top: '20px', bottom: '20px' } };
    const file = { content: htmlContent };
    
    return await html_pdf.generatePdf(file, options);
  }

  // --- REPORTE 2: Ventas por Rango ---
  async getVentasRangoPdf(fechaInicio: string, fechaFin: string, auditor: string): Promise<Buffer> {
    const start = new Date(fechaInicio);
    start.setHours(0, 0, 0, 0);

    const end = new Date(fechaFin);
    end.setHours(23, 59, 59, 999);

    const ventas = await this.ventaRepository.find({
      where: {
        fecha: Between(start, end),
        estado: true,
        estado_venta: 'COMPLETADA',
      },
      order: { fecha: 'DESC' },
    });

    const totalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #065f46; margin: 0; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #a7f3d0; }
          .info-item { font-size: 13px; }
          .info-label { font-weight: bold; color: #047857; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #10b981; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .summary-footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: right; }
          .grand-total { font-size: 18px; font-weight: bold; color: #065f46; margin-top: 15px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Auditoría de Ventas por Rango</div>
          <div class="subtitle">Kantuta POS - Control Interno Inmutable</div>
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-label">Rango Desde:</span> ${fechaInicio}</div>
          <div class="info-item"><span class="info-label">Rango Hasta:</span> ${fechaFin}</div>
          <div class="info-item"><span class="info-label">Auditor Responsable:</span> ${auditor}</div>
          <div class="info-item"><span class="info-label">Fecha de Emisión:</span> ${new Date().toLocaleString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID Venta</th>
              <th>Fecha/Hora</th>
              <th>Cliente</th>
              <th>Método de Pago</th>
              <th>Total Facturado</th>
            </tr>
          </thead>
          <tbody>
            {{#each ventas}}
            <tr>
              <td>#{{this.id}}</td>
              <td>{{this.fechaFormateada}}</td>
              <td>{{this.nombre_cliente}} (NIT/CI: {{this.nit_ci_cliente}})</td>
              <td>{{this.metodo_pago}}</td>
              <td style="font-weight: bold;">Bs. {{this.totalFormateado}}</td>
            </tr>
            {{/each}}
            {{#unless ventas}}
            <tr>
              <td colspan="5" style="text-align: center; color: #888;">No se registraron ventas en el rango seleccionado.</td>
            </tr>
            {{/unless}}
          </tbody>
        </table>

        <div class="grand-total">Total Facturado: Bs. ${totalVentas.toFixed(2)}</div>
        
        <div class="summary-footer">
          Documento generado bajo estrictas normas de seguridad de base de datos de Kantuta POS.<br>
          Cualquier alteración a este documento invalida su valor legal interno.
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      ventas: ventas.map((v) => ({
        id: v.id,
        fechaFormateada: new Date(v.fecha).toLocaleString(),
        nombre_cliente: "Consumidor Final",
        nit_ci_cliente: "N/A",
        metodo_pago: v.metodo_pago,
        totalFormateado: Number(v.total).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A4', margin: { top: '20px', bottom: '20px' } };
    const file = { content: htmlContent };

    return await html_pdf.generatePdf(file, options);
  }

  // --- REPORTE 3: Productividad por Operador ---
  async getProductividadOperadorPdf(fechaInicio: string, fechaFin: string): Promise<Buffer> {
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
      .andWhere('v.estado = true')
      .groupBy('u.id')
      .addGroupBy('u.name')
      .orderBy('total_facturado', 'DESC');

    const rawStats = await query.getRawMany();

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #5b21b6; margin: 0; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background-color: #f5f3ff; padding: 15px; border-radius: 8px; border: 1px solid #ddd6fe; }
          .info-item { font-size: 13px; }
          .info-label { font-weight: bold; color: #6d28d9; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #8b5cf6; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background-color: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Productividad y Ventas por Operador</div>
          <div class="subtitle">Kantuta POS - Monitoreo de Desempeño</div>
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-label">Rango Desde:</span> ${fechaInicio}</div>
          <div class="info-item"><span class="info-label">Rango Hasta:</span> ${fechaFin}</div>
          <div class="info-item"><span class="info-label">Fecha de Emisión:</span> ${new Date().toLocaleString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Transacciones Realizadas</th>
              <th>Total Facturado</th>
            </tr>
          </thead>
          <tbody>
            {{#each operadores}}
            <tr>
              <td>{{this.operador}}</td>
              <td>{{this.cantidad_ventas}} ventas</td>
              <td style="font-weight: bold; color: #5b21b6;">Bs. {{this.total_facturado}}</td>
            </tr>
            {{/each}}
            {{#unless operadores}}
            <tr>
              <td colspan="3" style="text-align: center; color: #888;">No se registraron ventas en el rango seleccionado.</td>
            </tr>
            {{/unless}}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      operadores: rawStats.map((item) => ({
        operador: item.operador,
        cantidad_ventas: Number(item.cantidad_ventas),
        total_facturado: Number(item.total_facturado).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A4', margin: { top: '20px', bottom: '20px' } };
    const file = { content: htmlContent };

    return await html_pdf.generatePdf(file, options);
  }

  // --- REPORTE 4: Compras por Rango ---
  async getComprasRangoPdf(fechaInicio: string, fechaFin: string, auditor: string): Promise<Buffer> {
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

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #c2410c; margin: 0; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background-color: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #ffedd5; }
          .info-item { font-size: 13px; }
          .info-label { font-weight: bold; color: #9a3412; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f97316; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .summary-footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: right; }
          .grand-total { font-size: 18px; font-weight: bold; color: #c2410c; margin-top: 15px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Historial de Compras de Inventario</div>
          <div class="subtitle">Kantuta POS - Control de Ingresos</div>
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-label">Rango Desde:</span> \${fechaInicio}</div>
          <div class="info-item"><span class="info-label">Rango Hasta:</span> \${fechaFin}</div>
          <div class="info-item"><span class="info-label">Auditor Responsable:</span> \${auditor}</div>
          <div class="info-item"><span class="info-label">Fecha de Emisión:</span> \${new Date().toLocaleString()}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID Compra</th>
              <th>Fecha/Hora</th>
              <th>Proveedor</th>
              <th>Pago con Caja</th>
              <th>Total Invertido</th>
            </tr>
          </thead>
          <tbody>
            {{#each compras}}
            <tr>
              <td>#{{this.id}}</td>
              <td>{{this.fechaFormateada}}</td>
              <td>{{this.proveedor}}</td>
              <td>{{#if this.pagado_con_caja}}Sí (Caja){{else}}No (Externo){{/if}}</td>
              <td style="font-weight: bold;">Bs. {{this.totalFormateado}}</td>
            </tr>
            {{/each}}
            {{#unless compras}}
            <tr>
              <td colspan="5" style="text-align: center; color: #888;">No se registraron compras en el rango seleccionado.</td>
            </tr>
            {{/unless}}
          </tbody>
        </table>

        <div class="grand-total">Total Invertido: Bs. \${totalCompras.toFixed(2)}</div>
        
        <div class="summary-footer">
          Documento generado por Kantuta POS.
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      compras: compras.map((c) => ({
        id: c.id,
        fechaFormateada: new Date(c.fecha).toLocaleString(),
        proveedor: c.proveedor || 'Sin Proveedor',
        pagado_con_caja: c.pagado_con_caja,
        totalFormateado: Number(c.total).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A4', margin: { top: '20px', bottom: '20px' } };
    const file = { content: htmlContent };

    return await html_pdf.generatePdf(file, options);
  }

  // --- REPORTE 5: Inventario ---
  async getInventarioPdf(auditor: string): Promise<Buffer> {
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

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #5b21b6; margin: 0; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background-color: #f5f3ff; padding: 15px; border-radius: 8px; border: 1px solid #ddd6fe; }
          .info-item { font-size: 13px; }
          .info-label { font-weight: bold; color: #6d28d9; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #8b5cf6; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .bajo-stock { color: #dc2626; font-weight: bold; }
          .summary-box { margin-top: 30px; padding: 15px; background: #fdf4ff; border: 1px solid #fbcfe8; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Reporte de Inventario Actual</div>
          <div class="subtitle">Kantuta POS - Existencias y Valoración</div>
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-label">Fecha de Corte:</span> \${new Date().toLocaleString()}</div>
          <div class="info-item"><span class="info-label">Auditor Responsable:</span> \${auditor}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Cód. Barras</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock Actual</th>
              <th>Costo Unit.</th>
              <th>PVP Unit.</th>
            </tr>
          </thead>
          <tbody>
            {{#each productos}}
            <tr>
              <td>{{this.codigo_barras}}</td>
              <td>{{this.nombre}}</td>
              <td>{{this.categoria}}</td>
              <td class="{{#if this.bajoStock}}bajo-stock{{/if}}">
                {{this.stock_actual}} {{#if this.bajoStock}}(BAJO){{/if}}
              </td>
              <td>Bs. {{this.costo}}</td>
              <td>Bs. {{this.precio}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="summary-box">
          <h3 style="margin-top: 0; color: #86198f;">Resumen de Valoración</h3>
          <p>Total de ítems en estado crítico (Bajo Stock): <strong>\${itemsBajoStock}</strong></p>
          <p>Costo Total del Inventario: <strong>Bs. \${totalCosto.toFixed(2)}</strong></p>
          <p>Valor de Venta del Inventario: <strong>Bs. \${totalPrecio.toFixed(2)}</strong></p>
          <p>Ganancia Proyectada: <strong>Bs. \${(totalPrecio - totalCosto).toFixed(2)}</strong></p>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      productos: productos.map((p) => ({
        codigo_barras: p.codigo_barras || '-',
        nombre: p.nombre,
        categoria: p.categoria ? p.categoria.nombre : '-',
        stock_actual: p.stock_actual,
        bajoStock: Number(p.stock_actual) <= Number(p.stock_minimo),
        costo: Number(p.costo_compra).toFixed(2),
        precio: Number(p.precio_venta).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A4', margin: { top: '20px', bottom: '20px' }, orientation: 'landscape' };
    const file = { content: htmlContent };

    return await html_pdf.generatePdf(file, options);
  }

  // --- REPORTE INDIVIDUAL: Recibo de Venta ---
  async getVentaReciboPdf(idVenta: number): Promise<Buffer> {
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

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #333; padding-bottom: 10px; }
          .title { font-size: 20px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 12px; color: #555; margin-top: 5px; }
          .info { font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { border-bottom: 1px solid #333; text-align: left; padding: 8px 0; font-size: 13px; }
          td { padding: 8px 0; border-bottom: 1px dotted #ccc; font-size: 13px; }
          .total-box { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; border-top: 2px dashed #333; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">TICKET DE VENTA</div>
          <div class="subtitle">Kantuta POS</div>
        </div>
        <div class="info">
          <strong>Nro. Ticket:</strong> ${venta.id}<br>
          <strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString()}<br>
          <strong>Cajero:</strong> ${nombreUsuario}<br>
          <strong>Método Pago:</strong> ${venta.metodo_pago}<br>
          <strong>Estado:</strong> ${venta.estado_venta}
        </div>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align:center">Cant.</th>
              <th style="text-align:right">P. Unit</th>
              <th style="text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {{#each detalles}}
            <tr>
              <td>{{this.nombre}}</td>
              <td style="text-align:center">{{this.cantidad}}</td>
              <td style="text-align:right">Bs. {{this.precio_unitario}}</td>
              <td style="text-align:right">Bs. {{this.subtotal}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div class="total-box">
          TOTAL: Bs. ${Number(venta.total).toFixed(2)}
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      detalles: venta.detalles.map((d) => ({
        nombre: d.producto?.nombre || 'Producto',
        cantidad: d.cantidad,
        precio_unitario: Number(d.precio_unitario).toFixed(2),
        subtotal: Number(d.subtotal).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A5', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } };
    return await html_pdf.generatePdf({ content: htmlContent }, options);
  }

  // --- REPORTE INDIVIDUAL: Ficha de Producto ---
  async getProductoFichaPdf(idProducto: number): Promise<Buffer> {
    const producto = await this.productoRepository.findOne({
      where: { id: idProducto },
      relations: ['categoria'],
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${idProducto} no encontrado`);
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
          .info-grid { border: 1px solid #ccc; border-radius: 8px; padding: 20px; background: #f9fafb; font-size: 14px; line-height: 1.6; }
          .label { font-weight: bold; color: #4b5563; display: inline-block; width: 150px; }
          .value { color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Ficha de Producto</div>
        </div>
        <div class="info-grid">
          <div><span class="label">ID Sistema:</span> <span class="value">${producto.id}</span></div>
          <div><span class="label">Nombre:</span> <span class="value">${producto.nombre}</span></div>
          <div><span class="label">Código Barras:</span> <span class="value">${producto.codigo_barras || 'N/A'}</span></div>
          <div><span class="label">Categoría:</span> <span class="value">${producto.categoria?.nombre || 'Sin categoría'}</span></div>
          <div><span class="label">Stock Actual:</span> <span class="value">${producto.stock_actual}</span></div>
          <div><span class="label">Stock Mínimo:</span> <span class="value">${producto.stock_minimo}</span></div>
          <div><span class="label">Precio Venta:</span> <span class="value">Bs. ${Number(producto.precio_venta).toFixed(2)}</span></div>
          <div><span class="label">Costo Compra:</span> <span class="value">Bs. ${Number(producto.costo_compra).toFixed(2)}</span></div>
          <div><span class="label">Fecha Ingreso:</span> <span class="value">${new Date(producto.created_at).toLocaleString()}</span></div>
        </div>
      </body>
      </html>
    `;

    const options = { format: 'A5', margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } };
    return await html_pdf.generatePdf({ content: htmlTemplate }, options);
  }

  // --- REPORTE INDIVIDUAL: Extracto Histórico de Caja Física ---
  async getCajaHistorialPdf(idCaja: number): Promise<Buffer> {
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

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 30px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
          .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #3b82f6; color: white; text-align: left; padding: 10px; font-size: 13px; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .total-box { margin-top: 25px; padding: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; float: right; width: 250px; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
          .total-final { font-weight: bold; font-size: 16px; color: #1e3a8a; border-top: 1px solid #bfdbfe; padding-top: 5px; margin-top: 5px; }
          .badge-ingreso { background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-egreso { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Extracto Histórico de Caja</div>
          <div class="subtitle">Caja: ${cajaNombre} (ID: ${idCaja})</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID Mov.</th>
              <th>Fecha/Hora</th>
              <th>Sesión</th>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>Monto (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {{#each movimientos}}
            <tr>
              <td>{{this.id}}</td>
              <td>{{this.fechaFormateada}}</td>
              <td>Sesión #{{this.id_sesion}}</td>
              <td>
                {{#if this.isIngreso}}
                  <span class="badge-ingreso">INGRESO</span>
                {{else}}
                  <span class="badge-egreso">EGRESO</span>
                {{/if}}
              </td>
              <td>{{this.motivo}}</td>
              <td style="font-weight: bold;">Bs. {{this.montoFormateado}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div class="total-box">
          <div class="total-row"><span>(+) Ingresos:</span> <span>Bs. ${totalIngresos.toFixed(2)}</span></div>
          <div class="total-row"><span>(-) Egresos:</span> <span>Bs. ${totalEgresos.toFixed(2)}</span></div>
          <div class="total-row total-final"><span>Flujo Neto:</span> <span>Bs. ${(totalIngresos - totalEgresos).toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(htmlTemplate);
    const data = {
      movimientos: movimientos.map((m) => ({
        id: m.id,
        fechaFormateada: new Date(m.fecha).toLocaleString(),
        id_sesion: m.sesion_caja.id,
        isIngreso: m.tipo === 'INGRESO',
        motivo: m.motivo,
        montoFormateado: Number(m.monto).toFixed(2),
      })),
    };

    const htmlContent = compiledTemplate(data);
    const options = { format: 'A4', margin: { top: '20px', bottom: '20px' } };
    return await html_pdf.generatePdf({ content: htmlContent }, options);
  }
}
