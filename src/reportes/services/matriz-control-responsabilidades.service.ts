import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DescuadreCajaInventario } from 'src/cajas/entities/descuadre-caja-inventario.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { PrestamoCaja } from 'src/cajas/entities/prestamo-caja.entity';
import { OperadorDeuda } from 'src/agentes/entities/operador-deuda.entity';
import { PrestamoExterno } from 'src/prestamos-externos/entities/prestamo-externo.entity';
import { CuentaPorCobrar } from 'src/ventas/entities/cuenta-por-cobrar.entity';

export type FuenteResponsabilidad =
  | 'descuadre'
  | 'prestamo_caja'
  | 'prestamo_externo'
  | 'cuenta_por_cobrar';

export interface ResponsabilidadMovimiento {
  fuente: FuenteResponsabilidad;
  grupo: string;
  label: string;
  responsable: string;
  concepto: string;
  detalle: string;
  fecha: Date;
  id_sesion: number | null;
  monto: number;
  signo: 1 | -1;
  impacto: 'caja' | 'ajuste';
}

export interface DeudaAgenteRow {
  key: string;
  label: string;
  total: number;
  detalle: string;
}

export interface ResponsabilidadesResult {
  movimientos: ResponsabilidadMovimiento[];
  deudasAgentes: DeudaAgenteRow[];
  advertencias: string[];
}

const round2 = (value: number): number =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalize = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const nombrePersona = (persona?: any): string => {
  if (!persona) return '';
  const nombres = String(persona.nombres || '').trim();
  const apellidos = String(
    persona.apellidos || persona.p_apellido || '',
  ).trim();
  return `${nombres} ${apellidos}`.trim();
};

const nombreUsuario = (usuario?: any, fallbackId?: number): string => {
  const persona = nombrePersona(usuario?.persona);
  if (persona) return persona;
  return String(usuario?.name || usuario?.email || `Usuario #${fallbackId ?? '?'}`);
};

const labelConcepto = (responsable: string, concepto: string): string =>
  `${concepto} ${responsable}`.trim();

@Injectable()
export class MatrizControlResponsabilidadesService {
  constructor(
    @InjectRepository(DescuadreCajaInventario)
    private readonly descuadreRepository: Repository<DescuadreCajaInventario>,
    @InjectRepository(PrestamoCaja)
    private readonly prestamoCajaRepository: Repository<PrestamoCaja>,
    @InjectRepository(PrestamoExterno)
    private readonly prestamoExternoRepository: Repository<PrestamoExterno>,
    @InjectRepository(CuentaPorCobrar)
    private readonly cuentaPorCobrarRepository: Repository<CuentaPorCobrar>,
    @InjectRepository(OperadorDeuda)
    private readonly operadorDeudaRepository: Repository<OperadorDeuda>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepository: Repository<MovimientoCaja>,
  ) {}

  async obtener(
    inicio: Date,
    fin: Date,
  ): Promise<ResponsabilidadesResult> {
    const advertencias = new Set<string>();
    const advertir = (mensaje: string): void => {
      if (advertencias.size < 12) advertencias.add(mensaje);
    };

    const sesionesPorMotivo = await this.cargarSesionesDePago(inicio, fin);
    const movimientos: ResponsabilidadMovimiento[] = [];

    await this.agregarDescuadres(
      inicio,
      fin,
      movimientos,
      sesionesPorMotivo,
      advertir,
    );
    await this.agregarPrestamosCaja(
      inicio,
      fin,
      movimientos,
      sesionesPorMotivo,
      advertir,
    );
    await this.agregarPrestamosExternos(
      inicio,
      fin,
      movimientos,
      sesionesPorMotivo,
      advertir,
    );
    await this.agregarCuentasPorCobrar(
      inicio,
      fin,
      movimientos,
      sesionesPorMotivo,
      advertir,
    );

    const deudasAgentes = await this.obtenerDeudasAgentes();

    return {
      movimientos,
      deudasAgentes,
      advertencias: Array.from(advertencias),
    };
  }

  private async cargarSesionesDePago(
    inicio: Date,
    fin: Date,
  ): Promise<Map<string, number>> {
    const rows = await this.movimientoCajaRepository
      .createQueryBuilder('m')
      .select('m.id_sesion_caja', 'id_sesion')
      .addSelect('m.motivo', 'motivo')
      .where('m.estado = true')
      .andWhere('m.fecha BETWEEN :inicio AND :fin', { inicio, fin })
      .andWhere(
        `(m.motivo LIKE '[Devolución de Préstamo #%'
          OR m.motivo LIKE '[Devolución préstamo externo #%'
          OR m.motivo LIKE 'Cobro de Cuenta por Cobrar #%')`,
      )
      .getRawMany<{ id_sesion: string; motivo: string }>();

    const mapa = new Map<string, number>();
    for (const row of rows) {
      const match = String(row.motivo || '').match(/#(\d+)/);
      if (!match) continue;
      const id = match[1];
      const idSesion = Number(row.id_sesion);
      if (!Number.isFinite(idSesion)) continue;

      if (row.motivo.startsWith('[Devolución de Préstamo #')) {
        mapa.set(`prestamo_caja:${id}`, idSesion);
      } else if (row.motivo.startsWith('[Devolución préstamo externo #')) {
        mapa.set(`prestamo_externo:${id}`, idSesion);
      } else if (row.motivo.startsWith('Cobro de Cuenta por Cobrar #')) {
        mapa.set(`cuenta_por_cobrar:${id}`, idSesion);
      }
    }
    return mapa;
  }

  private async agregarDescuadres(
    inicio: Date,
    fin: Date,
    movimientos: ResponsabilidadMovimiento[],
    _sesionesPorMotivo: Map<string, number>,
    advertir: (mensaje: string) => void,
  ): Promise<void> {
    const cargos = await this.descuadreRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.operador_culpable', 'operador')
      .leftJoinAndSelect('operador.persona', 'persona')
      .leftJoinAndSelect('d.producto', 'producto')
      .where('d.estado = true')
      .andWhere("COALESCE(d.estado_resolucion, 'PENDIENTE') != 'JUSTIFICADO'")
      .andWhere('d.created_at BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const d of cargos) {
      const responsable =
        nombrePersona(d.operador_culpable?.persona) ||
        nombreUsuario(d.operador_culpable, d.operador_culpable_id) ||
        'SIN RESPONSABLE';
      const concepto =
        d.tipo === 'EFECTIVO'
          ? 'FALTANTE'
          : 'FALTANTE PRODUCTO';
      const tipoLabel = d.tipo === 'EFECTIVO' ? 'EFECTIVO' : 'PRODUCTO';
      const monto = this.montoDescuadre(d);
      if (monto <= 0) continue;

      const impacto = d.tipo === 'EFECTIVO' ? 'caja' : 'ajuste';
      const detalle = [
        `Descuadre #${d.id}`,
        d.producto?.nombre,
        d.observacion,
      ]
        .filter(Boolean)
        .join(' · ');

      movimientos.push({
        fuente: 'descuadre',
        grupo: `activo.descuadre.${normalize(responsable)}.${d.tipo}`,
        label: `FALTANTE ${responsable} - ${tipoLabel}`.trim(),
        responsable,
        concepto,
        detalle,
        fecha: d.created_at,
        id_sesion: impacto === 'caja' ? d.id_sesion_caja : null,
        monto,
        signo: 1,
        impacto,
      });
    }

    const recuperaciones = await this.descuadreRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.operador_culpable', 'operador')
      .leftJoinAndSelect('operador.persona', 'persona')
      .leftJoinAndSelect('d.producto', 'producto')
      .where('d.estado = true')
      .andWhere(
        "d.estado_resolucion IN ('RESUELTO', 'JUSTIFICADO')",
      )
      .andWhere(
        'COALESCE(d.fecha_resolucion, d.updated_at) BETWEEN :inicio AND :fin',
        { inicio, fin },
      )
      .getMany();

    for (const d of recuperaciones) {
      if (d.estado_resolucion === 'JUSTIFICADO') continue;
      const responsable =
        nombrePersona(d.operador_culpable?.persona) ||
        nombreUsuario(d.operador_culpable, d.operador_culpable_id) ||
        'SIN RESPONSABLE';
      const concepto =
        d.tipo === 'EFECTIVO'
          ? 'FALTANTE'
          : 'FALTANTE PRODUCTO';
      const tipoLabel = d.tipo === 'EFECTIVO' ? 'EFECTIVO' : 'PRODUCTO';
      const monto =
        d.monto_recuperado === null || d.monto_recuperado === undefined
          ? this.montoDescuadre(d)
          : Number(d.monto_recuperado);
      if (monto <= 0) {
        advertir(
          `Descuadre #${d.id} resuelto sin monto recuperado; no se pudo registrar la recuperación.`,
        );
        continue;
      }

      movimientos.push({
        fuente: 'descuadre',
        grupo: `activo.descuadre.${normalize(responsable)}.${d.tipo}`,
        label: `FALTANTE ${responsable} - ${tipoLabel}`.trim(),
        responsable,
        concepto,
        detalle: `Recuperación descuadre #${d.id}`,
        fecha: d.fecha_resolucion || d.updated_at,
        id_sesion: null,
        monto,
        signo: -1,
        impacto: 'ajuste',
      });
    }
  }

  private async agregarPrestamosCaja(
    inicio: Date,
    fin: Date,
    movimientos: ResponsabilidadMovimiento[],
    sesionesPorMotivo: Map<string, number>,
    advertir: (mensaje: string) => void,
  ): Promise<void> {
    const cargos = await this.prestamoCajaRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.sesion_caja', 'sesion')
      .leftJoinAndSelect('sesion.usuario', 'usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .where('p.estado = true')
      .andWhere('p.fecha_prestamo BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const p of cargos) {
      const responsable = nombreUsuario(
        p.sesion_caja?.usuario,
        p.sesion_caja?.id_usuario,
      );
      movimientos.push({
        fuente: 'prestamo_caja',
        grupo: `activo.prestamo_caja.${normalize(responsable)}`,
        label: labelConcepto(responsable, 'PRÉSTAMO'),
        responsable,
        concepto: 'PRÉSTAMO',
        detalle: `Préstamo caja #${p.id}: ${p.motivo}`,
        fecha: p.fecha_prestamo,
        id_sesion: p.id_sesion_caja,
        monto: Number(p.monto),
        signo: 1,
        impacto: 'caja',
      });
    }

    const pagos = await this.prestamoCajaRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.sesion_caja', 'sesion')
      .leftJoinAndSelect('sesion.usuario', 'usuario')
      .leftJoinAndSelect('usuario.persona', 'persona')
      .where('p.estado = true')
      .andWhere('p.estado_prestamo = :estado', { estado: 'PAGADO' })
      .andWhere('p.fecha_devolucion BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const p of pagos) {
      const responsable = nombreUsuario(
        p.sesion_caja?.usuario,
        p.sesion_caja?.id_usuario,
      );
      const idSesion =
        p.id_sesion_devolucion ??
        sesionesPorMotivo.get(`prestamo_caja:${p.id}`) ??
        null;
      if (!idSesion) {
        advertir(
          `Préstamo de caja #${p.id} pagado sin sesión de devolución identificable; se envió a AJUSTES.`,
        );
      }
      movimientos.push({
        fuente: 'prestamo_caja',
        grupo: `activo.prestamo_caja.${normalize(responsable)}`,
        label: labelConcepto(responsable, 'PRÉSTAMO'),
        responsable,
        concepto: 'PRÉSTAMO',
        detalle: `Devolución préstamo caja #${p.id}: ${p.motivo}`,
        fecha: p.fecha_devolucion || p.updated_at,
        id_sesion: idSesion,
        monto: Number(p.monto),
        signo: -1,
        impacto: idSesion ? 'caja' : 'ajuste',
      });
    }
  }

  private async agregarPrestamosExternos(
    inicio: Date,
    fin: Date,
    movimientos: ResponsabilidadMovimiento[],
    sesionesPorMotivo: Map<string, number>,
    advertir: (mensaje: string) => void,
  ): Promise<void> {
    const cargos = await this.prestamoExternoRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.caja_sesion', 'sesion')
      .where('p.fecha_prestamo BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const p of cargos) {
      const responsable = String(p.solicitante_externo || 'SIN SOLICITANTE');
      movimientos.push({
        fuente: 'prestamo_externo',
        grupo: `activo.prestamo_externo.${normalize(responsable)}`,
        label: labelConcepto(responsable, 'PRÉSTAMO EXTERNO'),
        responsable,
        concepto: 'PRÉSTAMO EXTERNO',
        detalle: `Préstamo externo #${p.id}: ${p.motivo}`,
        fecha: p.fecha_prestamo,
        id_sesion: p.caja_sesion_id,
        monto: Number(p.monto),
        signo: 1,
        impacto: 'caja',
      });
    }

    const pagos = await this.prestamoExternoRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.caja_sesion', 'sesion')
      .where('p.estado = :estado', { estado: 'PAGADO' })
      .andWhere('p.fecha_devolucion BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const p of pagos) {
      const responsable = String(p.solicitante_externo || 'SIN SOLICITANTE');
      const idSesion =
        p.id_sesion_devolucion ??
        sesionesPorMotivo.get(`prestamo_externo:${p.id}`) ??
        null;
      if (!idSesion) {
        advertir(
          `Préstamo externo #${p.id} pagado sin sesión de devolución identificable; se envió a AJUSTES.`,
        );
      }
      movimientos.push({
        fuente: 'prestamo_externo',
        grupo: `activo.prestamo_externo.${normalize(responsable)}`,
        label: labelConcepto(responsable, 'PRÉSTAMO EXTERNO'),
        responsable,
        concepto: 'PRÉSTAMO EXTERNO',
        detalle: `Devolución préstamo externo #${p.id}: ${p.motivo}`,
        fecha: p.fecha_devolucion || p.updated_at,
        id_sesion: idSesion,
        monto: Number(p.monto),
        signo: -1,
        impacto: idSesion ? 'caja' : 'ajuste',
      });
    }
  }

  private async agregarCuentasPorCobrar(
    inicio: Date,
    fin: Date,
    movimientos: ResponsabilidadMovimiento[],
    sesionesPorMotivo: Map<string, number>,
    advertir: (mensaje: string) => void,
  ): Promise<void> {
    const cargos = await this.cuentaPorCobrarRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.venta', 'venta')
      .where('c.estado = true')
      .andWhere('c.fecha_registro BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const c of cargos) {
      const responsable = String(c.cliente_nombre || 'SIN CLIENTE');
      movimientos.push({
        fuente: 'cuenta_por_cobrar',
        grupo: `activo.cuenta_por_cobrar.${normalize(responsable)}`,
        label: labelConcepto(responsable, 'POR COBRAR'),
        responsable,
        concepto: 'POR COBRAR',
        detalle: `Cuenta por cobrar #${c.id} · Venta #${c.id_venta}`,
        fecha: c.fecha_registro,
        id_sesion: null,
        monto: Number(c.monto),
        signo: 1,
        impacto: 'ajuste',
      });
    }

    const pagos = await this.cuentaPorCobrarRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.venta', 'venta')
      .where('c.estado = true')
      .andWhere('c.estado_cuenta = :estado', { estado: 'PAGADO' })
      .andWhere('c.fecha_pago BETWEEN :inicio AND :fin', { inicio, fin })
      .getMany();

    for (const c of pagos) {
      const responsable = String(c.cliente_nombre || 'SIN CLIENTE');
      const esEfectivo =
        String(c.metodo_pago_cancelacion || '').toUpperCase() === 'EFECTIVO';
      const idSesion = esEfectivo
        ? c.id_sesion_pago ??
          sesionesPorMotivo.get(`cuenta_por_cobrar:${c.id}`) ??
          null
        : null;
      if (esEfectivo && !idSesion) {
        advertir(
          `Cuenta por cobrar #${c.id} cobrada en efectivo sin sesión identificable; se envió a AJUSTES.`,
        );
      }
      movimientos.push({
        fuente: 'cuenta_por_cobrar',
        grupo: `activo.cuenta_por_cobrar.${normalize(responsable)}`,
        label: labelConcepto(responsable, 'POR COBRAR'),
        responsable,
        concepto: 'POR COBRAR',
        detalle: `Cobro cuenta #${c.id} · ${c.metodo_pago_cancelacion || 'SIN MÉTODO'}`,
        fecha: c.fecha_pago || c.updated_at,
        id_sesion: idSesion,
        monto: Number(c.monto),
        signo: -1,
        impacto: idSesion ? 'caja' : 'ajuste',
      });
    }
  }

  private async obtenerDeudasAgentes(): Promise<DeudaAgenteRow[]> {
    const deudas = await this.operadorDeudaRepository.find({
      where: {
        estado: true,
        estado_deuda: 'PENDIENTE',
      },
      relations: ['agente'],
      order: { id: 'DESC' },
    });

    return deudas
      .filter((d) => Number(d.monto_pendiente) > 0.001)
      .map((d) => {
        const agente = d.agente?.nombre_banco || `Agente #${d.id_agente}`;
        return {
          key: `deuda_agente.${d.id}`,
          label: `DEUDA ${d.nombre_operador} - ${agente}`,
          total: round2(Number(d.monto_pendiente)),
          detalle: `Saldo pendiente actual · ${d.motivo || 'Sin motivo'}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private montoDescuadre(d: DescuadreCajaInventario): number {
    const diferencia = Number(d.diferencia ?? 0);
    if (d.tipo === 'EFECTIVO') return round2(Math.abs(diferencia));
    const costo = Number(d.producto?.costo_compra ?? 0);
    const precio = Number(d.producto?.precio_venta ?? 0);
    return round2(Math.abs(diferencia) * (costo > 0 ? costo : precio));
  }
}
