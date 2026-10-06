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
import { CajaDesgloseCortes } from './entities/caja-desglose-cortes.entity';
import { DescuadreCajaInventario } from './entities/descuadre-caja-inventario.entity';
import { DescuadreInventarioCaja } from './entities/descuadre-inventario-caja.entity';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';
import { CrearPrestamoDto, PagarPrestamoDto } from './dto/crear-prestamo.dto';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';
import { AppGateway } from 'src/gateway/app.gateway';

import { Producto } from '../inventario/entities/producto.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Venta } from '../ventas/entities/venta.entity';

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
    @InjectRepository(CajaDesgloseCortes)
    private readonly cajaDesgloseCortesRepository: Repository<CajaDesgloseCortes>,
    @InjectRepository(DescuadreCajaInventario)
    private readonly descuadreCajaInventarioRepository: Repository<DescuadreCajaInventario>,
    @InjectRepository(DescuadreInventarioCaja)
    private readonly descuadreInventarioCajaRepository: Repository<DescuadreInventarioCaja>,
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    private readonly dataSource: DataSource,
    private readonly appGateway: AppGateway,
  ) {}

  async create(createCajaDto: CreateCajaDto): Promise<Caja> {
    const caja = this.cajaRepository.create(createCajaDto);
    const saved = await this.cajaRepository.save(caja);
    this.appGateway.notifyDataChange('caja', 'creada');
    return saved;
  }

  async getSaldoActual(idSesion: number): Promise<number> {
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
    return sesion.caja.saldo;
  }

  async getSaldoCajaSesion(idSesion: number): Promise<any> {
    return this.getSesionBalance(idSesion);
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

    // 1. Obtener la última sesión de caja cerrada para determinar monto_inicial_esperado y operador_saliente_id
    let ultimaSesionCerrada = await this.sesionCajaRepository.findOne({
      where: { id_caja, estado_sesion: 'CERRADA', estado: true },
      order: { fecha_cierre: 'DESC', id: 'DESC' },
    });

    if (!ultimaSesionCerrada) {
      ultimaSesionCerrada = await this.sesionCajaRepository.findOne({
        where: { estado_sesion: 'CERRADA', estado: true },
        order: { fecha_cierre: 'DESC', id: 'DESC' },
      });
    }

    const montoInicialEsperado = ultimaSesionCerrada
      ? Number(ultimaSesionCerrada.monto_final_real ?? ultimaSesionCerrada.monto_esperado ?? 0)
      : Number(caja.saldo ?? 0);

    // Calcular desglose de cortes si está presente
    let montoCalculadoDesglose: number | undefined = undefined;
    if (abrirCajaDto.desglose_cortes) {
      const {
        billete_200 = 0,
        billete_100 = 0,
        billete_50 = 0,
        billete_20 = 0,
        billete_10 = 0,
        moneda_5 = 0,
        moneda_2 = 0,
        moneda_1 = 0,
        moneda_050 = 0,
        moneda_020 = 0,
        moneda_010 = 0,
        monedas_total = 0,
      } = abrirCajaDto.desglose_cortes;

      const totalBilletes =
        Number(billete_200) * 200 +
        Number(billete_100) * 100 +
        Number(billete_50) * 50 +
        Number(billete_20) * 20 +
        Number(billete_10) * 10;

      const sumaMonedasCortes = Number(
        (
          Number(moneda_5) * 5 +
          Number(moneda_2) * 2 +
          Number(moneda_1) * 1 +
          Number(moneda_050) * 0.5 +
          Number(moneda_020) * 0.2 +
          Number(moneda_010) * 0.1
        ).toFixed(2),
      );

      const totalMonedas =
        sumaMonedasCortes > 0 ||
        Number(moneda_5) +
          Number(moneda_2) +
          Number(moneda_1) +
          Number(moneda_050) +
          Number(moneda_020) +
          Number(moneda_010) >
          0
          ? sumaMonedasCortes
          : Number(monedas_total || 0);

      montoCalculadoDesglose = Number((totalBilletes + totalMonedas).toFixed(2));
    }

    const montoInicialDeclarado = Number(
      abrirCajaDto.monto_inicial_declarado ??
        montoCalculadoDesglose ??
        monto_inicial ??
        montoInicialEsperado,
    );

    const diferenciaApertura = montoInicialDeclarado - montoInicialEsperado;
    const operadorSalienteId =
      abrirCajaDto.operador_saliente_id ||
      abrirCajaDto.operador_responsable_id ||
      ultimaSesionCerrada?.id_usuario;

    // Al abrir, fijamos el efectivo inicial
    monto_inicial = montoInicialDeclarado;
    caja.saldo = Number(montoInicialDeclarado);
    await this.cajaRepository.save(caja);

    const observacionesFinal =
      abrirCajaDto.observaciones_apertura ||
      abrirCajaDto.observaciones ||
      '';

    const hayDiferenciaApertura = diferenciaApertura < -0.009 || Math.abs(diferenciaApertura) > 0.009;

    const sesion = this.sesionCajaRepository.create({
      id_caja,
      monto_inicial,
      monto_inicial_esperado: montoInicialEsperado,
      monto_inicial_declarado: montoInicialDeclarado,
      diferencia_apertura: diferenciaApertura,
      observaciones_apertura: observacionesFinal,
      operador_responsable_descuadre_id:
        hayDiferenciaApertura ? operadorSalienteId : undefined,
      operador_responsable_descuadre_apertura_id:
        hayDiferenciaApertura ? operadorSalienteId : undefined,
      id_usuario,
      estado_sesion: 'ABIERTA',
      id_user_create,
      desglose_arqueo: abrirCajaDto.desglose_arqueo || null,
    });

    const nuevaSesion = await this.sesionCajaRepository.save(sesion);

    // Guardar desglose de cortes de billetes/monedas
    if (abrirCajaDto.desglose_cortes) {
      const dc = abrirCajaDto.desglose_cortes;
      const b200 = Number(dc.billete_200 || 0);
      const b100 = Number(dc.billete_100 || 0);
      const b50 = Number(dc.billete_50 || 0);
      const b20 = Number(dc.billete_20 || 0);
      const b10 = Number(dc.billete_10 || 0);
      const m5 = Number(dc.moneda_5 || 0);
      const m2 = Number(dc.moneda_2 || 0);
      const m1 = Number(dc.moneda_1 || 0);
      const m050 = Number(dc.moneda_050 || 0);
      const m020 = Number(dc.moneda_020 || 0);
      const m010 = Number(dc.moneda_010 || 0);

      const totalBilletes = b200 * 200 + b100 * 100 + b50 * 50 + b20 * 20 + b10 * 10;
      const sumaMonedasCortes = Number(
        (m5 * 5 + m2 * 2 + m1 * 1 + m050 * 0.5 + m020 * 0.2 + m010 * 0.1).toFixed(2),
      );
      const mon =
        sumaMonedasCortes > 0 || m5 + m2 + m1 + m050 + m020 + m010 > 0
          ? sumaMonedasCortes
          : Number(dc.monedas_total || 0);
      const totalDesglose = dc.monto_total_desglose ?? Number((totalBilletes + mon).toFixed(2));

      await this.cajaDesgloseCortesRepository.save(
        this.cajaDesgloseCortesRepository.create({
          id_sesion_caja: nuevaSesion.id,
          momento: 'APERTURA',
          billete_200: b200,
          billete_100: b100,
          billete_50: b50,
          billete_20: b20,
          billete_10: b10,
          moneda_5: m5,
          moneda_2: m2,
          moneda_1: m1,
          moneda_050: m050,
          moneda_020: m020,
          moneda_010: m010,
          monedas_total: mon,
          monto_total_desglose: totalDesglose,
          id_user_create,
        }),
      );
    }

    // Auditoría de productos reportados con faltante o diferencia
    const productosAuditados =
      abrirCajaDto.descuadres_productos ||
      abrirCajaDto.lista_descuadres_productos ||
      [];

    for (const item of productosAuditados) {
      const producto = await this.productoRepository.findOne({
        where: { id: item.producto_id, estado: true },
      });
      if (!producto) {
        throw new NotFoundException(`Producto con ID ${item.producto_id} no encontrado o inactivo`);
      }

      const cantidadEsperada = Number(producto.stock_actual ?? 0);
      const cantidadDeclarada = Number(item.cantidad_declarada);
      const dif = cantidadDeclarada - cantidadEsperada;

      if (dif < -0.009 || Math.abs(dif) > 0.009) {
        await this.descuadreCajaInventarioRepository.save(
          this.descuadreCajaInventarioRepository.create({
            id_sesion_caja: nuevaSesion.id,
            producto_id: producto.id,
            cantidad_esperada: cantidadEsperada,
            cantidad_declarada: cantidadDeclarada,
            diferencia: dif,
            tipo: 'PRODUCTO',
            operador_culpable_id: operadorSalienteId,
            observacion: item.observacion || observacionesFinal,
            estado_resolucion: 'PENDIENTE',
            id_user_create,
          }),
        );

        await this.descuadreInventarioCajaRepository.save(
          this.descuadreInventarioCajaRepository.create({
            id_sesion_caja: nuevaSesion.id,
            origen_descuadre: 'APERTURA',
            tipo_descuadre: 'PRODUCTO',
            id_producto: producto.id,
            cantidad_esperada: cantidadEsperada,
            cantidad_declarada: cantidadDeclarada,
            diferencia_cantidad: dif,
            operador_culpable_id: operadorSalienteId,
            estado_resolucion: 'PENDIENTE',
            motivo: item.observacion || observacionesFinal,
            id_user_create,
          }),
        );

        // Actualizar el stock actual del producto con la cantidad real física declarada en la apertura
        producto.stock_actual = cantidadDeclarada;
        await this.productoRepository.save(producto);
        this.appGateway.notifyDataChange('producto', 'actualizado');
      }
    }

    // Registrar descuadre de dinero si aplica
    if (hayDiferenciaApertura && operadorSalienteId) {
      await this.descuadreCajaInventarioRepository.save(
        this.descuadreCajaInventarioRepository.create({
          id_sesion_caja: nuevaSesion.id,
          cantidad_esperada: montoInicialEsperado,
          cantidad_declarada: montoInicialDeclarado,
          diferencia: diferenciaApertura,
          tipo: 'EFECTIVO',
          operador_culpable_id: operadorSalienteId,
          observacion: observacionesFinal,
          estado_resolucion: 'PENDIENTE',
          id_user_create,
        }),
      );

      await this.descuadreInventarioCajaRepository.save(
        this.descuadreInventarioCajaRepository.create({
          id_sesion_caja: nuevaSesion.id,
          origen_descuadre: 'APERTURA',
          tipo_descuadre: 'DINERO',
          monto_esperado: montoInicialEsperado,
          monto_declarado: montoInicialDeclarado,
          monto_diferencia: diferenciaApertura,
          operador_culpable_id: operadorSalienteId,
          estado_resolucion: 'PENDIENTE',
          motivo: observacionesFinal,
          id_user_create,
        }),
      );
    }

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
          stock_actual: p.stock_actual ?? 0,
          stockSistema: p.stock_actual ?? 0,
          categoria: catNombre,
          id_categoria: p.categoria ? p.categoria.id : null,
          tipo: isPlatform ? 'PLATAFORMA' : 'FISICO',
        };
      });
    } catch (error) {
      console.error('Error en getEstadoInventario:', error);
      return [];
    }
  }

  async findAllSesiones(): Promise<SesionCaja[]> {
    return this.sesionCajaRepository.find({
      relations: ['caja', 'usuario'],
      order: { fecha_apertura: 'DESC' },
    });
  }

  async findSesion(id: number): Promise<SesionCaja> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id, estado: true },
      relations: ['caja', 'usuario'],
    });
    if (!sesion)
      throw new NotFoundException(
        `Sesión de caja con ID ${id} no encontrada o inactiva`,
      );
    return sesion;
  }

  async cerrarCaja(
    id: number,
    cerrarCajaDto: CerrarCajaDto,
  ): Promise<SesionCaja> {
    const { id_user_update } = cerrarCajaDto;
    const observacion =
      cerrarCajaDto.observacion ||
      cerrarCajaDto.observaciones ||
      cerrarCajaDto.observacion_cierre ||
      cerrarCajaDto.observaciones_cierre ||
      '';

    let montoCalculadoDesglose: number | undefined = undefined;
    if (cerrarCajaDto.desglose_cortes) {
      const {
        billete_200 = 0,
        billete_100 = 0,
        billete_50 = 0,
        billete_20 = 0,
        billete_10 = 0,
        moneda_5 = 0,
        moneda_2 = 0,
        moneda_1 = 0,
        moneda_050 = 0,
        moneda_020 = 0,
        moneda_010 = 0,
        monedas_total = 0,
      } = cerrarCajaDto.desglose_cortes;

      const totalBilletes =
        Number(billete_200) * 200 +
        Number(billete_100) * 100 +
        Number(billete_50) * 50 +
        Number(billete_20) * 20 +
        Number(billete_10) * 10;

      const sumaMonedasCortes = Number(
        (
          Number(moneda_5) * 5 +
          Number(moneda_2) * 2 +
          Number(moneda_1) * 1 +
          Number(moneda_050) * 0.5 +
          Number(moneda_020) * 0.2 +
          Number(moneda_010) * 0.1
        ).toFixed(2),
      );

      const totalMonedas =
        sumaMonedasCortes > 0 ||
        Number(moneda_5) +
          Number(moneda_2) +
          Number(moneda_1) +
          Number(moneda_050) +
          Number(moneda_020) +
          Number(moneda_010) >
          0
          ? sumaMonedasCortes
          : Number(monedas_total || 0);

      montoCalculadoDesglose = Number((totalBilletes + totalMonedas).toFixed(2));
    }

    const monto_real_fisico = Number(
      cerrarCajaDto.monto_real_fisico ??
        cerrarCajaDto.monto_final_declarado ??
        montoCalculadoDesglose,
    );

    if (isNaN(monto_real_fisico)) {
      throw new BadRequestException('Debe enviar monto_real_fisico, monto_final_declarado o desglose_cortes.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sesion = await queryRunner.manager.findOne(SesionCaja, {
        where: { id, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sesion) {
        throw new NotFoundException(
          `Sesión de caja con ID ${id} no encontrada o inactiva`,
        );
      }

      if (sesion.estado_sesion === 'CERRADA') {
        throw new BadRequestException('La sesión de caja ya ha sido cerrada.');
      }

      // Obtener todos los movimientos financieros vinculados a esta sesión
      const totales = await queryRunner.manager
        .createQueryBuilder(MovimientoCaja, 'mov')
        .select('mov.tipo', 'tipo')
        .addSelect('SUM(mov.monto)', 'total')
        .where('mov.id_sesion_caja = :id', { id })
        .andWhere('mov.estado = true')
        .groupBy('mov.tipo')
        .getRawMany();

      let totalIngresos = 0;
      let totalEgresos = 0;

      for (const row of totales) {
        if (row.tipo === 'INGRESO') totalIngresos = Number(row.total);
        else if (row.tipo === 'EGRESO') totalEgresos = Number(row.total);
      }

      // Sumar ventas realizadas durante esta sesión (excluyendo ventas anuladas y créditos pendientes)
      const ventasTotales = await queryRunner.manager
        .createQueryBuilder(Venta, 'v')
        .select('SUM(v.total)', 'total')
        .where('v.id_sesion_caja = :id', { id })
        .andWhere('v.estado = true')
        .andWhere('v.estado_venta != :estadoAnulada', { estadoAnulada: 'ANULADA' })
        .andWhere('v.metodo_pago != :cuentaPorCobrar', { cuentaPorCobrar: 'CUENTA_POR_COBRAR' })
        .getRawOne();

      const totalVentas = Number(ventasTotales?.total || 0);

      // Monto esperado calculado por el sistema (monto_inicial_declarado + totalVentas + ingresos - egresos)
      const baseInicial = Number(sesion.monto_inicial_declarado ?? sesion.monto_inicial ?? 0);
      const monto_esperado = baseInicial + totalVentas + totalIngresos - totalEgresos;

      // Diferencia de arqueo: conteo físico vs esperado por sistema
      const monto_diferencia = monto_real_fisico - monto_esperado;

      let estado_arqueo: string;
      if (monto_diferencia > 0.009) {
        estado_arqueo = 'SOBRANTE';
      } else if (monto_diferencia < -0.009) {
        estado_arqueo = 'FALTANTE';
      } else {
        estado_arqueo = 'CUADRADO';
      }

      sesion.monto_final_teorico = monto_esperado;
      sesion.monto_esperado = monto_esperado;
      sesion.monto_final_real = monto_real_fisico;
      sesion.monto_real_fisico = monto_real_fisico;
      sesion.diferencia = monto_diferencia;
      sesion.monto_diferencia = monto_diferencia;
      sesion.estado_arqueo = estado_arqueo;
      sesion.desglose_arqueo = {
        monto_inicial: baseInicial,
        total_ventas: totalVentas,
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

      // Guardar desglose de cortes de billetes/monedas en cierre
      if (cerrarCajaDto.desglose_cortes) {
        const dc = cerrarCajaDto.desglose_cortes;
        const b200 = Number(dc.billete_200 || 0);
        const b100 = Number(dc.billete_100 || 0);
        const b50 = Number(dc.billete_50 || 0);
        const b20 = Number(dc.billete_20 || 0);
        const b10 = Number(dc.billete_10 || 0);
        const m5 = Number(dc.moneda_5 || 0);
        const m2 = Number(dc.moneda_2 || 0);
        const m1 = Number(dc.moneda_1 || 0);
        const m050 = Number(dc.moneda_050 || 0);
        const m020 = Number(dc.moneda_020 || 0);
        const m010 = Number(dc.moneda_010 || 0);

        const totalBilletes = b200 * 200 + b100 * 100 + b50 * 50 + b20 * 20 + b10 * 10;
        const sumaMonedasCortes = Number(
          (m5 * 5 + m2 * 2 + m1 * 1 + m050 * 0.5 + m020 * 0.2 + m010 * 0.1).toFixed(2),
        );
        const mon =
          sumaMonedasCortes > 0 || m5 + m2 + m1 + m050 + m020 + m010 > 0
            ? sumaMonedasCortes
            : Number(dc.monedas_total || 0);
        const totalDesglose = dc.monto_total_desglose ?? Number((totalBilletes + mon).toFixed(2));

        await queryRunner.manager.save(
          queryRunner.manager.create(CajaDesgloseCortes, {
            id_sesion_caja: sesion.id,
            momento: 'CIERRE',
            billete_200: b200,
            billete_100: b100,
            billete_50: b50,
            billete_20: b20,
            billete_10: b10,
            moneda_5: m5,
            moneda_2: m2,
            moneda_1: m1,
            moneda_050: m050,
            moneda_020: m020,
            moneda_010: m010,
            monedas_total: mon,
            monto_total_desglose: totalDesglose,
            id_user_create: id_user_update,
          }),
        );
      }

      // Imputar descuadre de dinero en cierre al operador actual
      let operadorActualId: number | null = sesion.id_usuario || id_user_update || null;
      if (operadorActualId) {
        const opExists = await queryRunner.manager.findOne(Usuario, { where: { id: operadorActualId } });
        if (!opExists) {
          operadorActualId = null;
        }
      }

      if (Math.abs(monto_diferencia) > 0.009) {
        await queryRunner.manager.save(
          queryRunner.manager.create(DescuadreCajaInventario, {
            id_sesion_caja: sesion.id,
            cantidad_esperada: monto_esperado,
            cantidad_declarada: monto_real_fisico,
            diferencia: monto_diferencia,
            tipo: 'EFECTIVO',
            operador_culpable_id: operadorActualId ?? undefined,
            observacion,
            estado_resolucion: 'PENDIENTE',
            id_user_create: id_user_update,
          }),
        );

        await queryRunner.manager.save(
          queryRunner.manager.create(DescuadreInventarioCaja, {
            id_sesion_caja: sesion.id,
            origen_descuadre: 'CIERRE',
            tipo_descuadre: 'DINERO',
            monto_esperado,
            monto_declarado: monto_real_fisico,
            monto_diferencia,
            operador_culpable_id: operadorActualId ?? undefined,
            estado_resolucion: 'PENDIENTE',
            motivo: observacion,
            id_user_create: id_user_update,
          }),
        );
      }

      // Auditoría de productos al cierre
      if (cerrarCajaDto.descuadres_productos?.length) {
        for (const item of cerrarCajaDto.descuadres_productos) {
          if (!item.producto_id) continue;
          const producto = await queryRunner.manager.findOne(Producto, {
            where: { id: item.producto_id, estado: true },
          });
          if (producto) {
            const stockEsp = Number(producto.stock_actual ?? 0);
            const stockDec = Number(item.cantidad_declarada);
            const difStock = stockDec - stockEsp;

            if (Math.abs(difStock) > 0.009) {
              await queryRunner.manager.save(
                queryRunner.manager.create(DescuadreCajaInventario, {
                  id_sesion_caja: sesion.id,
                  producto_id: producto.id,
                  cantidad_esperada: stockEsp,
                  cantidad_declarada: stockDec,
                  diferencia: difStock,
                  tipo: 'PRODUCTO',
                  operador_culpable_id: operadorActualId ?? undefined,
                  observacion: item.observacion || observacion,
                  estado_resolucion: 'PENDIENTE',
                  id_user_create: id_user_update,
                }),
              );

              await queryRunner.manager.save(
                queryRunner.manager.create(DescuadreInventarioCaja, {
                  id_sesion_caja: sesion.id,
                  origen_descuadre: 'CIERRE',
                  tipo_descuadre: 'PRODUCTO',
                  id_producto: producto.id,
                  cantidad_esperada: stockEsp,
                  cantidad_declarada: stockDec,
                  diferencia_cantidad: difStock,
                  operador_culpable_id: operadorActualId ?? undefined,
                  estado_resolucion: 'PENDIENTE',
                  motivo: item.observacion || observacion,
                  id_user_create: id_user_update,
                }),
              );
            }
          }
        }
      }

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

  async getHistorialDescuadres(operadorId?: number, estado?: string) {
    const query = this.descuadreCajaInventarioRepository
      .createQueryBuilder('descuadre')
      .leftJoinAndSelect('descuadre.sesion_caja', 'sesion_caja')
      .leftJoinAndSelect('sesion_caja.caja', 'caja')
      .leftJoinAndSelect('descuadre.producto', 'producto')
      .leftJoinAndSelect('descuadre.operador_culpable', 'operador_culpable')
      .leftJoinAndSelect('operador_culpable.persona', 'persona')
      .leftJoinAndSelect('operador_culpable.role', 'role')
      .orderBy('descuadre.id', 'DESC');

    if (operadorId) {
      query.andWhere('descuadre.operador_culpable_id = :operadorId', { operadorId });
    }
    if (estado) {
      query.andWhere('descuadre.estado_resolucion = :estado', { estado });
    }

    const descuadres = await query.getMany();

    // Enriquecer con cálculo de valor monetario si es producto y origen
    return descuadres.map((d) => {
      const precioUnitario = d.producto ? Number(d.producto.precio_venta ?? d.producto.costo_compra ?? 0) : 0;
      const costoUnitario = d.producto ? Number(d.producto.costo_compra ?? 0) : 0;
      const cantidadDiferencia = Number(d.diferencia ?? 0);
      
      // Deuda monetaria estimada (en Bs.)
      let montoDeuda = 0;
      if (d.tipo === 'EFECTIVO') {
        montoDeuda = Math.abs(Number(d.diferencia ?? 0));
      } else if (d.tipo === 'PRODUCTO') {
        montoDeuda = Math.abs(cantidadDiferencia) * (costoUnitario > 0 ? costoUnitario : precioUnitario);
      }

      const observacionFinal =
        d.observacion && d.observacion.trim() !== ''
          ? d.observacion
          : d.sesion_caja?.observacion || d.sesion_caja?.observaciones_apertura || '';

      return {
        ...d,
        observacion: observacionFinal,
        monto_deuda_estimado: Number(montoDeuda.toFixed(2)),
        precio_unitario_producto: precioUnitario,
        costo_unitario_producto: costoUnitario,
      };
    });
  }

  async resolverDescuadre(
    id: number,
    body: { estado_resolucion: string; observacion_resolucion?: string; id_user_update: number },
  ) {
    const { estado_resolucion, observacion_resolucion, id_user_update } = body;
    const descuadre = await this.descuadreCajaInventarioRepository.findOne({
      where: { id },
      relations: ['operador_culpable', 'producto', 'sesion_caja'],
    });

    if (!descuadre) {
      throw new NotFoundException(`Descuadre con ID ${id} no encontrado`);
    }

    descuadre.estado_resolucion = estado_resolucion;
    if (observacion_resolucion) {
      descuadre.observacion = descuadre.observacion
        ? `${descuadre.observacion} | [Resolución Admin]: ${observacion_resolucion}`
        : `[Resolución Admin]: ${observacion_resolucion}`;
    }
    descuadre.id_user_update = id_user_update;

    const guardado = await this.descuadreCajaInventarioRepository.save(descuadre);

    // Sincronizar también en descuadreInventarioCaja si existe
    const descuadreInv = await this.descuadreInventarioCajaRepository.findOne({
      where: { id_sesion_caja: descuadre.id_sesion_caja, id_producto: descuadre.producto_id },
    });
    if (descuadreInv) {
      descuadreInv.estado_resolucion = estado_resolucion;
      descuadreInv.id_user_update = id_user_update;
      await this.descuadreInventarioCajaRepository.save(descuadreInv);
    }

    this.appGateway.notifyDataChange('descuadre', 'DESCUADRE_ACTUALIZADO');

    return guardado;
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

    // Actualizar el saldo acumulado en la tabla 'Cajas' en caliente
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

    await this.cajaRepository.save(caja);

    const movimiento = this.movimientoCajaRepository.create({
      id_sesion_caja,
      monto,
      tipo,
      motivo,
      id_user_create,
    });

    const nuevoMovimiento =
      await this.movimientoCajaRepository.save(movimiento);

    this.appGateway.notifyDataChange('caja', 'saldo_actualizado');

    return nuevoMovimiento;
  }

  async getSesionActivaUsuario(id_usuario: number): Promise<SesionCaja | null> {
    const sesion = await this.sesionCajaRepository.findOne({
      where: { id_usuario, estado_sesion: 'ABIERTA', estado: true },
    });
    return sesion || null;
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

    const ventas = await this.ventaRepository.find({
      where: { id_sesion_caja: idSesion, estado: true },
    });

    let totalVentas = 0;
    for (const v of ventas) {
      if (v.estado_venta !== 'ANULADA' && v.metodo_pago !== 'CUENTA_POR_COBRAR') {
        totalVentas += Number(v.total);
      }
    }

    const baseInicial = Number(sesion.monto_inicial_declarado ?? sesion.monto_inicial ?? 0);
    const monto_final_teorico =
      baseInicial + totalVentas + totalIngresos - totalEgresos;

    return {
      monto_inicial: baseInicial,
      total_ventas: totalVentas,
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

      const sesion = await queryRunner.manager.findOne(SesionCaja, {
        where: { id: id_sesion_caja, estado: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sesion || sesion.estado_sesion !== 'ABIERTA') {
        throw new BadRequestException(`No hay una sesión de caja abierta para registrar el préstamo`);
      }

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

      caja.saldo = saldoActual - montoPrestamo;
      await queryRunner.manager.save(caja);

      const movimiento = queryRunner.manager.create(MovimientoCaja, {
        id_sesion_caja,
        monto: montoPrestamo,
        tipo: 'EGRESO',
        motivo: `[Préstamo / Salida de Caja] ${motivo}`,
        id_user_create,
      });
      await queryRunner.manager.save(movimiento);

      const prestamo = queryRunner.manager.create(PrestamoCaja, {
        id_sesion_caja,
        monto: montoPrestamo,
        motivo,
        estado_prestamo: 'PENDIENTE',
        id_user_create,
      });

      const nuevoPrestamo = await queryRunner.manager.save(prestamo);

      await queryRunner.commitTransaction();

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
    body: PagarPrestamoDto,
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

    if (sesion.caja) {
      const caja = sesion.caja;
      caja.saldo = Number(caja.saldo ?? 0) + montoDevolucion;
      await this.cajaRepository.save(caja);
    }

    const movimiento = this.movimientoCajaRepository.create({
      id_sesion_caja,
      monto: montoDevolucion,
      tipo: 'INGRESO',
      motivo: `[Devolución de Préstamo #${prestamo.id}] ${prestamo.motivo}`,
      id_user_create: id_user_update,
    });
    await this.movimientoCajaRepository.save(movimiento);

    prestamo.estado_prestamo = 'PAGADO';
    prestamo.fecha_devolucion = new Date();
    prestamo.id_user_update = id_user_update;

    const prestamoPagado = await this.prestamoCajaRepository.save(prestamo);

    this.appGateway.notifyDataChange('caja', 'saldo_actualizado');
    this.appGateway.notifyDataChange('caja', 'prestamo_pagado');

    return prestamoPagado;
  }
}
