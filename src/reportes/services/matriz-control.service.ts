import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SesionCaja } from 'src/cajas/entities/sesion-caja.entity';
import { Venta } from 'src/ventas/entities/venta.entity';
import { RecargaCliente } from 'src/recargas/entities/recarga-cliente.entity';
import { InyeccionOperadora } from 'src/recargas/entities/inyeccion-operadora.entity';
import { Compra } from 'src/compras/entities/compra.entity';
import { MovimientoCaja } from 'src/cajas/entities/movimiento-caja.entity';
import { FiltroMatrizControlDto } from '../dto/filtro-matriz-control.dto';
import {
  FILA_CAJA,
  RUBROS_COMPRAS,
  RUBROS_GASTOS,
  RUBROS_INGRESOS,
  RUBROS_OTROS_INGRESOS,
  RUBROS_PAGO_PASIVOS,
  RubroControl,
} from './matriz-control-layout';
import {
  MatrizControlResponsabilidadesService,
  ResponsabilidadMovimiento,
} from './matriz-control-responsabilidades.service';

const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const round2 = (value: number): number =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalize = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const pad = (value: number): string => String(value).padStart(2, '0');

const toDateOnly = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toTime = (date?: Date | null): string | null => {
  if (!date) return null;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const slug = (value: string): string =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'otros';

export interface MatrizControlColumna {
  indice: number;
  id_sesion: number | null;
  fecha: string;
  dia: number;
  slot: number;
  etiqueta_operador: string;
  hora_apertura: string | null;
  hora_cierre: string | null;
  operador_id: number | null;
  operador: string | null;
  caja_id: number | null;
  caja: string | null;
  estado: string | null;
  caja_inicial: number | null;
  caja_inicial_real: number | null;
  saldo: number | null;
  vacia: boolean;
}

export type MatrizControlFilaTipo =
  | 'caja'
  | 'dato'
  | 'total'
  | 'libre'
  | 'saldo';

export interface MatrizControlFila {
  key: string;
  label: string;
  valores: number[];
  ajuste: number;
  total: number | null;
  tipo: MatrizControlFilaTipo;
  detalle?: string;
  fuente?: string;
  fecha?: string;
  estado?: string;
}

export type MatrizControlSeccionKey =
  | 'ingresos'
  | 'compras'
  | 'gastos'
  | 'pago_pasivos'
  | 'otros_ingresos'
  | 'activos'
  | 'deudas_agentes';

export interface MatrizControlSeccion {
  key: MatrizControlSeccionKey;
  label: string;
  filas: MatrizControlFila[];
  total: MatrizControlFila;
}

export interface MatrizControlResumen {
  caja_inicial: number;
  total_ingresos: number;
  total_ingresos_control: number;
  total_compras: number;
  total_gastos: number;
  total_pago_pasivos: number;
  total_otros_ingresos: number;
  total_activos: number;
  total_activos_efectivo: number;
  total_ajustes_no_caja: number;
  total_deudas_agentes: number;
  total_egresos: number;
  saldo_final: number;
  saldos_por_columna: Array<number | null>;
  incluye_sesiones_abiertas: boolean;
}

export interface MatrizControlData {
  filtros: { id_caja: number | null };
  periodo: {
    mes: number;
    anio: number;
    etiqueta: string;
    titulo: string;
    inicio: string;
    fin: string;
  };
  columnas: MatrizControlColumna[];
  caja: MatrizControlFila;
  secciones: MatrizControlSeccion[];
  deudas_agentes: MatrizControlSeccion | null;
  saldo: MatrizControlFila;
  resumen: MatrizControlResumen;
  advertencias: string[];
}

interface RawVentaRow {
  id_sesion: string;
  metodo_pago: string;
  categoria: string;
  producto: string;
  total: string;
}

interface RawRecargaRow {
  id_sesion: string;
  operadora: string;
  total: string;
}

interface RawCompraCategoriaRow {
  id_sesion: string;
  categoria: string;
  producto: string;
  total: string;
}

interface RawFondeoRow {
  id_sesion: string;
  operadora: string;
  total: string;
}

interface RawMovimientoRow {
  id_sesion: string;
  tipo: string;
  motivo: string;
  total: string;
}

interface RawComprasNoCajaRow {
  cantidad: string;
  total: string;
}

@Injectable()
export class MatrizControlService {
  constructor(
    @InjectRepository(SesionCaja)
    private readonly sesionCajaRepository: Repository<SesionCaja>,
    @InjectRepository(Venta)
    private readonly ventaRepository: Repository<Venta>,
    @InjectRepository(RecargaCliente)
    private readonly recargaClienteRepository: Repository<RecargaCliente>,
    @InjectRepository(InyeccionOperadora)
    private readonly inyeccionOperadoraRepository: Repository<InyeccionOperadora>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    @InjectRepository(MovimientoCaja)
    private readonly movimientoCajaRepository: Repository<MovimientoCaja>,
    private readonly responsabilidadesService: MatrizControlResponsabilidadesService,
  ) {}

  async obtenerMatriz(dto: FiltroMatrizControlDto): Promise<MatrizControlData> {
    const inicio = new Date(dto.anio, dto.mes - 1, 1, 0, 0, 0, 0);
    const fin = new Date(dto.anio, dto.mes, 0, 23, 59, 59, 999);

    const sesionesQb = this.sesionCajaRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.usuario', 'u')
      .leftJoinAndSelect('u.persona', 'persona')
      .leftJoinAndSelect('s.caja', 'c')
      .where('s.estado = true')
      .andWhere('s.fecha_apertura BETWEEN :inicio AND :fin', { inicio, fin })
      .orderBy('s.fecha_apertura', 'ASC')
      .addOrderBy('s.id', 'ASC');

    if (dto.id_caja) {
      sesionesQb.andWhere('s.id_caja = :idCaja', { idCaja: dto.id_caja });
    }

    const sesiones = await sesionesQb.getMany();
    const columnas = this.construirColumnas(sesiones);
    const n = columnas.length;

    const indicePorSesion = new Map<number, number>();
    columnas.forEach((columna) => {
      if (columna.id_sesion !== null) {
        indicePorSesion.set(columna.id_sesion, columna.indice);
      }
    });

    const emptyValues = (): number[] => Array.from({ length: n }, () => 0);
    const sumValues = (values: number[]): number =>
      round2(values.reduce((sum, value) => sum + Number(value || 0), 0));

    const valoresFila = new Map<string, number[]>();
    const etiquetasFila = new Map<string, string>();
    const ajustesFila = new Map<string, number>();
    const metaFila = new Map<string, Partial<MatrizControlFila>>();
    const comprasLibres = new Map<string, string>();
    const gastosLibres = new Map<string, string>();
    const otrosIngresosLibres = new Map<string, string>();
    const compraLibreKeys: string[] = [];
    const gastoLibreKeys: string[] = [];
    const otroIngresoLibreKeys: string[] = [];

    const registrarRubro = (rubro: RubroControl): void => {
      valoresFila.set(rubro.key, emptyValues());
      etiquetasFila.set(rubro.key, rubro.label);
      ajustesFila.set(rubro.key, 0);
    };

    [...RUBROS_INGRESOS, ...RUBROS_COMPRAS, ...RUBROS_GASTOS, ...RUBROS_PAGO_PASIVOS, ...RUBROS_OTROS_INGRESOS].forEach(
      registrarRubro,
    );
    etiquetasFila.set('gasto.sueldo', `SUELDO ${MESES[dto.mes - 1]}`);

    const agregar = (key: string, indice: number, monto: number): void => {
      const valores = valoresFila.get(key) || emptyValues();
      valores[indice] = round2(Number(valores[indice] || 0) + monto);
      valoresFila.set(key, valores);
    };

    const agregarAjuste = (key: string, monto: number): void => {
      ajustesFila.set(
        key,
        round2(Number(ajustesFila.get(key) || 0) + Number(monto || 0)),
      );
    };

    const advertencias = new Set<string>();
    const advertir = (mensaje: string): void => {
      if (advertencias.size < 12) advertencias.add(mensaje);
    };

    const crearClaveLibre = (prefijo: string, etiqueta: string): string => {
      const base = `${prefijo}.libre.${slug(etiqueta)}`;
      let key = base;
      let intento = 2;
      while (valoresFila.has(key)) {
        key = `${base}_${intento}`;
        intento += 1;
      }
      return key;
    };

    const asignarCompraLibre = (label: string, indice: number, monto: number): void => {
      const etiqueta = label.trim() || 'Otras compras';
      let key = comprasLibres.get(etiqueta);
      if (!key) {
        key = crearClaveLibre('compra', etiqueta);
        comprasLibres.set(etiqueta, key);
        compraLibreKeys.push(key);
        etiquetasFila.set(key, etiqueta);
        valoresFila.set(key, emptyValues());
        ajustesFila.set(key, 0);
      }
      agregar(key, indice, monto);
    };

    const asignarGastoLibre = (label: string, indice: number, monto: number): void => {
      const etiqueta = label.trim() || 'Otros gastos';
      let key = gastosLibres.get(etiqueta);
      if (!key) {
        key = crearClaveLibre('gasto', etiqueta);
        gastosLibres.set(etiqueta, key);
        gastoLibreKeys.push(key);
        etiquetasFila.set(key, etiqueta);
        valoresFila.set(key, emptyValues());
        ajustesFila.set(key, 0);
      }
      agregar(key, indice, monto);
    };

    // Los "otros ingresos" son dinámicos: cada motivo de movimiento de caja que
    // no tenga un rubro fijo genera su propia fila con ese nombre.
    const asignarOtroIngresoLibre = (
      label: string,
      indice: number,
      monto: number,
    ): void => {
      const etiqueta = label.trim() || 'Otros ingresos';
      let key = otrosIngresosLibres.get(etiqueta);
      if (!key) {
        key = crearClaveLibre('otro', etiqueta);
        otrosIngresosLibres.set(etiqueta, key);
        otroIngresoLibreKeys.push(key);
        etiquetasFila.set(key, etiqueta);
        valoresFila.set(key, emptyValues());
        ajustesFila.set(key, 0);
      }
      agregar(key, indice, monto);
    };

    let ventasCreditoTotal = 0;

    if (n > 0) {
      const ids = columnas
        .filter((columna) => columna.id_sesion !== null)
        .map((columna) => columna.id_sesion as number);

      const ventasRaw = await this.ventaRepository
        .createQueryBuilder('v')
        .innerJoin('v.detalles', 'd')
        .innerJoin('d.producto', 'p')
        .innerJoin('p.categoria', 'cat')
        .select('v.id_sesion_caja', 'id_sesion')
        .addSelect('v.metodo_pago', 'metodo_pago')
        .addSelect("COALESCE(cat.nombre, 'Sin categoría')", 'categoria')
        .addSelect("COALESCE(p.nombre, '')", 'producto')
        .addSelect('SUM(d.subtotal)', 'total')
        .where('v.id_sesion_caja IN (:...ids)', { ids })
        .andWhere('v.estado = true')
        .andWhere("v.estado_venta IN ('COMPLETADA', 'EDITADA')")
        .andWhere('v.fecha BETWEEN :inicio AND :fin', { inicio, fin })
        .andWhere('d.estado = true')
        .groupBy('v.id_sesion_caja')
        .addGroupBy('v.metodo_pago')
        .addGroupBy('cat.nombre')
        .addGroupBy('p.nombre')
        .getRawMany<RawVentaRow>();

      for (const row of ventasRaw) {
        const indice = indicePorSesion.get(Number(row.id_sesion));
        if (indice === undefined) continue;

        const total = Number(row.total || 0);
        const metodo = String(row.metodo_pago || '').toUpperCase();

        if (metodo === 'CUENTA_POR_COBRAR') {
          ventasCreditoTotal = round2(ventasCreditoTotal + total);
          continue;
        }

        if (metodo === 'QR') {
          agregar('ingreso.qr', indice, total);
          continue;
        }

        const producto = String(row.producto || '').trim();
        const categoria = String(row.categoria || 'Sin categoría').trim();
        const key = this.mapearIngreso(producto, categoria);

        if (key === null) {
          advertir(
            `Venta sin rubro de ingreso: ${producto || categoria} (${categoria}).`,
          );
          agregar('ingreso.material_escritorio', indice, total);
        } else {
          agregar(key, indice, total);
        }
      }

      const recargasRaw = await this.recargaClienteRepository
        .createQueryBuilder('r')
        .select('r.id_caja_sesion', 'id_sesion')
        .addSelect('r.operadora', 'operadora')
        .addSelect('SUM(r.monto)', 'total')
        .where('r.id_caja_sesion IN (:...ids)', { ids })
        .andWhere('r.estado = true')
        .andWhere('r.fecha_hora BETWEEN :inicio AND :fin', { inicio, fin })
        .groupBy('r.id_caja_sesion')
        .addGroupBy('r.operadora')
        .getRawMany<RawRecargaRow>();

      for (const row of recargasRaw) {
        const indice = indicePorSesion.get(Number(row.id_sesion));
        if (indice === undefined) continue;
        const operadora = String(row.operadora || '').trim();
        const key = this.filaRecarga(operadora);
        if (key === null) {
          advertir(`Recarga sin operadora reconocida: ${operadora}.`);
          agregar('ingreso.recarga_entel', indice, Number(row.total || 0));
        } else {
          agregar(key, indice, Number(row.total || 0));
        }
      }

      const comprasRaw = await this.compraRepository
        .createQueryBuilder('c')
        .innerJoin('c.detalles', 'dc')
        .innerJoin('dc.producto', 'p')
        .innerJoin('p.categoria', 'cat')
        .select('c.id_sesion_caja', 'id_sesion')
        .addSelect("COALESCE(cat.nombre, 'Sin categoría')", 'categoria')
        .addSelect("COALESCE(p.nombre, '')", 'producto')
        .addSelect('SUM(dc.subtotal)', 'total')
        .where('c.id_sesion_caja IN (:...ids)', { ids })
        .andWhere('c.estado = true')
        .andWhere('c.pagado_con_caja = true')
        .andWhere('c.fecha BETWEEN :inicio AND :fin', { inicio, fin })
        .andWhere('dc.estado = true')
        .groupBy('c.id_sesion_caja')
        .addGroupBy('cat.nombre')
        .addGroupBy('p.nombre')
        .getRawMany<RawCompraCategoriaRow>();

      for (const row of comprasRaw) {
        const indice = indicePorSesion.get(Number(row.id_sesion));
        if (indice === undefined) continue;
        const categoria = String(row.categoria || 'Sin categoría').trim();
        const producto = String(row.producto || '').trim();
        const key = this.mapearCompra(producto, categoria);

        if (key === null) {
          asignarCompraLibre(
            this.etiquetaCompra(producto, categoria),
            indice,
            Number(row.total || 0),
          );
        } else {
          agregar(key, indice, Number(row.total || 0));
        }
      }

      const fondeosRaw = await this.inyeccionOperadoraRepository
        .createQueryBuilder('i')
        .select('i.id_caja_origen', 'id_sesion')
        .addSelect('i.operadora_destino', 'operadora')
        .addSelect('SUM(i.monto)', 'total')
        .where('i.id_caja_origen IN (:...ids)', { ids })
        .andWhere('i.estado = true')
        .andWhere('i.fecha_hora BETWEEN :inicio AND :fin', { inicio, fin })
        .groupBy('i.id_caja_origen')
        .addGroupBy('i.operadora_destino')
        .getRawMany<RawFondeoRow>();

      for (const row of fondeosRaw) {
        const indice = indicePorSesion.get(Number(row.id_sesion));
        if (indice === undefined) continue;
        const operadora = String(row.operadora || '').trim();
        const key = this.filaFondeo(operadora);
        if (key === null) {
          advertir(`Fondeo sin operadora reconocida: ${operadora}.`);
          asignarCompraLibre(
            `Fondeo ${operadora || 'sin operadora'}`,
            indice,
            Number(row.total || 0),
          );
        } else {
          agregar(key, indice, Number(row.total || 0));
        }
      }

      const movimientosRaw = await this.movimientoCajaRepository
        .createQueryBuilder('m')
        .select('m.id_sesion_caja', 'id_sesion')
        .addSelect('m.tipo', 'tipo')
        .addSelect(
          "COALESCE(NULLIF(TRIM(m.motivo), ''), 'Sin motivo')",
          'motivo',
        )
        .addSelect('SUM(m.monto)', 'total')
        .where('m.id_sesion_caja IN (:...ids)', { ids })
        .andWhere('m.estado = true')
        .andWhere('m.fecha BETWEEN :inicio AND :fin', { inicio, fin })
        .andWhere("m.motivo NOT LIKE 'Venta de recarga a cliente%'")
        .andWhere("m.motivo NOT LIKE 'Fondeo de saldo a operadora%'")
        .andWhere("m.motivo NOT LIKE 'Compra de mercancía - ID Compra:%'")
        .andWhere("m.motivo NOT LIKE '[Préstamo / Salida de Caja]%'")
        .andWhere("m.motivo NOT LIKE '[Devolución de Préstamo #%'")
        .andWhere("m.motivo NOT LIKE '[Préstamo externo]%'")
        .andWhere("m.motivo NOT LIKE '[Devolución préstamo externo #%'")
        .andWhere("m.motivo NOT LIKE 'Cobro de Cuenta por Cobrar #%'")
        .groupBy('m.id_sesion_caja')
        .addGroupBy('m.tipo')
        .addGroupBy("COALESCE(NULLIF(TRIM(m.motivo), ''), 'Sin motivo')")
        .getRawMany<RawMovimientoRow>();

      for (const row of movimientosRaw) {
        const indice = indicePorSesion.get(Number(row.id_sesion));
        if (indice === undefined) continue;
        const motivo = String(row.motivo || 'Sin motivo').trim();
        const total = Number(row.total || 0);

        if (row.tipo === 'INGRESO') {
          const key = this.filaOtroIngreso(motivo);
          if (key === null) {
            asignarOtroIngresoLibre(motivo, indice, total);
          } else {
            agregar(key, indice, total);
          }
          continue;
        }

        const key = this.filaGastoPorMotivo(motivo);
        if (key === null) {
          asignarGastoLibre(this.etiquetaGasto(motivo), indice, total);
        } else {
          agregar(key, indice, total);
        }
      }
    }

    if (ventasCreditoTotal > 0) {
      advertir(
        `Ventas a crédito incluidas en ACTIVOS sin impacto en caja: Bs ${ventasCreditoTotal.toFixed(2)}.`,
      );
    }

    const responsabilidades = await this.responsabilidadesService.obtener(
      inicio,
      fin,
    );
    responsabilidades.advertencias.forEach(advertir);

    const activoKeys = this.construirActivos(
      responsabilidades.movimientos,
      indicePorSesion,
      emptyValues,
      agregar,
      agregarAjuste,
      etiquetasFila,
      metaFila,
      advertir,
    ).sort((a, b) =>
      String(etiquetasFila.get(a) || a).localeCompare(
        String(etiquetasFila.get(b) || b),
      ),
    );

    const ingresoKeys = RUBROS_INGRESOS.map((r) => r.key);
    const compraKeys = [
      ...RUBROS_COMPRAS.map((r) => r.key),
      ...[...comprasLibres.values()].sort((a, b) =>
        String(etiquetasFila.get(a) || a).localeCompare(
          String(etiquetasFila.get(b) || b),
        ),
      ),
    ];
    const gastoKeys = [
      ...RUBROS_GASTOS.map((r) => r.key),
      ...[...gastosLibres.values()].sort((a, b) =>
        String(etiquetasFila.get(a) || a).localeCompare(
          String(etiquetasFila.get(b) || b),
        ),
      ),
    ];
    const pasivoKeys = RUBROS_PAGO_PASIVOS.map((r) => r.key);
    const otroKeys = [
      ...RUBROS_OTROS_INGRESOS.map((r) => r.key),
      ...[...otrosIngresosLibres.values()].sort((a, b) =>
        String(etiquetasFila.get(a) || a).localeCompare(
          String(etiquetasFila.get(b) || b),
        ),
      ),
    ];

    const sumarKeys = (keys: string[]): number[] => {
      const resultado = emptyValues();
      keys.forEach((key) => {
        const valores = valoresFila.get(key) || [];
        valores.forEach((value, index) => {
          resultado[index] = round2(resultado[index] + Number(value || 0));
        });
      });
      return resultado;
    };

    const sumarAjustes = (keys: string[]): number =>
      round2(keys.reduce((sum, key) => sum + Number(ajustesFila.get(key) || 0), 0));

    const totalComprasValores = sumarKeys(compraKeys);
    const totalGastosValores = sumarKeys(gastoKeys);
    const totalPasivosValores = sumarKeys(pasivoKeys);
    const totalOtrosIngresosValores = sumarKeys(otroKeys);
    const totalActivosValores = sumarKeys(activoKeys);
    const totalActivosAjuste = sumarAjustes(activoKeys);

    const cajaValores = emptyValues();
    const totalIngresosValores = emptyValues();
    const saldoValores = emptyValues();
    let saldoAnterior: number | null = null;
    let primeraApertura = 0;
    let ultimoSaldo = 0;

    const totalIngresosOperativosValores = sumarKeys(ingresoKeys);

    columnas.forEach((columna) => {
      if (columna.vacia) {
        columna.caja_inicial = null;
        columna.saldo = null;
        return;
      }

      const apertura = round2(Number(columna.caja_inicial_real || 0));
      const caja = saldoAnterior === null ? apertura : saldoAnterior;
      cajaValores[columna.indice] = round2(caja);
      columna.caja_inicial = round2(caja);

      if (saldoAnterior === null) {
        primeraApertura = apertura;
      }

      const ingresosOperativos = Number(
        totalIngresosOperativosValores[columna.indice] || 0,
      );
      totalIngresosValores[columna.indice] = round2(caja + ingresosOperativos);

      const saldo = round2(
        Number(totalIngresosValores[columna.indice] || 0) -
          Number(totalComprasValores[columna.indice] || 0) -
          Number(totalGastosValores[columna.indice] || 0) -
          Number(totalActivosValores[columna.indice] || 0) -
          Number(totalPasivosValores[columna.indice] || 0) +
          Number(totalOtrosIngresosValores[columna.indice] || 0),
      );

      saldoValores[columna.indice] = saldo;
      columna.saldo = saldo;
      saldoAnterior = saldo;
      ultimoSaldo = saldo;
    });

    const crearFila = (
      key: string,
      label: string,
      tipo: MatrizControlFilaTipo,
      conTotal: boolean,
      valores: number[],
      ajuste: number,
      meta?: Partial<MatrizControlFila>,
    ): MatrizControlFila => ({
      key,
      label,
      valores,
      ajuste: round2(Number(ajuste || 0)),
      total: conTotal
        ? round2(sumValues(valores) + Number(ajuste || 0))
        : null,
      tipo,
      ...meta,
    });

    const crearSeccion = (
      key: MatrizControlSeccionKey,
      label: string,
      totalLabel: string,
      keys: string[],
      conTotalDetalle: boolean,
      conservarFilasVacias = false,
    ): MatrizControlSeccion => {
      const filas = keys
        .map((rubroKey) =>
          crearFila(
            rubroKey,
            etiquetasFila.get(rubroKey) || rubroKey,
            'dato',
            conTotalDetalle,
            valoresFila.get(rubroKey) || emptyValues(),
            ajustesFila.get(rubroKey) || 0,
            metaFila.get(rubroKey),
          ),
        )
        .filter(
          (fila) =>
            conservarFilasVacias ||
            fila.valores.some((value) => round2(Number(value || 0)) !== 0) ||
            round2(fila.ajuste) !== 0,
        );

      const totalValores = sumarKeys(keys);
      const totalAjuste = sumarAjustes(keys);
      const total = crearFila(
        `${key}.total`,
        totalLabel,
        'total',
        true,
        totalValores,
        totalAjuste,
      );

      return { key, label, filas, total };
    };

    const secciones: MatrizControlSeccion[] = [
      crearSeccion(
        'ingresos',
        'INGRESOS',
        'TOTAL INGRESOS',
        ingresoKeys,
        true,
        true,
      ),
      crearSeccion(
        'compras',
        'COMPRAS',
        'COMPRAS',
        compraKeys,
        false,
        true,
      ),
      crearSeccion(
        'gastos',
        'GASTOS',
        'GASTOS',
        gastoKeys,
        false,
        true,
      ),
      crearSeccion(
        'pago_pasivos',
        'PAGO DE PASIVOS',
        'PAGO DE PASIVOS',
        pasivoKeys,
        true,
        true,
      ),
      crearSeccion(
        'otros_ingresos',
        'OTROS INGRESOS',
        'OTROS INGRESOS',
        otroKeys,
        true,
      ),
      crearSeccion(
        'activos',
        'ACTIVOS',
        'ACTIVOS',
        activoKeys,
        true,
        true,
      ),
    ];

    let deudasAgentes: MatrizControlSeccion | null = null;
    if (responsabilidades.deudasAgentes.length > 0) {
      const filas = responsabilidades.deudasAgentes.map((deuda) =>
        crearFila(
          deuda.key,
          deuda.label,
          'dato',
          true,
          emptyValues(),
          0,
          { detalle: deuda.detalle, fuente: 'operador_deuda' },
        ),
      );
      // Las deudas de agentes no tienen columna diaria; su saldo va en TOTAL.
      filas.forEach((fila, index) => {
        fila.total = round2(Number(responsabilidades.deudasAgentes[index].total));
      });
      const totalDeudas = round2(
        responsabilidades.deudasAgentes.reduce(
          (sum, deuda) => sum + Number(deuda.total || 0),
          0,
        ),
      );
      const total = crearFila(
        'deudas_agentes.total',
        'DEUDAS CON AGENTES',
        'total',
        true,
        emptyValues(),
        0,
      );
      total.total = totalDeudas;
      deudasAgentes = {
        key: 'deudas_agentes',
        label: 'DEUDAS CON AGENTES',
        filas,
        total,
      };
    }

    const filaCaja = crearFila(
      `fila_${FILA_CAJA}`,
      'Caja /Flujo',
      'caja',
      false,
      cajaValores,
      0,
    );

    const filaSaldo = crearFila(
      'saldo',
      'SALDO',
      'saldo',
      false,
      saldoValores,
      0,
    );

    const comprasNoCajaRaw = await this.compraRepository
      .createQueryBuilder('c')
      .select('COUNT(c.id)', 'cantidad')
      .addSelect('COALESCE(SUM(c.total), 0)', 'total')
      .where('c.estado = true')
      .andWhere('c.pagado_con_caja = false')
      .andWhere('c.fecha BETWEEN :inicio AND :fin', { inicio, fin })
      .getRawOne<RawComprasNoCajaRow>();

    const comprasNoCajaCantidad = Number(comprasNoCajaRaw?.cantidad || 0);
    const comprasNoCajaTotal = round2(
      Number(comprasNoCajaRaw?.total || 0),
    );

    if (comprasNoCajaCantidad > 0) {
      advertir(
        `Compras no pagadas con caja fuera del control: ${comprasNoCajaCantidad} compra(s), Bs ${comprasNoCajaTotal.toFixed(2)}.`,
      );
    }

    const totalCompras = sumValues(totalComprasValores);
    const totalGastos = sumValues(totalGastosValores);
    const totalPasivos = sumValues(totalPasivosValores);
    const totalOtrosIngresos = sumValues(totalOtrosIngresosValores);
    const totalActivosEfectivo = sumValues(totalActivosValores);
    const totalActivos = round2(totalActivosEfectivo + totalActivosAjuste);
    const totalAjustesNoCaja = round2(
      Array.from(ajustesFila.values()).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ),
    );
    const totalDeudasAgentes = round2(
      deudasAgentes?.total.total || 0,
    );

    if (deudasAgentes) {
      advertir(
        'Las deudas con agentes se muestran como saldo pendiente informativo y no afectan el saldo de caja.',
      );
    }

    return {
      filtros: { id_caja: dto.id_caja ?? null },
      periodo: {
        mes: dto.mes,
        anio: dto.anio,
        etiqueta: `${MESES[dto.mes - 1]} ${dto.anio}`,
        titulo: `${MESES[dto.mes - 1]}  ${dto.anio}`,
        inicio: toDateOnly(inicio),
        fin: toDateOnly(fin),
      },
      columnas,
      caja: filaCaja,
      secciones,
      deudas_agentes: deudasAgentes,
      saldo: filaSaldo,
      resumen: {
        caja_inicial: primeraApertura,
        total_ingresos: sumValues(totalIngresosOperativosValores),
        total_ingresos_control: sumValues(totalIngresosValores),
        total_compras: totalCompras,
        total_gastos: totalGastos,
        total_pago_pasivos: totalPasivos,
        total_otros_ingresos: totalOtrosIngresos,
        total_activos: totalActivos,
        total_activos_efectivo: totalActivosEfectivo,
        total_ajustes_no_caja: totalAjustesNoCaja,
        total_deudas_agentes: totalDeudasAgentes,
        total_egresos: round2(
          totalCompras +
            totalGastos +
            totalPasivos +
            totalActivosEfectivo,
        ),
        saldo_final: ultimoSaldo,
        saldos_por_columna: columnas.map((columna) => columna.saldo),
        incluye_sesiones_abiertas: columnas.some(
          (columna) => columna.estado === 'ABIERTA',
        ),
      },
      advertencias: Array.from(advertencias),
    };
  }

  private construirActivos(
    movimientos: ResponsabilidadMovimiento[],
    indicePorSesion: Map<number, number>,
    emptyValues: () => number[],
    agregar: (key: string, indice: number, monto: number) => void,
    agregarAjuste: (key: string, monto: number) => void,
    etiquetasFila: Map<string, string>,
    metaFila: Map<string, Partial<MatrizControlFila>>,
    advertir: (mensaje: string) => void,
  ): string[] {
    const keys = new Set<string>();
    for (const movimiento of movimientos) {
      keys.add(movimiento.grupo);
      if (!etiquetasFila.has(movimiento.grupo)) {
        etiquetasFila.set(movimiento.grupo, movimiento.label);
      }
      if (!metaFila.has(movimiento.grupo)) {
        metaFila.set(movimiento.grupo, {
          detalle: movimiento.detalle,
          fuente: movimiento.fuente,
          fecha: movimiento.fecha.toISOString(),
        });
      }

      const monto = round2(Number(movimiento.monto) * movimiento.signo);
      if (movimiento.impacto === 'caja') {
        if (
          movimiento.id_sesion !== null &&
          indicePorSesion.has(movimiento.id_sesion)
        ) {
          agregar(
            movimiento.grupo,
            indicePorSesion.get(movimiento.id_sesion) as number,
            monto,
          );
        } else {
          agregarAjuste(movimiento.grupo, monto);
          if (movimiento.id_sesion !== null) {
            advertir(
              `${movimiento.label}: movimiento de caja fuera de las columnas del período; se envió a AJUSTES.`,
            );
          }
        }
      } else {
        agregarAjuste(movimiento.grupo, monto);
      }
    }

    // Asegura que cada grupo tenga un arreglo de valores del tamaño de las columnas.
    keys.forEach((key) => {
      if (!etiquetasFila.has(key)) etiquetasFila.set(key, key);
      if (!metaFila.has(key)) metaFila.set(key, {});
    });

    return Array.from(keys);
  }

  private construirColumnas(sesiones: SesionCaja[]): MatrizControlColumna[] {
    const sesionesPorDia = new Map<string, SesionCaja[]>();

    sesiones.forEach((sesion) => {
      const fecha = toDateOnly(sesion.fecha_apertura);
      const lista = sesionesPorDia.get(fecha) || [];
      lista.push(sesion);
      sesionesPorDia.set(fecha, lista);
    });

    const columnas: MatrizControlColumna[] = [];

    Array.from(sesionesPorDia.entries())
      .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
      .forEach(([fecha, sesionesDia]) => {
        const ordenadas = [...sesionesDia].sort(
          (a, b) =>
            a.fecha_apertura.getTime() - b.fecha_apertura.getTime() ||
            a.id - b.id,
        );
        const dia = ordenadas[0].fecha_apertura.getDate();
        // Una columna por cada sesión real del día (sin rellenar turnos vacíos).
        const cantidadSlots = ordenadas.length;

        for (let slot = 0; slot < cantidadSlots; slot++) {
          const sesion = ordenadas[slot];
          const indice = columnas.length;

          if (!sesion) {
            columnas.push({
              indice,
              id_sesion: null,
              fecha,
              dia,
              slot: slot + 1,
              etiqueta_operador: `OPERADOR ${slot + 1}`,
              hora_apertura: null,
              hora_cierre: null,
              operador_id: null,
              operador: null,
              caja_id: null,
              caja: null,
              estado: null,
              caja_inicial: null,
              caja_inicial_real: null,
              saldo: null,
              vacia: true,
            });
            continue;
          }

          const apertura = round2(
            Number(
              sesion.monto_inicial_declarado ??
                sesion.monto_inicial ??
                0,
            ),
          );

          columnas.push({
            indice,
            id_sesion: sesion.id,
            fecha,
            dia,
            slot: slot + 1,
            etiqueta_operador: `OPERADOR ${slot + 1}`,
            hora_apertura: toTime(sesion.fecha_apertura),
            hora_cierre: toTime(sesion.fecha_cierre),
            operador_id: sesion.id_usuario,
            operador:
              sesion.usuario?.name || `Operador #${sesion.id_usuario}`,
            caja_id: sesion.id_caja,
            caja: sesion.caja?.nombre || `Caja #${sesion.id_caja}`,
            estado: sesion.estado_sesion,
            caja_inicial: null,
            caja_inicial_real: apertura,
            saldo: null,
            vacia: false,
          });
        }
      });

    return columnas;
  }

  private mapearIngreso(producto: string, categoria: string): string | null {
    const p = normalize(producto);
    const c = normalize(categoria);

    if (p.includes('memoria') || p.includes('microsd')) return 'ingreso.memorias';
    if (p.includes('audifono')) return 'ingreso.audifonos';
    if (p.includes('usb')) return 'ingreso.usb';
    if (p.includes('carga') && p.includes('celular')) return 'ingreso.carga_celulares';
    if (p.includes('cargador') || p.includes('cable')) return 'ingreso.cargadores';
    if (p.includes('fotocopia')) return 'ingreso.fotocopias';
    if (p.includes('anillado') || p.includes('anillo')) return 'ingreso.anillados';
    if (p.includes('impresion')) return 'ingreso.impresiones';
    if (p.includes('recuperacion')) return 'ingreso.recuperacion_linea';
    if (p.includes('plataforma')) return 'ingreso.plataformas';
    if (c.includes('chip')) return 'ingreso.chips';
    if (c.includes('tarjeta')) return 'ingreso.tarjetas';
    if (c.includes('tecnologia')) return 'ingreso.cargadores';
    if (
      c.includes('escritorio') ||
      c.includes('cuaderno') ||
      c.includes('papeleria') ||
      c.includes('mochila') ||
      c.includes('estuche')
    ) {
      return 'ingreso.material_escritorio';
    }

    return null;
  }

  private filaRecarga(operadora: string): string | null {
    const o = normalize(operadora);
    if (o.includes('entel')) return 'ingreso.recarga_entel';
    if (o.includes('viva')) return 'ingreso.recarga_viva';
    if (o.includes('tigo')) return 'ingreso.recarga_tigo';
    return null;
  }

  private filaFondeo(operadora: string): string | null {
    const o = normalize(operadora);
    if (o.includes('tigo')) return 'compra.recarga_tigo';
    if (o.includes('viva')) return 'compra.recarga_viva';
    if (o.includes('entel')) return 'compra.recarga_entel';
    return null;
  }

  private mapearCompra(producto: string, categoria: string): string | null {
    const p = normalize(producto);
    const c = normalize(categoria);

    if (p.includes('chip')) return 'compra.chips';
    if (p.includes('tapa')) return 'compra.tapas_anillados';
    if (
      (p.includes('toner') || p.includes('tonner')) &&
      p.includes('fotocopiadora')
    ) {
      return 'compra.toner_fotocopiadora';
    }
    if (p.includes('tinta')) return 'compra.tinta_impresora';
    if ((p.includes('toner') || p.includes('tonner')) && p.includes('bcp')) {
      return 'compra.toner_bcp';
    }
    if (p.includes('hoja') || p.includes('bon')) return 'compra.hojas_fotocopias';
    if (p.includes('audifono') || p.includes('cargador')) {
      return 'compra.audifonos_cargadores';
    }
    if (p.includes('tarjeta') && p.includes('viva')) return 'compra.tarjetas_viva';
    if (p.includes('tarjeta') && p.includes('entel')) return 'compra.tarjetas_entel';
    if (p.includes('tarjeta') && p.includes('tigo')) return 'compra.tarjetas_tigo';

    if (
      c.includes('cuaderno') ||
      c.includes('papeleria') ||
      c.includes('escritorio') ||
      c.includes('libreria') ||
      p.includes('cuaderno') ||
      p.includes('block') ||
      p.includes('boligrafo') ||
      p.includes('engrapadora') ||
      p.includes('resaltador')
    ) {
      return 'compra.libreria';
    }

    return null;
  }

  private etiquetaCompra(producto: string, categoria: string): string {
    const p = normalize(producto);
    if (p.includes('memoria') || p.includes('microsd')) return 'Memorias';

    const cat = categoria.trim();
    if (cat && normalize(cat) !== 'sin categoria') return cat;
    return producto.trim() || 'Otras compras';
  }

  private filaGastoPorMotivo(motivo: string): string | null {
    const m = normalize(motivo);

    if (m.includes('factura')) return 'gasto.facturas';
    if (m.includes('contable')) return 'gasto.servicios_contables';
    if (m.includes('pasaje') && m.includes('bcp')) return 'gasto.pasajes_bcp';
    if (m.includes('pasaje')) return 'gasto.pasajes';
    if (m.includes('interes') && m.includes('bcp') && m.includes('2')) {
      return 'gasto.interes_bcp_2';
    }
    if (m.includes('interes') && m.includes('bcp')) return 'gasto.interes_bcp_1';
    if (m.includes('recarga') && m.includes('celular')) {
      return 'gasto.recarga_celulares';
    }
    if (m.includes('carga') && m.includes('celular')) {
      return 'gasto.carga_celulares';
    }
    if (m.includes('mantenimiento') && m.includes('fotocopiadora')) {
      return 'gasto.mantenimiento_fotocopiadora';
    }
    if (m.includes('billete') && m.includes('serie')) {
      return 'gasto.billete_doble_serie';
    }
    if (m.includes('material') && m.includes('escritorio')) {
      return 'gasto.material_escritorio';
    }
    if (m.includes('deposito') && m.includes('juan carlos')) {
      return 'gasto.deposito_juan_carlos';
    }
    if (m.includes('internet')) return 'gasto.internet';
    if (m.includes('refrigerio')) return 'gasto.refrigerio';
    if (m.includes('mantenimiento') && m.includes('local')) {
      return 'gasto.mantenimiento_local';
    }
    if (m.includes('lavado') && m.includes('acera')) return 'gasto.lavado_acera';
    if (m.includes('falla') && m.includes('chip')) {
      return 'gasto.falla_chips_entel';
    }
    if (m.includes('alquiler')) return 'gasto.alquiler';
    if (m.includes('luz')) return 'gasto.servicio_luz';
    if (m.includes('agua')) return 'gasto.agua';
    if (m.includes('navidad')) return 'gasto.navidena';
    if (m.includes('impuesto')) return 'gasto.impuestos';
    if (m.includes('retiro') && m.includes('sobrante')) {
      return 'gasto.retiro_sobrante';
    }
    if (m.includes('sueldo')) return 'gasto.sueldo';

    return null;
  }

  private etiquetaGasto(motivo: string): string {
    const m = normalize(motivo);

    if (m.startsWith('[prestamo / salida de caja]')) {
      return 'Préstamo / Salida de Caja';
    }
    if (m.startsWith('[devolucion de prestamo')) {
      return 'Devolución de Préstamo';
    }
    if (m.startsWith('cobro de cuenta por cobrar')) {
      return 'Cobro de Cuenta por Cobrar';
    }

    return motivo;
  }

  private filaOtroIngreso(motivo: string): string | null {
    const m = normalize(motivo);
    if (m.includes('sobrante')) return 'otro.sobrantes';
    if (m.includes('verificacion') && m.includes('billete')) {
      return 'otro.verificacion_billetes';
    }
    if (m.includes('comision') && m.includes('bcp')) return 'otro.comision_bcp';
    if (m.includes('tigo') && m.includes('money')) {
      return 'otro.comision_tigo_money';
    }
    if (m.includes('interes') && m.includes('bcp')) return 'otro.intereses_bcp';
    if (m.includes('comision') && m.includes('viva')) {
      return 'otro.comision_chips_viva';
    }
    if (m.includes('comision') && m.includes('tigo')) {
      return 'otro.comision_chip_tigo';
    }
    if (m.includes('material') && m.includes('escritorio')) {
      return 'otro.material_escritorio';
    }
    return null;
  }
}
